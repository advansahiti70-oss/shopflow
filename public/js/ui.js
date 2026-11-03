/**
 * Reusable UI helpers and HTML components shared by all pages.
 */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Always escape API data before inserting it into innerHTML. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

const priceFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const formatPrice = (amount) => priceFormatter.format(Number(amount) || 0);

const dateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
export const formatDate = (value) => dateFormatter.format(new Date(value));

export function starRating(rating, reviewCount) {
  const percent = Math.max(0, Math.min(100, (Number(rating) / 5) * 100));
  return `
    <span class="rating" aria-label="Rated ${Number(rating).toFixed(1)} out of 5">
      <span class="stars"><span style="width:${percent}%"></span></span>
      <span>${Number(rating).toFixed(1)}${reviewCount !== undefined ? ` (${Number(reviewCount).toLocaleString('en-US')})` : ''}</span>
    </span>`;
}

/** <img> that is replaced by a neutral placeholder if the photo fails to load. */
export function productImage(src, alt, { eager = false } = {}) {
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-fallback="${escapeHtml(alt)}">`;
}

/** Data attributes read by the global "add to cart" click handler. */
export function addToCartAttributes(product) {
  return `data-add-to-cart="${product.id}"
    data-name="${escapeHtml(product.name)}"
    data-price="${product.price}"
    data-image="${escapeHtml(product.imageUrl)}"
    data-stock="${product.stock}"`;
}

export function productCard(product) {
  const url = `/product.html?id=${product.id}`;
  let badge = '';
  if (!product.inStock) badge = '<span class="product-card__badge product-card__badge--muted">Sold out</span>';
  else if (product.stock <= 5) badge = '<span class="product-card__badge">Only a few left</span>';
  else if (product.isFeatured) badge = '<span class="product-card__badge">Bestseller</span>';

  return `
    <article class="product-card">
      <a class="product-card__media" href="${url}" aria-label="${escapeHtml(product.name)}">
        ${productImage(product.imageUrl, product.name)}
        ${badge}
      </a>
      <div class="product-card__body">
        <span class="product-card__category">${escapeHtml(product.category.name)}</span>
        <h3 class="product-card__name"><a href="${url}">${escapeHtml(product.name)}</a></h3>
        ${starRating(product.rating, product.reviewCount)}
        <div class="product-card__footer">
          <span class="price">${formatPrice(product.price)}</span>
          <button type="button" class="btn btn-secondary btn-sm" ${addToCartAttributes(product)} ${product.inStock ? '' : 'disabled'}>
            ${product.inStock ? 'Add to cart' : 'Sold out'}
          </button>
        </div>
      </div>
    </article>`;
}

export function skeletonCards(count = 8) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-media"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>`).join('');
}

export function loader(message = 'Loading…') {
  return `<div class="loader" role="status"><span class="spinner"></span><span>${escapeHtml(message)}</span></div>`;
}

/** Error box; `details` are field errors returned by the API. */
export function errorAlert(message, details = []) {
  const list = details.length
    ? `<ul>${details.map((detail) => `<li>${escapeHtml(detail.message)}</li>`).join('')}</ul>`
    : '';
  return `<div class="alert alert-error" role="alert">${escapeHtml(message)}${list}</div>`;
}

export function emptyState(title, text, action = '') {
  return `<div class="empty-state"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p>${action}</div>`;
}

export function statusBadge(status) {
  return `<span class="badge badge-${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

let toastRegion;
export function showToast(message, { type = 'info', linkHref, linkText, duration = 3500 } = {}) {
  if (!toastRegion) {
    toastRegion = document.createElement('div');
    toastRegion.className = 'toast-region';
    toastRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastRegion);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'is-error' : ''}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>${linkHref ? `<a href="${escapeHtml(linkHref)}">${escapeHtml(linkText)}</a>` : ''}`;
  toastRegion.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

/** Shows or clears an inline error under a form field. */
export function setFieldError(input, message) {
  const field = input.closest('.field');
  if (!field) return;
  field.classList.toggle('has-error', Boolean(message));
  let error = field.querySelector('.field-error');
  if (!error) {
    error = document.createElement('span');
    error.className = 'field-error';
    field.appendChild(error);
  }
  error.textContent = message || '';
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
