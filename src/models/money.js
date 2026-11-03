/**
 * Money helpers. Prices are stored as integer cents in the database and
 * exposed as decimal amounts (e.g. 4990 -> 49.9) in API responses.
 */
function centsToAmount(cents) {
  return Math.round(Number(cents)) / 100;
}

function formatMoney(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(centsToAmount(cents));
}

module.exports = { centsToAmount, formatMoney };
