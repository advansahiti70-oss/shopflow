/**
 * Order business logic: checkout, order lookup and status changes.
 */
const crypto = require('node:crypto');
const config = require('../config');
const { withTransaction, orderRepository, productRepository } = require('../data');
const {
  ConflictError,
  NotFoundError,
  ROLES,
  ORDER_STATUS,
  EMAIL_TYPE,
  calculateShippingCents,
  canTransition,
  toOrderDTO,
  toOrderSummaryDTO,
} = require('../models');
const { enqueueEmail } = require('./emailJob.service');
const { buildPaginationMeta } = require('./product.service');

const ORDER_NUMBER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

/** Human-friendly order number, e.g. SF-261103-K7Q2M */
function generateOrderNumber(date = new Date()) {
  const datePart = date.toISOString().slice(2, 10).replace(/-/g, '');
  const bytes = crypto.randomBytes(5);
  const randomPart = Array.from(bytes, (byte) => ORDER_NUMBER_ALPHABET[byte % ORDER_NUMBER_ALPHABET.length]).join('');
  return `SF-${datePart}-${randomPart}`;
}

/** Combines duplicate lines for the same product: [{1,x2},{1,x1}] -> [{1,x3}] */
function mergeItems(items) {
  const quantities = new Map();
  for (const { productId, quantity } of items) {
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }
  return Array.from(quantities, ([productId, quantity]) => ({ productId, quantity }));
}

/**
 * Builds priced order lines from locked product rows.
 * Prices always come from the database, never from the client.
 */
function buildOrderLines(requestedItems, productRows) {
  const productsById = new Map(productRows.map((row) => [row.id, row]));
  const problems = [];

  const lines = requestedItems.map(({ productId, quantity }) => {
    const product = productsById.get(productId);
    if (!product || !product.is_active) {
      problems.push({ productId, message: 'This product is no longer available' });
      return null;
    }
    if (product.stock < quantity) {
      problems.push({
        productId,
        message: product.stock === 0
          ? `${product.name} is out of stock`
          : `Only ${product.stock} of ${product.name} left in stock`,
      });
      return null;
    }
    return {
      productId,
      productName: product.name,
      productImageUrl: product.image_url,
      unitPriceCents: product.price_cents,
      quantity,
      lineTotalCents: product.price_cents * quantity,
    };
  });

  if (problems.length > 0) {
    throw new ConflictError('Some items in your cart are unavailable', problems);
  }
  return lines;
}

/** Data the email templates need, stored in the email job's payload. */
function buildEmailPayload(order, itemRows, extra = {}) {
  const dto = toOrderDTO(order, itemRows);
  return {
    orderId: dto.id,
    orderNumber: dto.orderNumber,
    customerName: dto.customerName,
    status: dto.status,
    items: dto.items.map(({ productName, quantity, unitPrice, lineTotal }) => ({ productName, quantity, unitPrice, lineTotal })),
    subtotal: dto.subtotal,
    shipping: dto.shipping,
    total: dto.total,
    shippingAddress: dto.shippingAddress,
    accountUrl: `${config.appUrl}/account.html`,
    storeUrl: config.appUrl,
    ...extra,
  };
}

/**
 * Places an order. Everything happens in one transaction:
 * lock products -> check stock -> save order + items -> reduce stock -> queue email.
 * If any step fails, nothing is saved and no email is queued.
 */
async function placeOrder(input, currentUser = null) {
  const requestedItems = mergeItems(input.items);

  return withTransaction(async (tx) => {
    const productRows = await productRepository.lockByIds(requestedItems.map((item) => item.productId), tx);
    const lines = buildOrderLines(requestedItems, productRows);

    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const shippingCents = calculateShippingCents(subtotalCents);

    const order = await orderRepository.insertOrder(
      {
        orderNumber: generateOrderNumber(),
        userId: currentUser ? currentUser.id : null,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        shippingAddress: input.shippingAddress,
        status: ORDER_STATUS.PENDING,
        subtotalCents,
        shippingCents,
        totalCents: subtotalCents + shippingCents,
      },
      tx,
    );
    const itemRows = await orderRepository.insertOrderItems(order.id, lines, tx);

    for (const line of lines) {
      await productRepository.decrementStock(line.productId, line.quantity, tx);
    }

    await enqueueEmail(
      {
        emailType: EMAIL_TYPE.ORDER_CONFIRMATION,
        recipientEmail: order.customer_email,
        payload: buildEmailPayload(order, itemRows),
      },
      tx,
    );

    return toOrderDTO(order, itemRows);
  });
}

function isAdmin(user) {
  return Boolean(user && user.role === ROLES.ADMIN);
}

/** Admins see every order; customers only see their own. */
async function listOrders(filters, currentUser) {
  const { page, limit } = filters;
  const { rows, total } = await orderRepository.findMany({
    userId: isAdmin(currentUser) ? undefined : currentUser.id,
    status: filters.status,
    search: filters.search,
    limit,
    offset: (page - 1) * limit,
  });

  const meta = buildPaginationMeta(page, limit, total);
  if (isAdmin(currentUser)) {
    const counts = await orderRepository.countByStatus();
    meta.statusCounts = Object.fromEntries(counts.map((row) => [row.status, row.count]));
  }
  return { data: rows.map(toOrderSummaryDTO), meta };
}

async function getOrderById(id, currentUser) {
  const order = await orderRepository.findById(id);
  // A customer asking for someone else's order gets 404, not 403,
  // so order IDs belonging to other people are not revealed.
  if (!order || (!isAdmin(currentUser) && order.user_id !== currentUser.id)) {
    throw new NotFoundError('Order not found');
  }
  const items = await orderRepository.findItemsByOrderId(id);
  return toOrderDTO(order, items);
}

/**
 * Changes an order's status (admin only — enforced by the API layer).
 * Cancelling returns the items to stock. The customer is notified by email.
 */
async function updateOrderStatus(id, newStatus) {
  return withTransaction(async (tx) => {
    const order = await orderRepository.lockById(id, tx);
    if (!order) throw new NotFoundError('Order not found');

    if (order.status === newStatus) {
      throw new ConflictError(`Order is already ${newStatus}`);
    }
    if (!canTransition(order.status, newStatus)) {
      throw new ConflictError(`Cannot change an order from ${order.status} to ${newStatus}`);
    }

    const updated = await orderRepository.updateStatus(id, newStatus, tx);
    const items = await orderRepository.findItemsByOrderId(id, tx);

    if (newStatus === ORDER_STATUS.CANCELLED) {
      for (const item of items) {
        if (item.product_id) await productRepository.incrementStock(item.product_id, item.quantity, tx);
      }
    }

    await enqueueEmail(
      {
        emailType: EMAIL_TYPE.ORDER_STATUS_UPDATE,
        recipientEmail: updated.customer_email,
        payload: buildEmailPayload(updated, items, { previousStatus: order.status }),
      },
      tx,
    );

    return toOrderDTO(updated, items);
  });
}

module.exports = {
  placeOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
  generateOrderNumber,
  mergeItems,
  buildOrderLines,
};
