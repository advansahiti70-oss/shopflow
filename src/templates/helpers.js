/**
 * Small helpers shared by the email templates.
 */
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes user-provided text before inserting it into HTML. */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function formatAmount(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);
}

function capitalize(text) {
  const value = String(text || '');
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Brand colours (kept in sync with public/css/styles.css)
const COLORS = {
  background: '#F7F6F2',
  text: '#252525',
  muted: '#5F5E5A',
  primary: '#244B3B',
  stone: '#EAE7E0',
  border: '#D8D6D0',
  olive: '#777C55',
};

module.exports = { escapeHtml, formatAmount, capitalize, COLORS };
