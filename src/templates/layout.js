/**
 * Shared HTML email layout.
 *
 * Email clients support only a subset of HTML/CSS, so the layout uses
 * tables and inline styles — the most reliable approach across Gmail,
 * Outlook and Apple Mail.
 */
const { escapeHtml, COLORS } = require('./helpers');

function renderLayout({ preheader, title, bodyHtml, storeUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.background};font-family:Inter,Helvetica,Arial,sans-serif;color:${COLORS.text};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.background};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid ${COLORS.border};border-radius:4px;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid ${COLORS.border};">
              <a href="${escapeHtml(storeUrl)}" style="font-size:20px;font-weight:700;letter-spacing:-0.3px;color:${COLORS.primary};text-decoration:none;">ShopFlow</a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${COLORS.stone};border-top:1px solid ${COLORS.border};font-size:12px;line-height:18px;color:#5F5E5A;">
              Questions about your order? Reply to this email or contact support@shopflow.example.<br>
              ShopFlow · 24 Market Street · Portland, OR 97205
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** The items + totals table used by both order emails. */
function renderOrderSummary(payload, formatAmount) {
  const rows = (payload.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};font-size:14px;">
          ${escapeHtml(item.productName)}<br>
          <span style="color:${COLORS.muted};font-size:13px;">Qty ${escapeHtml(item.quantity)} × ${formatAmount(item.unitPrice)}</span>
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid ${COLORS.border};font-size:14px;white-space:nowrap;">${formatAmount(item.lineTotal)}</td>
      </tr>`,
    )
    .join('');

  const address = payload.shippingAddress || {};
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
      ${rows}
      <tr><td style="padding:10px 0 2px;font-size:14px;color:${COLORS.muted};">Subtotal</td><td align="right" style="padding:10px 0 2px;font-size:14px;">${formatAmount(payload.subtotal)}</td></tr>
      <tr><td style="padding:2px 0;font-size:14px;color:${COLORS.muted};">Shipping</td><td align="right" style="padding:2px 0;font-size:14px;">${payload.shipping > 0 ? formatAmount(payload.shipping) : 'Free'}</td></tr>
      <tr><td style="padding:10px 0;font-size:16px;font-weight:700;">Total</td><td align="right" style="padding:10px 0;font-size:16px;font-weight:700;">${formatAmount(payload.total)}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:${COLORS.muted};">
      <strong style="color:${COLORS.text};">Shipping to</strong><br>
      ${escapeHtml(payload.customerName)}<br>
      ${escapeHtml(address.line1)}<br>
      ${escapeHtml(address.city)} ${escapeHtml(address.postalCode)}<br>
      ${escapeHtml(address.country)}
    </p>`;
}

function renderButton(href, label) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${COLORS.primary};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:4px;">${escapeHtml(label)}</a>`;
}

module.exports = { renderLayout, renderOrderSummary, renderButton };
