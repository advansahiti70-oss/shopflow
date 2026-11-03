/**
 * "Thank you for your order" email.
 */
const { escapeHtml, formatAmount, COLORS } = require('./helpers');
const { renderLayout, renderOrderSummary, renderButton } = require('./layout');

function renderOrderConfirmation(payload) {
  const firstName = String(payload.customerName || '').split(' ')[0] || 'there';
  const subject = `Order confirmed — ${payload.orderNumber}`;

  const bodyHtml = `
    <p style="margin:0 0 6px;font-size:13px;letter-spacing:0.6px;text-transform:uppercase;color:${COLORS.olive};">Order ${escapeHtml(payload.orderNumber)}</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;">Thank you for your order, ${escapeHtml(firstName)}.</h1>
    <p style="margin:0;font-size:15px;line-height:24px;color:${COLORS.muted};">
      We've received your order and are getting it ready. You'll receive another email as soon as its status changes.
    </p>
    ${renderOrderSummary(payload, formatAmount)}
    <p style="margin:28px 0 0;">${renderButton(payload.accountUrl || payload.storeUrl, 'View your orders')}</p>`;

  const text = [
    `Thank you for your order, ${firstName}.`,
    `Order number: ${payload.orderNumber}`,
    '',
    ...(payload.items || []).map((item) => `${item.quantity} x ${item.productName} — ${formatAmount(item.lineTotal)}`),
    '',
    `Subtotal: ${formatAmount(payload.subtotal)}`,
    `Shipping: ${payload.shipping > 0 ? formatAmount(payload.shipping) : 'Free'}`,
    `Total: ${formatAmount(payload.total)}`,
  ].join('\n');

  return {
    subject,
    html: renderLayout({ title: subject, preheader: `We've received order ${payload.orderNumber}.`, bodyHtml, storeUrl: payload.storeUrl }),
    text,
  };
}

module.exports = { renderOrderConfirmation };
