/**
 * "My orders" page for signed-in customers.
 */
import { initLayout } from '../layout.js';
import { api } from '../api.js';
import { getCurrentUser } from '../session.js';
import { escapeHtml, formatPrice, formatDate, productImage, statusBadge, loader, errorAlert, emptyState } from '../ui.js';

const user = getCurrentUser();
if (!user) window.location.replace('/login.html?redirect=/account.html');

initLayout({ activePage: 'account' });

const root = document.getElementById('orders-root');

function orderCard(order) {
  const items = order.items
    .map(
      (item) => `
      <div class="order-card__item">
        ${productImage(item.productImageUrl, item.productName)}
        <div><div>${escapeHtml(item.productName)}</div><div class="qty">Qty ${item.quantity} · ${formatPrice(item.unitPrice)}</div></div>
        <span class="line-total">${formatPrice(item.lineTotal)}</span>
      </div>`,
    )
    .join('');
  return `
    <article class="order-card">
      <div class="order-card__head">
        <dl>
          <div><dt>Order</dt><dd>${escapeHtml(order.orderNumber)}</dd></div>
          <div><dt>Placed</dt><dd>${formatDate(order.createdAt)}</dd></div>
          <div><dt>Total</dt><dd>${formatPrice(order.total)}</dd></div>
        </dl>
        ${statusBadge(order.status)}
      </div>
      <div class="order-card__items">${items}</div>
    </article>`;
}

async function load() {
  if (!user) return;
  document.getElementById('account-subtitle').textContent = `Signed in as ${user.email}`;
  root.innerHTML = loader('Loading your orders…');
  try {
    const { data } = await api.getOrders({ limit: 20 });
    if (data.length === 0) {
      root.innerHTML = emptyState('No orders yet', 'When you place an order it will appear here.', '<a class="btn btn-primary" href="/products.html">Start shopping</a>');
      return;
    }
    // The list endpoint returns summaries; fetch details for line items.
    const orders = await Promise.all(data.map((order) => api.getOrder(order.id).then((res) => res.data)));
    root.innerHTML = orders.map(orderCard).join('');
  } catch (error) {
    if (error.status === 401) {
      window.location.replace('/login.html?redirect=/account.html');
      return;
    }
    root.innerHTML = errorAlert(`We couldn't load your orders. ${error.message}`);
  }
}

load();
