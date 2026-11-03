/**
 * "Your order status has changed" email.
 */
const { escapeHtml, formatAmount, capitalize, COLORS } = require('./helpers');
const { renderLayout, renderOrderSummary, renderButton } = require('./layout');

const STATUS_MESSAGES = {
  pending: 'Your order has been received and is awaiting confirmation.',
  confirmed: 'Good news — your order has been confirmed and is being prepared for shipment.',
  shipped: 'Your order is on its way. It usually arrives within 2–5 business days.',
  delivered: 'Your order has been delivered. We hope you enjoy your purchase.',
  cancelled: 'Your order has been cancelled. If you were charged, a full refund will be issued to your original payment method.',
};

function renderOrderStatusUpdate(payload) {
  const status = payload.status;
  if (!STATUS_MESSAGES[status]) throw new Error(`Unknown order status for email: ${status}`);

  const statusLabel = capitalize(status);
  const subject = `Your order ${payload.orderNumber} is ${status}`;

  const bodyHtml = `
    <p style="margin:0 0 6px;font-size:13px;letter-spacing:0.6px;text-transform:uppercase;color:${COLORS.olive};">Order ${escapeHtml(payload.orderNumber)}</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;">Order update: ${escapeHtml(statusLabel)}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:${COLORS.muted};">
      Hi ${escapeHtml(payload.customerName)}, ${escapeHtml(STATUS_MESSAGES[status])}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="background:${COLORS.stone};border:1px solid ${COLORS.border};border-radius:4px;">
      <tr>
        <td style="padding:12px 16px;font-size:14px;">
          ${payload.previousStatus ? `<span style="color:${COLORS.muted};">${escapeHtml(capitalize(payload.previousStatus))} &rarr;</span> ` : ''}
          <strong style="color:${COLORS.primary};">${escapeHtml(statusLabel)}</strong>
        </td>
      </tr>
    </table>
    ${renderOrderSummary(payload, formatAmount)}
    <p style="margin:28px 0 0;">${renderButton(payload.accountUrl || payload.storeUrl, 'View your orders')}</p>`;

  const text = [
    `Hi ${payload.customerName},`,
    '',
    `Order ${payload.orderNumber} is now ${status}.`,
    STATUS_MESSAGES[status],
    '',
    `Total: ${formatAmount(payload.total)}`,
  ].join('\n');

  return {
    subject,
    html: renderLayout({ title: subject, preheader: `Order ${payload.orderNumber} is now ${status}.`, bodyHtml, storeUrl: payload.storeUrl }),
    text,
  };
}

module.exports = { renderOrderStatusUpdate, STATUS_MESSAGES };
