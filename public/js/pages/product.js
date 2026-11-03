/**
 * Product details page: /product.html?id=123
 */
import { initLayout } from '../layout.js';
import { api } from '../api.js';
import { icons } from '../icons.js';
import { MAX_QUANTITY } from '../cart.js';
import {
  escapeHtml, formatPrice, starRating, productImage, productCard,
  addToCartAttributes, loader, errorAlert, emptyState, skeletonCards,
} from '../ui.js';

initLayout({ activePage: 'product' });

const root = document.getElementById('product-root');
const breadcrumb = document.getElementById('breadcrumb');
const productId = Number(new URLSearchParams(window.location.search).get('id'));

function stockStatus(product) {
  if (!product.inStock) return '<span class="stock-status is-out">Out of stock</span>';
  if (product.stock <= 5) return `<span class="stock-status is-low">Only ${product.stock} left in stock</span>`;
  return '<span class="stock-status">In stock — ships in 1–2 business days</span>';
}

function renderProduct(product) {
  const maxQuantity = Math.min(MAX_QUANTITY, product.stock);
  document.title = `${product.name} — ShopFlow`;

  breadcrumb.insertAdjacentHTML(
    'beforeend',
    `<span aria-hidden="true">/</span><a href="/products.html?category=${encodeURIComponent(product.category.slug)}">${escapeHtml(product.category.name)}</a>
     <span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(product.name)}</span>`,
  );

  root.innerHTML = `
    <article class="product-detail">
      <div class="product-detail__media">${productImage(product.imageUrl, product.name, { eager: true })}</div>

      <div class="product-detail__info">
        <a class="eyebrow" href="/products.html?category=${encodeURIComponent(product.category.slug)}">${escapeHtml(product.category.name)}</a>
        <h1>${escapeHtml(product.name)}</h1>
        ${starRating(product.rating, product.reviewCount)}
        <p class="product-detail__price">${formatPrice(product.price)}</p>
        ${stockStatus(product)}
        <p class="product-detail__desc">${escapeHtml(product.description)}</p>

        <div class="purchase-row">
          <div class="qty-stepper" role="group" aria-label="Quantity">
            <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
            <input id="quantity" type="number" value="1" min="1" max="${Math.max(1, maxQuantity)}" aria-label="Quantity" ${product.inStock ? '' : 'disabled'}>
            <button type="button" data-step="1" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="btn btn-primary" ${addToCartAttributes(product)} data-quantity-input="#quantity" ${product.inStock ? '' : 'disabled'}>
            ${product.inStock ? 'Add to cart' : 'Out of stock'}
          </button>
        </div>

        <ul class="detail-list">
          <li>${icons.truck}<span>Free shipping on orders over $100, otherwise $7.95.</span></li>
          <li>${icons.returns}<span>Free returns within 30 days of delivery.</span></li>
          <li>${icons.leaf}<span>Responsibly sourced materials and plastic-free packaging.</span></li>
        </ul>
      </div>
    </article>`;

  // Quantity stepper: keeps the value between 1 and the available stock.
  const input = document.getElementById('quantity');
  const clamp = () => {
    input.value = Math.max(1, Math.min(maxQuantity || 1, Math.floor(Number(input.value)) || 1));
  };
  root.querySelectorAll('[data-step]').forEach((button) => {
    button.disabled = !product.inStock;
    button.addEventListener('click', () => {
      input.value = Number(input.value) + Number(button.dataset.step);
      clamp();
    });
  });
  input.addEventListener('change', clamp);
}

async function loadRelated() {
  const section = document.getElementById('related-section');
  const grid = document.getElementById('related-grid');
  section.hidden = false;
  grid.innerHTML = skeletonCards(4);
  try {
    const { data } = await api.getRelatedProducts(productId);
    if (data.length === 0) {
      section.hidden = true;
      return;
    }
    grid.innerHTML = data.map(productCard).join('');
  } catch {
    section.hidden = true; // related products are optional — fail quietly
  }
}

async function init() {
  if (!Number.isInteger(productId) || productId < 1) {
    root.innerHTML = emptyState('Product not found', 'This link looks incomplete.', '<a class="btn btn-primary" href="/products.html">Browse products</a>');
    return;
  }
  root.innerHTML = loader('Loading product…');
  try {
    const { data } = await api.getProduct(productId);
    renderProduct(data);
    loadRelated();
  } catch (error) {
    root.innerHTML = error.status === 404
      ? emptyState('Product not found', 'This product may no longer be available.', '<a class="btn btn-primary" href="/products.html">Browse products</a>')
      : errorAlert(`We couldn't load this product. ${error.message}`);
  }
}

init();
