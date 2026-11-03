/**
 * Products page: search, category and price filters, sorting and "load more".
 * The current filters are kept in the URL so results can be shared/bookmarked.
 */
import { initLayout } from '../layout.js';
import { api } from '../api.js';
import { escapeHtml, productCard, skeletonCards, errorAlert, emptyState } from '../ui.js';

initLayout({ activePage: 'products' });

const PAGE_SIZE = 12;

const elements = {
  title: document.getElementById('catalog-title'),
  subtitle: document.getElementById('catalog-subtitle'),
  grid: document.getElementById('product-grid'),
  error: document.getElementById('catalog-error'),
  count: document.getElementById('result-count'),
  categoryList: document.getElementById('category-filter'),
  priceForm: document.getElementById('price-filter'),
  priceError: document.getElementById('price-error'),
  minPrice: document.getElementById('min-price'),
  maxPrice: document.getElementById('max-price'),
  searchForm: document.getElementById('catalog-search'),
  searchInput: document.getElementById('search-input'),
  sort: document.getElementById('sort-select'),
  loadMore: document.getElementById('load-more'),
  loadMoreButton: document.getElementById('load-more-button'),
  loadMoreStatus: document.getElementById('load-more-status'),
  filters: document.getElementById('filters'),
  filtersToggle: document.getElementById('filters-toggle'),
  clearFilters: document.getElementById('clear-filters'),
};

let categories = [];
let currentPage = 1;
let requestId = 0; // ignores responses from outdated requests

/** Reads filters from the URL: ?search=&category=&minPrice=&maxPrice=&sort= */
function readFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    search: params.get('search') || '',
    category: params.get('category') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    sort: params.get('sort') || 'newest',
  };
}

function writeFilters(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && !(key === 'sort' && value === 'newest')) params.set(key, value);
  }
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
}

function updateFilters(changes) {
  writeFilters({ ...readFilters(), ...changes });
  syncControls();
  loadProducts({ reset: true });
}

function syncControls() {
  const filters = readFilters();
  elements.searchInput.value = filters.search;
  elements.minPrice.value = filters.minPrice;
  elements.maxPrice.value = filters.maxPrice;
  elements.sort.value = filters.sort;

  const category = categories.find((item) => item.slug === filters.category);
  elements.title.textContent = filters.search ? `Results for “${filters.search}”` : category ? category.name : 'All products';
  elements.subtitle.textContent = category ? category.description : 'Everyday goods, designed to last.';
  document.title = `${elements.title.textContent} — ShopFlow`;
  renderCategoryFilter();
}

function renderCategoryFilter() {
  const active = readFilters().category;
  const total = categories.reduce((sum, item) => sum + item.productCount, 0);
  const options = [{ slug: '', name: 'All categories', productCount: total }, ...categories];
  elements.categoryList.innerHTML = options
    .map(
      (category) => `
      <li>
        <label class="filter-option ${category.slug === active ? 'is-active' : ''}">
          <span><input type="radio" name="category" value="${escapeHtml(category.slug)}" ${category.slug === active ? 'checked' : ''}>${escapeHtml(category.name)}</span>
          <span class="count">${category.productCount}</span>
        </label>
      </li>`,
    )
    .join('');
}

async function loadProducts({ reset }) {
  const filters = readFilters();
  currentPage = reset ? 1 : currentPage + 1;
  const thisRequest = ++requestId;

  elements.error.innerHTML = '';
  if (reset) {
    elements.grid.innerHTML = skeletonCards(6);
    elements.loadMore.hidden = true;
  } else {
    elements.loadMoreButton.disabled = true;
    elements.loadMoreButton.textContent = 'Loading…';
  }

  try {
    const { data, meta } = await api.getProducts({ ...filters, page: currentPage, limit: PAGE_SIZE });
    if (thisRequest !== requestId) return;

    const html = data.map(productCard).join('');
    if (reset) elements.grid.innerHTML = html;
    else elements.grid.insertAdjacentHTML('beforeend', html);

    elements.count.textContent = `${meta.total} ${meta.total === 1 ? 'product' : 'products'}`;

    if (meta.total === 0) {
      elements.grid.innerHTML = '';
      elements.error.innerHTML = emptyState(
        'No products found',
        'Try a different search term or remove some filters.',
        '<button class="btn btn-secondary" type="button" data-clear-filters>Clear filters</button>',
      );
    }

    const shown = Math.min(meta.page * meta.limit, meta.total);
    elements.loadMore.hidden = meta.page >= meta.totalPages;
    elements.loadMoreStatus.textContent = `Showing ${shown} of ${meta.total}`;
  } catch (error) {
    if (thisRequest !== requestId) return;
    if (reset) elements.grid.innerHTML = '';
    currentPage = Math.max(1, currentPage - (reset ? 0 : 1));
    elements.error.innerHTML = errorAlert(`We couldn't load products. ${error.message}`, error.details);
  } finally {
    elements.loadMoreButton.disabled = false;
    elements.loadMoreButton.textContent = 'Load more';
  }
}

// --- Event listeners ---------------------------------------------------
elements.categoryList.addEventListener('change', (event) => {
  if (event.target.name === 'category') updateFilters({ category: event.target.value });
});

elements.priceForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const min = elements.minPrice.value;
  const max = elements.maxPrice.value;
  if (min && max && Number(min) > Number(max)) {
    elements.priceError.textContent = 'Minimum price cannot be higher than maximum price.';
    return;
  }
  elements.priceError.textContent = '';
  updateFilters({ minPrice: min, maxPrice: max });
});

elements.searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  updateFilters({ search: elements.searchInput.value.trim() });
});

// Search as you type, but wait until the user pauses.
let searchTimer;
elements.searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => updateFilters({ search: elements.searchInput.value.trim() }), 350);
});

elements.sort.addEventListener('change', () => updateFilters({ sort: elements.sort.value }));
elements.loadMoreButton.addEventListener('click', () => loadProducts({ reset: false }));

function clearAll() {
  elements.priceError.textContent = '';
  updateFilters({ search: '', category: '', minPrice: '', maxPrice: '' });
}
elements.clearFilters.addEventListener('click', clearAll);
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-clear-filters]')) clearAll();
});

elements.filtersToggle.addEventListener('click', () => {
  const open = elements.filters.classList.toggle('is-open');
  elements.filtersToggle.setAttribute('aria-expanded', String(open));
});

// --- Initial load --------------------------------------------------------
async function init() {
  syncControls();
  loadProducts({ reset: true });
  try {
    ({ data: categories } = await api.getCategories());
    syncControls();
  } catch {
    elements.categoryList.innerHTML = '<li class="field-error">Categories unavailable</li>';
  }
}

init();
