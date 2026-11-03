/**
 * Integration tests for checkout and order management (real PostgreSQL).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { resetAndSeed, orderInput, sql, closePool, PASSWORDS } = require('./helpers');
const { createApp } = require('../src/api/app');
const { orderService } = require('../src/services');

const app = createApp();
let fixtures;

async function tokenFor(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200);
  return res.body.data.token;
}

test.before(async () => {
  fixtures = await resetAndSeed();
});
test.after(closePool);

test('placing an order uses database prices, reduces stock and queues a confirmation email', async () => {
  const { tee, lamp } = fixtures.products;
  const res = await request(app)
    .post('/api/orders')
    // A client-supplied price must be ignored.
    .send(orderInput([{ productId: tee.id, quantity: 2, price: 0.01 }, { productId: lamp.id, quantity: 1 }]));

  assert.equal(res.status, 201);
  const order = res.body.data;
  assert.equal(order.status, 'pending');
  assert.match(order.orderNumber, /^SF-\d{6}-[A-Z0-9]{5}$/);
  assert.equal(order.subtotal, 170); // 2 x 25 + 120
  assert.equal(order.shipping, 0); // over $100
  assert.equal(order.total, 170);
  assert.equal(order.items.length, 2);

  const [teeRow] = await sql('SELECT stock FROM products WHERE id = $1', [tee.id]);
  assert.equal(teeRow.stock, 8);

  const jobs = await sql("SELECT * FROM email_jobs WHERE email_type = 'order_confirmation'");
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].status, 'pending');
  assert.equal(jobs[0].recipient_email, 'casey@test.local');
  assert.equal(jobs[0].payload.orderNumber, order.orderNumber);
});

test('order items keep the price paid even after the product price changes', async () => {
  const { tee } = fixtures.products;
  const order = await orderService.placeOrder(orderInput([{ productId: tee.id, quantity: 1 }]));
  await sql('UPDATE products SET price_cents = 9900 WHERE id = $1', [tee.id]);

  const [item] = await sql('SELECT unit_price_cents, product_name FROM order_items WHERE order_id = $1', [order.id]);
  assert.equal(item.unit_price_cents, 2500);
  assert.equal(item.product_name, 'Cotton Tee');
  await sql('UPDATE products SET price_cents = 2500 WHERE id = $1', [tee.id]);
});

test('an order exceeding stock is rejected and nothing is saved', async () => {
  const { hoodie, tee } = fixtures.products;
  const [{ count: ordersBefore }] = await sql('SELECT COUNT(*)::int AS count FROM orders');
  const [{ count: jobsBefore }] = await sql('SELECT COUNT(*)::int AS count FROM email_jobs');

  const res = await request(app)
    .post('/api/orders')
    .send(orderInput([{ productId: tee.id, quantity: 1 }, { productId: hoodie.id, quantity: 3 }]));

  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'CONFLICT');
  assert.equal(res.body.error.details[0].productId, hoodie.id);

  // The transaction rolled back: no order, no email job, tee stock unchanged.
  const [{ count: ordersAfter }] = await sql('SELECT COUNT(*)::int AS count FROM orders');
  const [{ count: jobsAfter }] = await sql('SELECT COUNT(*)::int AS count FROM email_jobs');
  assert.equal(ordersAfter, ordersBefore);
  assert.equal(jobsAfter, jobsBefore);
});

test('two simultaneous checkouts cannot oversell the last items', async () => {
  const { hoodie } = fixtures.products; // stock = 2
  const results = await Promise.allSettled([
    orderService.placeOrder(orderInput([{ productId: hoodie.id, quantity: 2 }])),
    orderService.placeOrder(orderInput([{ productId: hoodie.id, quantity: 2 }])),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
  const [row] = await sql('SELECT stock FROM products WHERE id = $1', [hoodie.id]);
  assert.equal(row.stock, 0);
});

test('invalid order payloads return 400 with field details', async () => {
  const res = await request(app).post('/api/orders').send({ customerName: 'X', items: [] });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.ok(res.body.error.details.length > 0);
});

test('order routes require authentication', async () => {
  assert.equal((await request(app).get('/api/orders')).status, 401);
  assert.equal((await request(app).get('/api/orders/1')).status, 401);
  assert.equal((await request(app).patch('/api/orders/1/status').send({ status: 'confirmed' })).status, 401);
});

test('customers only see their own orders and cannot change status', async () => {
  const customerToken = await tokenFor('casey@test.local', PASSWORDS.customer);
  const otherToken = await tokenFor('other@test.local', PASSWORDS.customer);

  const created = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send(orderInput([{ productId: fixtures.products.lamp.id, quantity: 1 }]));
  assert.equal(created.status, 201);
  assert.equal(created.body.data.userId, fixtures.users.customer.id);
  const orderId = created.body.data.id;

  const ownList = await request(app).get('/api/orders').set('Authorization', `Bearer ${customerToken}`);
  assert.equal(ownList.status, 200);
  assert.ok(ownList.body.data.every((order) => order.customerEmail === 'casey@test.local'));
  assert.equal(ownList.body.meta.statusCounts, undefined);

  const otherView = await request(app).get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${otherToken}`);
  assert.equal(otherView.status, 404);

  const patch = await request(app)
    .patch(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ status: 'confirmed' });
  assert.equal(patch.status, 403);
});

test('admin can filter orders and move them through the status workflow', async () => {
  const adminToken = await tokenFor('admin@test.local', PASSWORDS.admin);
  const auth = { Authorization: `Bearer ${adminToken}` };
  const order = await orderService.placeOrder(orderInput([{ productId: fixtures.products.lamp.id, quantity: 2 }]));

  const list = await request(app).get('/api/orders?status=pending').set(auth);
  assert.equal(list.status, 200);
  assert.ok(list.body.data.length > 0);
  assert.ok(list.body.data.every((o) => o.status === 'pending'));
  assert.ok(list.body.meta.statusCounts.pending >= 1);

  const search = await request(app).get(`/api/orders?search=${order.orderNumber}`).set(auth);
  assert.equal(search.body.data.length, 1);

  const invalid = await request(app).patch(`/api/orders/${order.id}/status`).set(auth).send({ status: 'shipped' });
  assert.equal(invalid.status, 409);

  const unknown = await request(app).patch(`/api/orders/${order.id}/status`).set(auth).send({ status: 'lost' });
  assert.equal(unknown.status, 400);

  const confirmed = await request(app).patch(`/api/orders/${order.id}/status`).set(auth).send({ status: 'confirmed' });
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.data.status, 'confirmed');
  assert.deepEqual(confirmed.body.data.allowedNextStatuses, ['shipped', 'cancelled']);

  const jobs = await sql(
    "SELECT payload FROM email_jobs WHERE email_type = 'order_status_update' AND payload->>'orderNumber' = $1",
    [order.orderNumber],
  );
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].payload.status, 'confirmed');
  assert.equal(jobs[0].payload.previousStatus, 'pending');
});

test('cancelling an order returns its items to stock', async () => {
  const { lamp } = fixtures.products;
  const [before] = await sql('SELECT stock FROM products WHERE id = $1', [lamp.id]);
  const order = await orderService.placeOrder(orderInput([{ productId: lamp.id, quantity: 1 }]));
  await orderService.updateOrderStatus(order.id, 'cancelled');
  const [after] = await sql('SELECT stock FROM products WHERE id = $1', [lamp.id]);
  assert.equal(after.stock, before.stock);

  await assert.rejects(orderService.updateOrderStatus(order.id, 'confirmed'), { statusCode: 409 });
});
