/**
 * Home page: categories and featured products.
 */
import { initLayout } from '../layout.js';
import { api } from '../api.js';
import { icons } from '../icons.js';
import { escapeHtml, productCard, productImage, skeletonCards, errorAlert } from '../ui.js';

initLayout({ activePage: 'home' });

const valueProps = [
  { icon: icons.truck, title: 'Free shipping over $100', text: 'Flat $7.95 on smaller orders' },
  { icon: icons.returns, title: '30-day free returns', text: 'Changed your mind? No problem' },
  { icon: icons.lock, title: 'Secure checkout', text: 'Your data is always protected' },
  { icon: icons.support, title: 'Real human support', text: 'Mon–Fri, 9am–6pm PT' },
];

document.getElementById('value-props').innerHTML = valueProps
  .map((prop) => `<div class="value-prop">${prop.icon}<div><strong>${prop.title}</strong><span>${prop.text}</span></div></div>`)
  .join('');

async function loadCategories() {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton" style="aspect-ratio:1"></div>').join('');
  try {
    const { data } = await api.getCategories();
    grid.innerHTML = data
      .map(
        (category) => `
        <a class="category-tile" href="/products.html?category=${encodeURIComponent(category.slug)}">
          <div class="category-tile__media">${productImage(category.imageUrl, category.name)}</div>
          <h3>${escapeHtml(category.name)}</h3>
          <p>${category.productCount} products</p>
        </a>`,
      )
      .join('');
  } catch (error) {
    grid.outerHTML = errorAlert(`Categories could not be loaded. ${error.message}`);
  }
}

async function loadFeatured() {
  const grid = document.getElementById('featured-grid');
  grid.innerHTML = skeletonCards(8);
  try {
    const { data } = await api.getProducts({ featured: true, sort: 'rating_desc', limit: 8 });
    grid.innerHTML = data.map(productCard).join('');
  } catch (error) {
    grid.outerHTML = errorAlert(`Products could not be loaded. ${error.message}`);
  }
}

loadCategories();
loadFeatured();
