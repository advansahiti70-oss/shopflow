/**
 * Shared page chrome: announcement bar, header, footer and global behaviour
 * (cart badge, add-to-cart buttons, image fallbacks). Every page calls
 * initLayout() once.
 */
import { icons } from './icons.js';
import { escapeHtml, showToast } from './ui.js';
import * as cart from './cart.js';
import { getCurrentUser, clearSession } from './session.js';

const NAV_LINKS = [
  { href: '/products.html', label: 'Shop all', page: 'products' },
  { href: '/products.html?category=apparel', label: 'Apparel' },
  { href: '/products.html?category=footwear', label: 'Footwear' },
  { href: '/products.html?category=home', label: 'Home' },
  { href: '/products.html?category=electronics', label: 'Electronics' },
];

function accountLink() {
  const user = getCurrentUser();
  if (!user) {
    return `<a class="header-action" href="/login.html">${icons.user}<span class="label">Sign in</span></a>`;
  }
  const href = user.role === 'admin' ? '/admin.html' : '/account.html';
  const label = user.role === 'admin' ? 'Admin' : 'Account';
  return `
    <a class="header-action" href="${href}" title="${escapeHtml(user.email)}">${icons.user}<span class="label">${label}</span></a>
    <button type="button" class="header-action header-action--button" data-sign-out>Sign out</button>`;
}

function headerHtml(activePage) {
  const search = new URLSearchParams(window.location.search).get('search') || '';
  const nav = NAV_LINKS.map(
    (link) => `<a href="${link.href}" ${link.page === activePage && !window.location.search ? 'aria-current="page"' : ''}>${link.label}</a>`,
  ).join('');

  return `
    <div class="announcement">Free shipping on orders over $100 · 30-day free returns</div>
    <header class="site-header">
      <div class="container header-inner">
        <a class="logo" href="/" aria-label="ShopFlow home">Shop<span>Flow</span></a>
        <nav class="main-nav" aria-label="Main">${nav}</nav>
        <form class="header-search" role="search" action="/products.html">
          <label class="sr-only" for="site-search">Search products</label>
          <input id="site-search" name="search" type="search" placeholder="Search products" value="${escapeHtml(search)}" autocomplete="off">
          <button type="submit" aria-label="Search">${icons.search}</button>
        </form>
        <div class="header-actions">
          <span data-account-slot>${accountLink()}</span>
          <a class="header-action" href="/cart.html" aria-label="Shopping cart">
            ${icons.bag}<span class="label">Cart</span>
            <span class="cart-count" data-cart-count hidden>0</span>
          </a>
        </div>
      </div>
    </header>`;
}

function footerHtml() {
  const year = new Date().getFullYear();
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a class="logo" href="/">Shop<span>Flow</span></a>
            <p>Well-made everyday goods for wardrobe and home, shipped from our Portland studio.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><a href="/products.html">All products</a></li>
              <li><a href="/products.html?category=apparel">Apparel</a></li>
              <li><a href="/products.html?category=accessories">Accessories</a></li>
              <li><a href="/products.html?category=home">Home &amp; Living</a></li>
            </ul>
          </div>
          <div>
            <h4>Customer support</h4>
            <ul>
              <li><a href="/account.html">Order status</a></li>
              <li><a href="/products.html">Shipping &amp; delivery</a></li>
              <li><a href="/products.html">Returns &amp; exchanges</a></li>
              <li><a href="/login.html">My account</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href="mailto:support@shopflow.example">support@shopflow.example</a></li>
              <li>+1 (503) 555-0142</li>
              <li>Mon–Fri, 9am–6pm PT</li>
              <li>24 Market Street, Portland, OR 97205</li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${year} ShopFlow. All rights reserved.</span>
          <span>Privacy policy · Terms of service</span>
        </div>
      </div>
    </footer>`;
}

function updateCartCount() {
  const badge = document.querySelector('[data-cart-count]');
  if (!badge) return;
  const count = cart.getCount();
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

/** One click handler for every "Add to cart" button on the page. */
function handleAddToCart(event) {
  const button = event.target.closest('[data-add-to-cart]');
  if (!button || button.disabled) return;
  const quantityInput = button.dataset.quantityInput ? document.querySelector(button.dataset.quantityInput) : null;
  const quantity = quantityInput ? Number(quantityInput.value) || 1 : 1;

  cart.addItem(
    {
      id: Number(button.dataset.addToCart),
      name: button.dataset.name,
      price: Number(button.dataset.price),
      imageUrl: button.dataset.image,
      stock: Number(button.dataset.stock),
    },
    quantity,
  );
  showToast(`${button.dataset.name} added to your cart`, { linkHref: '/cart.html', linkText: 'View cart' });
}

/** Replaces broken product photos with a neutral placeholder. */
function handleImageError(event) {
  const img = event.target;
  if (img.tagName !== 'IMG' || img.dataset.fallback === undefined) return;
  const placeholder = document.createElement('div');
  placeholder.className = 'img-fallback';
  placeholder.textContent = img.dataset.fallback || 'Image unavailable';
  img.replaceWith(placeholder);
}

export function initLayout({ activePage } = {}) {
  const headerSlot = document.getElementById('site-header');
  const footerSlot = document.getElementById('site-footer');
  if (headerSlot) headerSlot.outerHTML = headerHtml(activePage);
  if (footerSlot) footerSlot.outerHTML = footerHtml();

  updateCartCount();
  window.addEventListener('cart:changed', updateCartCount);
  window.addEventListener('session:changed', () => {
    const slot = document.querySelector('[data-account-slot]');
    if (slot) slot.innerHTML = accountLink();
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-sign-out]')) {
      clearSession();
      window.location.href = '/';
      return;
    }
    handleAddToCart(event);
  });
  // "error" does not bubble, so listen in the capture phase.
  document.addEventListener('error', handleImageError, true);
  // Images that already failed before this script ran.
  document.querySelectorAll('img[data-fallback]').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) handleImageError({ target: img });
  });
}
