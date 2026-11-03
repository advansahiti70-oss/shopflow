/**
 * Unit tests for the request validator and order rules (no database needed).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validate, createOrderSchema, productQuerySchema, canTransition, calculateShippingCents,
} = require('../src/models');

test('validator trims strings, lowercases emails and drops unknown fields', () => {
  const { value, errors } = validate(
    { email: { type: 'string', required: true, format: 'email', lowercase: true } },
    { email: '  Jane@Example.COM ', isAdmin: true },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(value, { email: 'jane@example.com' });
});

test('validator converts numeric query strings and applies defaults', () => {
  const { value, errors } = validate(productQuerySchema, { page: '2', minPrice: '10.5', featured: 'true' });
  assert.deepEqual(errors, []);
  assert.equal(value.page, 2);
  assert.equal(value.minPrice, 10.5);
  assert.equal(value.featured, true);
  assert.equal(value.limit, 12);
  assert.equal(value.sort, 'newest');
});

test('validator reports every invalid field of an order', () => {
  const { errors } = validate(createOrderSchema, {
    customerName: 'A',
    customerEmail: 'not-an-email',
    shippingAddress: { line1: '1 Road' },
    items: [{ productId: 'abc', quantity: 0 }],
  });
  const fields = errors.map((error) => error.field).sort();
  assert.deepEqual(fields, [
    'customerEmail', 'customerName', 'items[0].productId', 'items[0].quantity',
    'shippingAddress.city', 'shippingAddress.country', 'shippingAddress.postalCode',
  ]);
});

test('validator rejects an empty item list and unknown sort values', () => {
  assert.ok(validate(createOrderSchema, { items: [] }).errors.some((e) => e.field === 'items'));
  assert.ok(validate(productQuerySchema, { sort: 'DROP TABLE' }).errors.some((e) => e.field === 'sort'));
});

test('order status transitions follow the allowed workflow', () => {
  assert.equal(canTransition('pending', 'confirmed'), true);
  assert.equal(canTransition('confirmed', 'shipped'), true);
  assert.equal(canTransition('shipped', 'delivered'), true);
  assert.equal(canTransition('pending', 'cancelled'), true);
  assert.equal(canTransition('pending', 'shipped'), false);
  assert.equal(canTransition('shipped', 'cancelled'), false);
  assert.equal(canTransition('cancelled', 'pending'), false);
  assert.equal(canTransition('delivered', 'cancelled'), false);
});

test('shipping is free from $100, otherwise a flat rate', () => {
  assert.equal(calculateShippingCents(9999), 795);
  assert.equal(calculateShippingCents(10000), 0);
  assert.equal(calculateShippingCents(0), 0);
});
