/**
 * Admin orders page: list, search, filter, view details and update status.
 * The server enforces admin access; this check only avoids showing an empty page.
 */
import { initLayout } from '../layout.js';
import { api } from '../api.js';
import { icons } from '../icons.js';
import { getCurrentUser } from '../session.js';
import {
  escapeHtml, formatPrice, formatDate, statusBadge, loader, errorAlert, showToast,
} from '../ui.js';

if (!getCurrentUser()) window.location.replace('/login.html?redirect=/admin.html');

initLayout({ activePage: 'admin' });

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAGE_SIZE = 15;

const el = {
  root: document.getElementById('admin-root'),
  stats: document.getElementById('stat-grid'),
  search: document.getElementById('order-search'),
  status: document.getElementById('status-filter'),
  filters: document.getElementById('order-filters'),
  body: document.getElementById('orders-body'),
  error: document.getElementById('orders-error'),
  pagination: document.getElementById('pagination'),
  drawer: document.getElementById('order-drawer'),
  backdrop: document.getElementById('drawer-backdrop'),
  drawerTitle: document.getElementById('drawer-title'),
  drawerSubtitle: document.getElementById('drawer-subtitle'),
  drawerBody: document.getElementById('drawer-body'),
  drawerClose: document.getElementById('drawer-close'),
};

const state = { page: 1, search: '', status: '' };
let requestId = 0;

function renderStats(counts = {}) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const cards = [['', 'All orders', total], ...STATUSES.filter((s) => s !== 'delivered').map((s) => [s, s, counts[s] || 0])];
  el.stats.innerHTML = cards
    .map(([status, label, count]) => `
      <button type="button" class="stat ${state.status === status ? 'is-active' : ''}" data-status="${status}">
        <span>${escapeHtml(label)}</span><strong>${count}</strong>
      </button>`)
    .join('');
}

function renderRows(orders) {
  if (orders.length === 0) {
    el.body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--color-muted)">No orders match your filters.</td></tr>';
    return;
  }
  el.body.innerHTML = orders
    .map((order) => `
      <tr>
        <td><strong>${escapeHtml(order.orderNumber)}</strong></td>
        <td>${formatDate(order.createdAt)}</td>
        <td>${escapeHtml(order.customerName)}<div class="muted">${escapeHtml(order.customerEmail)}</div></td>
        <td class="num">${order.itemCount}</td>
        <td class="num">${formatPrice(order.total)}</td>
        <td>${statusBadge(order.status)}</td>
        <td class="num"><button type="button" class="btn btn-secondary btn-sm" data-view-order="${order.id}">View</button></td>
      </tr>`)
    .join('');
}

function renderPagination(meta) {
  if (meta.totalPages <= 1) {
    el.pagination.innerHTML = '';
    return;
  }
  el.pagination.innerHTML = `
    <button type="button" class="btn btn-secondary btn-sm" data-page="${meta.page - 1}" ${meta.page <= 1 ? 'disabled' : ''}>Previous</button>
    <span>Page ${meta.page} of ${meta.totalPages}</span>
    <button type="button" class="btn btn-secondary btn-sm" data-page="${meta.page + 1}" ${meta.page >= meta.totalPages ? 'disabled' : ''}>Next</button>`;
}

async function loadOrders() {
  const thisRequest = ++requestId;
  el.error.innerHTML = '';
  el.body.innerHTML = `<tr><td colspan="7">${loader('Loading orders…')}</td></tr>`;
  try {
    const { data, meta } = await api.getOrders({ page: state.page, limit: PAGE_SIZE, search: state.search, status: state.status });
    if (thisRequest !== requestId) return;
    renderStats(meta.statusCounts);
    renderRows(data);
    renderPagination(meta);
  } catch (error) {
    if (thisRequest !== requestId) return;
    if (error.status === 401) {
      window.location.replace('/login.html?redirect=/admin.html');
      return;
    }
    if (error.status === 403) {
      el.root.innerHTML = `<div class="not-found"><span class="eyebrow">Access denied</span><h1 class="mt-1">Administrators only</h1>
        <p>Your account does not have permission to manage orders.</p><a class="btn btn-primary" href="/">Back to the store</a></div>`;
      return;
    }
    el.body.innerHTML = '';
    el.error.innerHTML = errorAlert(`Orders could not be loaded. ${error.message}`);
  }
}

// --- Order details drawer ----------------------------------------------
function openDrawer() {
  el.backdrop.hidden = false;
  requestAnimationFrame(() => {
    el.backdrop.classList.add('is-open');
    el.drawer.classList.add('is-open');
  });
  el.drawer.setAttribute('aria-hidden', 'false');
  el.drawerClose.focus();
}

function closeDrawer() {
  el.backdrop.classList.remove('is-open');
  el.drawer.classList.remove('is-open');
  el.drawer.setAttribute('aria-hidden', 'true');
  setTimeout(() => { el.backdrop.hidden = true; }, 200);
}

function renderOrderDetails(order) {
  el.drawerTitle.textContent = order.orderNumber;
  el.drawerSubtitle.textContent = `Placed ${formatDate(order.createdAt)} · ${order.userId ? 'Registered customer' : 'Guest checkout'}`;
  const address = order.shippingAddress;
  const nextStatuses = order.allowedNextStatuses;

  const statusControl = nextStatuses.length
    ? `<form class="status-form" id="status-form">
         <label class="sr-only" for="new-status">New status</label>
         <select class="select" id="new-status">${nextStatuses.map((s) => `<option value="${s}">Mark as ${s}</option>`).join('')}</select>
         <button class="btn btn-primary btn-sm" type="submit" style="height:40px">Update</button>
       </form>
       <p class="field-hint">The customer receives an email when the status changes.</p>`
    : '<p class="text-muted" style="font-size:0.875rem">This order is final and can no longer be changed.</p>';

  el.drawerBody.innerHTML = `
    <section class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="margin:0">Status</h2>${statusBadge(order.status)}
      </div>
      <div id="status-error"></div>
      ${statusControl}
    </section>
    <section class="panel">
      <h2>Customer</h2>
      <dl class="detail-grid">
        <div><dt>Name</dt><dd>${escapeHtml(order.customerName)}</dd></div>
        <div><dt>Email</dt><dd><a href="mailto:${escapeHtml(order.customerEmail)}">${escapeHtml(order.customerEmail)}</a></dd></div>
        <div style="grid-column:1/-1"><dt>Shipping address</dt><dd>${escapeHtml(address.line1)}, ${escapeHtml(address.city)} ${escapeHtml(address.postalCode)}, ${escapeHtml(address.country)}</dd></div>
      </dl>
    </section>
    <section class="panel">
      <h2>Items</h2>
      <ul class="order-lines">
        ${order.items.map((item) => `<li><span>${item.quantity} × ${escapeHtml(item.productName)} <span class="muted">@ ${formatPrice(item.unitPrice)}</span></span><span>${formatPrice(item.lineTotal)}</span></li>`).join('')}
      </ul>
      <div class="summary-row mt-2"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${formatPrice(order.total)}</span></div>
    </section>`;

  const statusForm = document.getElementById('status-form');
  if (statusForm) {
    statusForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const newStatus = document.getElementById('new-status').value;
      if (newStatus === 'cancelled' && !window.confirm('Cancel this order? Items will be returned to stock.')) return;
      const button = statusForm.querySelector('button');
      button.disabled = true;
      button.textContent = 'Updating…';
      try {
        const { data } = await api.updateOrderStatus(order.id, newStatus);
        renderOrderDetails(data);
        showToast(`${data.orderNumber} marked as ${data.status}`);
        loadOrders();
      } catch (error) {
        document.getElementById('status-error').innerHTML = errorAlert(error.message);
        button.disabled = false;
        button.textContent = 'Update';
      }
    });
  }
}

async function viewOrder(id) {
  el.drawerTitle.textContent = 'Order';
  el.drawerSubtitle.textContent = '';
  el.drawerBody.innerHTML = loader('Loading order…');
  openDrawer();
  try {
    const { data } = await api.getOrder(id);
    renderOrderDetails(data);
  } catch (error) {
    el.drawerBody.innerHTML = errorAlert(`This order could not be loaded. ${error.message}`);
  }
}

// --- Events --------------------------------------------------------------
el.drawerClose.innerHTML = icons.close;
el.drawerClose.addEventListener('click', closeDrawer);
el.backdrop.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && el.drawer.classList.contains('is-open')) closeDrawer();
});

el.body.addEventListener('click', (event) => {
  const button = event.target.closest('[data-view-order]');
  if (button) viewOrder(Number(button.dataset.viewOrder));
});

el.pagination.addEventListener('click', (event) => {
  const button = event.target.closest('[data-page]');
  if (!button || button.disabled) return;
  state.page = Number(button.dataset.page);
  loadOrders();
});

el.stats.addEventListener('click', (event) => {
  const card = event.target.closest('[data-status]');
  if (!card) return;
  state.status = card.dataset.status;
  state.page = 1;
  el.status.value = state.status;
  loadOrders();
});

el.status.addEventListener('change', () => {
  state.status = el.status.value;
  state.page = 1;
  loadOrders();
});

let searchTimer;
el.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = el.search.value.trim();
    state.page = 1;
    loadOrders();
  }, 300);
});
el.filters.addEventListener('submit', (event) => {
  event.preventDefault();
  state.search = el.search.value.trim();
  state.page = 1;
  loadOrders();
});

// Non-admins still call the API: the server answers 403 and we show "Administrators only".
if (getCurrentUser()) loadOrders();
