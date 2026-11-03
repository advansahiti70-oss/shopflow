/**
 * Usage: node scripts/preview-emails.js
 * Writes the email templates with sample data to docs/email-previews/
 * so they can be opened in a browser without sending anything.
 */
const fs = require('node:fs');
const path = require('node:path');
const { renderEmail } = require('../src/templates');

const sampleOrder = {
  orderId: 42,
  orderNumber: 'SF-261103-K7Q2M',
  customerName: 'Jordan Ellis',
  items: [
    { productName: 'Organic Cotton Crew T-Shirt', quantity: 2, unitPrice: 29, lineTotal: 58 },
    { productName: 'Minimalist Analog Watch', quantity: 1, unitPrice: 189, lineTotal: 189 },
  ],
  subtotal: 247,
  shipping: 0,
  total: 247,
  shippingAddress: { line1: '24 Market Street', city: 'Portland', postalCode: '97205', country: 'United States' },
  accountUrl: 'http://localhost:3000/account.html',
  storeUrl: 'http://localhost:3000',
};

const outDir = path.join(__dirname, '..', 'docs', 'email-previews');
fs.mkdirSync(outDir, { recursive: true });

const previews = {
  'order-confirmation.html': renderEmail('order_confirmation', { ...sampleOrder, status: 'pending' }),
  'order-status-shipped.html': renderEmail('order_status_update', { ...sampleOrder, status: 'shipped', previousStatus: 'confirmed' }),
};

for (const [file, message] of Object.entries(previews)) {
  fs.writeFileSync(path.join(outDir, file), message.html);
  console.log(`[preview] ${message.subject} -> docs/email-previews/${file}`);
}
