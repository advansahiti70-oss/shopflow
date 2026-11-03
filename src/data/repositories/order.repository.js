/**
 * Order and order item queries.
 */
const { query } = require('../db');

async function insertOrder(order, executor) {
  const { rows } = await query(
    `INSERT INTO orders
       (order_number, user_id, customer_name, customer_email,
        shipping_address, shipping_city, shipping_postal_code, shipping_country,
        status, subtotal_cents, shipping_cents, total_cents)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      order.orderNumber,
      order.userId,
      order.customerName,
      order.customerEmail,
      order.shippingAddress.line1,
      order.shippingAddress.city,
      order.shippingAddress.postalCode,
      order.shippingAddress.country,
      order.status,
      order.subtotalCents,
      order.shippingCents,
      order.totalCents,
    ],
    executor,
  );
  return rows[0];
}

/** Inserts all line items of an order with a single multi-row INSERT. */
async function insertOrderItems(orderId, items, executor) {
  const params = [];
  const valueGroups = items.map((item) => {
    params.push(
      orderId,
      item.productId,
      item.productName,
      item.productImageUrl,
      item.unitPriceCents,
      item.quantity,
      item.lineTotalCents,
    );
    const base = params.length - 7;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
  });

  const { rows } = await query(
    `INSERT INTO order_items
       (order_id, product_id, product_name, product_image_url, unit_price_cents, quantity, line_total_cents)
     VALUES ${valueGroups.join(', ')}
     RETURNING *`,
    params,
    executor,
  );
  return rows;
}

async function findById(id, executor) {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1', [id], executor);
  return rows[0] || null;
}

/** Same as findById but locks the row until the transaction ends. */
async function lockById(id, executor) {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id], executor);
  return rows[0] || null;
}

async function findItemsByOrderId(orderId, executor) {
  const { rows } = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [orderId], executor);
  return rows;
}

/**
 * Lists orders, newest first. `userId` restricts the list to one customer;
 * `search` matches the order number, customer name or email.
 * Returns { rows, total }.
 */
async function findMany({ userId, status, search, limit, offset }) {
  const conditions = [];
  const params = [];

  if (userId !== undefined) {
    params.push(userId);
    conditions.push(`o.user_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(`(o.order_number ILIKE ${p} OR o.customer_name ILIKE ${p} OR o.customer_email ILIKE ${p})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*)::int AS total FROM orders o ${where}`, params);
  const listResult = await query(
    `SELECT o.*,
            (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       ${where}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  return { rows: listResult.rows, total: countResult.rows[0].total };
}

async function updateStatus(id, status, executor) {
  const { rows } = await query('UPDATE orders SET status = $2 WHERE id = $1 RETURNING *', [id, status], executor);
  return rows[0] || null;
}

/** Number of orders per status — used for the admin dashboard summary. */
async function countByStatus() {
  const { rows } = await query('SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status');
  return rows;
}

/** Moves an order's timestamps into the past (used by the seed script). */
async function backdate(id, days, executor) {
  await query(
    `UPDATE orders
        SET created_at = NOW() - ($2::int * INTERVAL '1 day'),
            updated_at = NOW() - ($2::int * INTERVAL '1 day')
      WHERE id = $1`,
    [id, days],
    executor,
  );
}

module.exports = {
  backdate,
  insertOrder,
  insertOrderItems,
  findById,
  lockById,
  findItemsByOrderId,
  findMany,
  updateStatus,
  countByStatus,
};
