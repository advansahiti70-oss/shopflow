/**
 * Maps each email type to its template.
 * renderEmail(type, payload) -> { subject, html, text }
 */
const { renderOrderConfirmation } = require('./orderConfirmation.template');
const { renderOrderStatusUpdate } = require('./orderStatusUpdate.template');

const TEMPLATES = {
  order_confirmation: renderOrderConfirmation,
  order_status_update: renderOrderStatusUpdate,
};

function renderEmail(emailType, payload) {
  const template = TEMPLATES[emailType];
  if (!template) throw new Error(`No email template for type "${emailType}"`);
  return template(payload || {});
}

module.exports = { renderEmail };
