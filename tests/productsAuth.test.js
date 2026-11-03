/**
 * API tests for the catalog and authentication endpoints.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { resetAndSeed, closePool, PASSWORDS, config } = require('./helpers');
const { createApp } = require('../src/api/app');

const app = createApp();
let fixtures;

test.before(async () => {
  fixtures = await resetAndSeed();
});
test.after(closePool);

test('GET /api/products paginates and returns metadata', async () => {
  const res = await request(app).get('/api/products?limit=3&page=1&sort=name_asc');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 3);
  assert.deepEqual(res.body.meta, { page: 1, limit: 3, total: 4, totalPages: 2 });
  assert.equal(res.body.data[0].name, 'Cotton Tee');
  assert.equal(res.body.data[0].price, 25);
});

test('GET /api/products filters by search, category and price, and sorts', async () => {
  const search = await request(app).get('/api/products?search=hood');
  assert.deepEqual(search.body.data.map((p) => p.name), ['Fleece Hoodie']);

  const category = await request(app).get('/api/products?category=home&sort=price_desc');
  assert.deepEqual(category.body.data.map((p) => p.name), ['Table Lamp', 'Stoneware Mug']);

  const price = await request(app).get('/api/products?minPrice=20&maxPrice=100&sort=price_asc');
  assert.deepEqual(price.body.data.map((p) => p.price), [25, 80]);

  const rating = await request(app).get('/api/products?sort=rating_desc');
  assert.equal(rating.body.data[0].name, 'Fleece Hoodie');

  const featured = await request(app).get('/api/products?featured=true');
  assert.deepEqual(featured.body.data.map((p) => p.name), ['Cotton Tee']);
});

test('GET /api/products rejects invalid query parameters', async () => {
  assert.equal((await request(app).get('/api/products?sort=evil')).status, 400);
  assert.equal((await request(app).get('/api/products?limit=1000')).status, 400);
  assert.equal((await request(app).get('/api/products?minPrice=50&maxPrice=10')).status, 400);
});

test('GET /api/products/:id returns a product or 404', async () => {
  const ok = await request(app).get(`/api/products/${fixtures.products.mug.id}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.inStock, false);
  assert.equal(ok.body.data.category.slug, 'home');

  assert.equal((await request(app).get('/api/products/99999')).status, 404);
  assert.equal((await request(app).get('/api/products/abc')).status, 400);

  const related = await request(app).get(`/api/products/${fixtures.products.tee.id}/related`);
  assert.deepEqual(related.body.data.map((p) => p.name), ['Fleece Hoodie']);
});

test('GET /api/categories lists categories with product counts', async () => {
  const res = await request(app).get('/api/categories');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.map((c) => [c.slug, c.productCount]), [['apparel', 2], ['home', 2]]);
});

test('register creates a customer and never returns the password hash', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'New Person', email: 'New.Person@Test.local', password: 'longenough1' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.user.email, 'new.person@test.local');
  assert.equal(res.body.data.user.role, 'customer');
  assert.ok(res.body.data.token);
  assert.equal(JSON.stringify(res.body).includes('password'), false);

  const duplicate = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Again', email: 'new.person@test.local', password: 'longenough1' });
  assert.equal(duplicate.status, 409);

  const weak = await request(app).post('/api/auth/register').send({ name: 'Weak', email: 'weak@test.local', password: 'short' });
  assert.equal(weak.status, 400);
});

test('login succeeds with correct credentials and fails with a generic 401 otherwise', async () => {
  const ok = await request(app).post('/api/auth/login').send({ email: 'ADMIN@test.local', password: PASSWORDS.admin });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.user.role, 'admin');

  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ok.body.data.token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.data.email, 'admin@test.local');

  const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'admin@test.local', password: 'nope' });
  const unknownUser = await request(app).post('/api/auth/login').send({ email: 'ghost@test.local', password: 'nope' });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.body.error.message, unknownUser.body.error.message);

  const invalid = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
  assert.equal(invalid.status, 400);
});

test('expired or forged tokens are rejected', async () => {
  const forged = jwt.sign({ sub: String(fixtures.users.admin.id), role: 'admin' }, 'wrong-secret');
  assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`)).status, 401);

  const expired = jwt.sign({ sub: String(fixtures.users.admin.id), role: 'admin' }, config.auth.jwtSecret, { expiresIn: -10 });
  assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`)).status, 401);
});

test('unknown API routes and malformed JSON return JSON errors', async () => {
  const missing = await request(app).get('/api/nothing-here');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, 'NOT_FOUND');

  const badJson = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
  assert.equal(badJson.status, 400);
  assert.equal(badJson.body.error.code, 'INVALID_JSON');
});
