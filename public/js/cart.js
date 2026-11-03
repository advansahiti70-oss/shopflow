/**
 * Shopping cart stored in localStorage.
 *
 * Only product IDs and quantities matter to the server — prices shown here
 * are for display; the backend always recalculates the real total.
 */
const STORAGE_KEY = 'shopflow.cart';
export const MAX_QUANTITY = 20;

function read() {
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function write(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cart:changed'));
}

function clampQuantity(quantity, stock) {
  const limit = Math.min(MAX_QUANTITY, stock ?? MAX_QUANTITY);
  return Math.max(1, Math.min(limit, Math.floor(quantity) || 1));
}

export function getItems() {
  return read();
}

export function getCount() {
  return read().reduce((sum, item) => sum + item.quantity, 0);
}

export function getSubtotal(items = read()) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/** Adds a product (or increases its quantity). Returns the new quantity. */
export function addItem(product, quantity = 1) {
  const items = read();
  const existing = items.find((item) => item.productId === product.id);
  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + quantity, product.stock);
    existing.stock = product.stock;
  } else {
    items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      stock: product.stock,
      quantity: clampQuantity(quantity, product.stock),
    });
  }
  write(items);
  return (existing || items[items.length - 1]).quantity;
}

export function setQuantity(productId, quantity) {
  const items = read();
  const item = items.find((entry) => entry.productId === productId);
  if (!item) return;
  item.quantity = clampQuantity(quantity, item.stock);
  write(items);
}

export function removeItem(productId) {
  write(read().filter((item) => item.productId !== productId));
}

/** Replaces cached product data (price, stock, name) with fresh data from the API. */
export function refreshItem(product) {
  const items = read();
  const item = items.find((entry) => entry.productId === product.id);
  if (!item) return;
  Object.assign(item, { name: product.name, price: product.price, imageUrl: product.imageUrl, stock: product.stock });
  write(items);
}

export function clear() {
  write([]);
}

// Keep several open tabs in sync.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) window.dispatchEvent(new CustomEvent('cart:changed'));
});
