/**
 * Order definitions: statuses, allowed status transitions, pricing rules,
 * request schemas and response DTOs.
 */
const { centsToAmount } = require('./money');

const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

const ORDER_STATUSES = Object.values(ORDER_STATUS);

/**
 * Which status an order may move to from its current status.
 * Delivered and cancelled orders are final.
 */
const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
});

/** Shipping is free above this subtotal, otherwise a flat rate applies. */
const SHIPPING_RULES = Object.freeze({
  freeShippingThresholdCents: 10000,
  flatRateCents: 795,
});

const MAX_QUANTITY_PER_ITEM = 20;

const orderItemSchema = {
  productId: { type: 'integer', required: true, min: 1 },
  quantity: { type: 'integer', required: true, min: 1, max: MAX_QUANTITY_PER_ITEM },
};

const createOrderSchema = {
  customerName: { type: 'string', required: true, minLength: 2, maxLength: 120, label: 'Full name' },
  customerEmail: { type: 'string', required: true, format: 'email', maxLength: 255, lowercase: true, label: 'Email' },
  shippingAddress: {
    type: 'object',
    required: true,
    schema: {
      line1: { type: 'string', required: true, minLength: 3, maxLength: 255, label: 'Street address' },
      city: { type: 'string', required: true, maxLength: 120, label: 'City' },
      postalCode: { type: 'string', required: true, maxLength: 20, label: 'Postal code' },
      country: { type: 'string', required: true, maxLength: 80, label: 'Country' },
    },
  },
  items: {
    type: 'array',
    required: true,
    minItems: 1,
    maxItems: 50,
    items: { type: 'object', required: true, schema: orderItemSchema },
  },
};

const updateOrderStatusSchema = {
  status: { type: 'string', required: true, enum: ORDER_STATUSES },
};

/** Query parameters accepted by GET /api/orders */
const orderQuerySchema = {
  status: { type: 'string', enum: ORDER_STATUSES },
  search: { type: 'string', maxLength: 100 },
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 100, default: 20 },
};

function calculateShippingCents(subtotalCents) {
  if (subtotalCents === 0) return 0;
  return subtotalCents >= SHIPPING_RULES.freeShippingThresholdCents ? 0 : SHIPPING_RULES.flatRateCents;
}

function canTransition(fromStatus, toStatus) {
  return (ALLOWED_STATUS_TRANSITIONS[fromStatus] || []).includes(toStatus);
}

function toOrderItemDTO(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productImageUrl: row.product_image_url,
    unitPrice: centsToAmount(row.unit_price_cents),
    quantity: row.quantity,
    lineTotal: centsToAmount(row.line_total_cents),
  };
}

/** Summary used in order lists (no line items). */
function toOrderSummaryDTO(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    status: row.status,
    itemCount: row.item_count !== undefined ? Number(row.item_count) : undefined,
    total: centsToAmount(row.total_cents),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Full order including the shipping address and line items. */
function toOrderDTO(row, itemRows = []) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    shippingAddress: {
      line1: row.shipping_address,
      city: row.shipping_city,
      postalCode: row.shipping_postal_code,
      country: row.shipping_country,
    },
    status: row.status,
    allowedNextStatuses: ALLOWED_STATUS_TRANSITIONS[row.status] || [],
    items: itemRows.map(toOrderItemDTO),
    subtotal: centsToAmount(row.subtotal_cents),
    shipping: centsToAmount(row.shipping_cents),
    total: centsToAmount(row.total_cents),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  ORDER_STATUS,
  ORDER_STATUSES,
  ALLOWED_STATUS_TRANSITIONS,
  SHIPPING_RULES,
  MAX_QUANTITY_PER_ITEM,
  createOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
  calculateShippingCents,
  canTransition,
  toOrderDTO,
  toOrderSummaryDTO,
  toOrderItemDTO,
};
