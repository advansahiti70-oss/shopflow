/**
 * Cart page: edit quantities, see totals, check out and show the confirmation.
 */
import { initLayout } from '../layout.js';
import { api } from '../api.js';
import { icons } from '../icons.js';
import * as cart from '../cart.js';
import { getCurrentUser } from '../session.js';
import {
  escapeHtml, formatPrice, productImage, errorAlert, emptyState, setFieldError, EMAIL_PATTERN, statusBadge,
} from '../ui.js';

initLayout({ activePage: 'cart' });

const root = document.getElementById('cart-root');
const title = document.getElementById('cart-title');

// Must match SHIPPING_RULES in src/models/order.model.js (the server is the source of truth).
const FREE_SHIPPING_THRESHOLD = 100;
const FLAT_SHIPPING = 7.95;

let unavailable = new Map(); // productId -> message from the last failed checkout
let submitting = false;

function shippingFor(subtotal) {
  if (subtotal === 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
}

function cartItemHtml(item) {
  const maxQuantity = Math.min(cart.MAX_QUANTITY, item.stock ?? cart.MAX_QUANTITY);
  const warning = unavailable.get(item.productId);
  return `
    <div class="cart-item" data-product-id="${item.productId}">
      <a class="cart-item__media" href="/product.html?id=${item.productId}">${productImage(item.imageUrl, item.name)}</a>
      <div class="cart-item__info">
        <h3><a href="/product.html?id=${item.productId}">${escapeHtml(item.name)}</a></h3>
        <span class="cart-item__meta">${formatPrice(item.price)} each</span>
        ${warning ? `<span class="cart-item__warning">${escapeHtml(warning)}</span>` : ''}
        <div class="cart-item__controls">
          <div class="qty-stepper qty-stepper--sm" role="group" aria-label="Quantity for ${escapeHtml(item.name)}">
            <button type="button" data-action="decrease" aria-label="Decrease quantity" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
            <input type="number" value="${item.quantity}" min="1" max="${maxQuantity}" data-action="set" aria-label="Quantity">
            <button type="button" data-action="increase" aria-label="Increase quantity" ${item.quantity >= maxQuantity ? 'disabled' : ''}>+</button>
          </div>
          <button type="button" class="link-button" data-action="remove">Remove</button>
        </div>
      </div>
      <div class="cart-item__total">${formatPrice(item.price * item.quantity)}</div>
    </div>`;
}

function summaryHtml(items) {
  const subtotal = cart.getSubtotal(items);
  const shipping = shippingFor(subtotal);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  return `
    <div class="summary-row"><span>Subtotal (${cart.getCount()} items)</span><span>${formatPrice(subtotal)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatPrice(subtotal + shipping)}</span></div>
    ${remaining > 0 ? `<p class="free-shipping-note">Add ${formatPrice(remaining)} more for free shipping.</p>` : ''}`;
}

function checkoutFormHtml() {
  const user = getCurrentUser();
  return `
    <form class="panel" id="checkout-form" novalidate>
      <h2>Shipping details</h2>
      <div id="checkout-error"></div>
      <div class="form-grid">
        <div class="field span-2">
          <label for="customerName">Full name</label>
          <input class="input" id="customerName" name="customerName" autocomplete="name" value="${escapeHtml(user ? user.name : '')}" required>
        </div>
        <div class="field span-2">
          <label for="customerEmail">Email</label>
          <input class="input" id="customerEmail" name="customerEmail" type="email" autocomplete="email" value="${escapeHtml(user ? user.email : '')}" required>
          <span class="field-hint">We'll send your order confirmation here.</span>
        </div>
        <div class="field span-2">
          <label for="line1">Street address</label>
          <input class="input" id="line1" name="line1" autocomplete="street-address" required>
        </div>
        <div class="field">
          <label for="city">City</label>
          <input class="input" id="city" name="city" autocomplete="address-level2" required>
        </div>
        <div class="field">
          <label for="postalCode">Postal code</label>
          <input class="input" id="postalCode" name="postalCode" autocomplete="postal-code" required>
        </div>
        <div class="field span-2">
          <label for="country">Country</label>
          <input class="input" id="country" name="country" autocomplete="country-name" value="United States" required>
        </div>
      </div>
      <button class="btn btn-primary btn-block mt-3" type="submit" id="place-order">Place order</button>
      ${user ? '' : '<p class="field-hint mt-1">Checking out as a guest. <a href="/login.html?redirect=/cart.html" style="text-decoration:underline">Sign in</a> to save this order to your account.</p>'}
    </form>`;
}

function render() {
  const items = cart.getItems();
  if (items.length === 0) {
    title.hidden = false;
    root.innerHTML = emptyState('Your cart is empty', 'Browse the shop and add something you love.', '<a class="btn btn-primary" href="/products.html">Start shopping</a>');
    return;
  }

  // Only re-render the items and summary when the form already exists,
  // so the customer does not lose what they typed.
  if (!document.getElementById('checkout-form')) {
    root.innerHTML = `
      <div class="cart-layout">
        <section class="cart-items" id="cart-items" aria-label="Items in your cart"></section>
        <aside class="checkout-aside">
          <div class="panel"><h2>Order summary</h2><div id="cart-summary"></div></div>
          ${checkoutFormHtml()}
        </aside>
      </div>`;
    document.getElementById('checkout-form').addEventListener('submit', submitOrder);
  }
  document.getElementById('cart-items').innerHTML = items.map(cartItemHtml).join('');
  document.getElementById('cart-summary').innerHTML = summaryHtml(items);
}

// Quantity buttons, typed quantities and remove links (event delegation).
root.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  const row = event.target.closest('[data-product-id]');
  if (!button || !row) return;
  const productId = Number(row.dataset.productId);
  const item = cart.getItems().find((entry) => entry.productId === productId);
  if (!item) return;

  if (button.dataset.action === 'increase') cart.setQuantity(productId, item.quantity + 1);
  if (button.dataset.action === 'decrease') cart.setQuantity(productId, item.quantity - 1);
  if (button.dataset.action === 'remove') {
    unavailable.delete(productId);
    cart.removeItem(productId);
  }
});

root.addEventListener('change', (event) => {
  if (event.target.dataset.action !== 'set') return;
  const row = event.target.closest('[data-product-id]');
  cart.setQuantity(Number(row.dataset.productId), Number(event.target.value));
});

window.addEventListener('cart:changed', () => {
  if (!submitting) render();
});

/** Client-side validation; the server validates again. */
function validateForm(form) {
  const checks = [
    ['customerName', (v) => v.length >= 2, 'Please enter your full name.'],
    ['customerEmail', (v) => EMAIL_PATTERN.test(v), 'Please enter a valid email address.'],
    ['line1', (v) => v.length >= 3, 'Please enter your street address.'],
    ['city', (v) => v.length > 0, 'Please enter your city.'],
    ['postalCode', (v) => v.length > 0, 'Please enter your postal code.'],
    ['country', (v) => v.length > 0, 'Please enter your country.'],
  ];
  let firstInvalid = null;
  for (const [name, isValid, message] of checks) {
    const input = form.elements[name];
    const ok = isValid(input.value.trim());
    setFieldError(input, ok ? '' : message);
    if (!ok && !firstInvalid) firstInvalid = input;
  }
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

async function submitOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorBox = document.getElementById('checkout-error');
  errorBox.innerHTML = '';
  if (!validateForm(form)) return;

  const value = (name) => form.elements[name].value.trim();
  const order = {
    customerName: value('customerName'),
    customerEmail: value('customerEmail'),
    shippingAddress: { line1: value('line1'), city: value('city'), postalCode: value('postalCode'), country: value('country') },
    items: cart.getItems().map((item) => ({ productId: item.productId, quantity: item.quantity })),
  };

  const button = document.getElementById('place-order');
  button.disabled = true;
  button.textContent = 'Placing order…';

  try {
    const { data } = await api.createOrder(order);
    submitting = true;
    cart.clear();
    showConfirmation(data);
  } catch (error) {
    if (error.status === 409 && error.details.length) {
      // Stock problems: highlight the affected items.
      unavailable = new Map(error.details.map((detail) => [detail.productId, detail.message]));
      render();
    }
    errorBox.innerHTML = errorAlert(error.message, error.status === 409 ? [] : error.details);
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    button.disabled = false;
    button.textContent = 'Place order';
  }
}

function showConfirmation(order) {
  title.hidden = true;
  const lines = order.items
    .map((item) => `<li><span>${item.quantity} × ${escapeHtml(item.productName)}</span><span>${formatPrice(item.lineTotal)}</span></li>`)
    .join('');
  const address = order.shippingAddress;
  root.innerHTML = `
    <section class="confirmation" aria-live="polite">
      <div class="confirmation__icon">${icons.check}</div>
      <h1>Thank you for your order</h1>
      <p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> has been placed.
         A confirmation email is on its way to <strong>${escapeHtml(order.customerEmail)}</strong>.</p>
      <div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h2 style="margin:0">Order summary</h2>${statusBadge(order.status)}
        </div>
        <ul class="order-lines">${lines}</ul>
        <div class="summary-row mt-2"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatPrice(order.total)}</span></div>
        <hr class="divider">
        <p class="text-muted" style="font-size:0.875rem"><strong style="color:var(--color-text)">Shipping to</strong><br>
          ${escapeHtml(order.customerName)}<br>${escapeHtml(address.line1)}<br>${escapeHtml(address.city)} ${escapeHtml(address.postalCode)}<br>${escapeHtml(address.country)}</p>
      </div>
      <div class="hero-actions" style="justify-content:center;margin-top:28px;">
        <a class="btn btn-primary" href="/products.html">Continue shopping</a>
        ${getCurrentUser() ? '<a class="btn btn-secondary" href="/account.html">View my orders</a>' : ''}
      </div>
    </section>`;
  window.scrollTo({ top: 0 });
}

/** Refreshes prices and stock from the API so the cart never shows stale data. */
async function refreshCart() {
  const items = cart.getItems();
  await Promise.all(
    items.map(async (item) => {
      try {
        const { data } = await api.getProduct(item.productId);
        cart.refreshItem(data);
        if (!data.inStock) unavailable.set(item.productId, 'This item is out of stock. Remove it to check out.');
        else if (item.quantity > data.stock) cart.setQuantity(item.productId, data.stock);
      } catch (error) {
        if (error.status === 404) unavailable.set(item.productId, 'This item is no longer available.');
      }
    }),
  );
  render();
}

render();
refreshCart();
