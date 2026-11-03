/**
 * GET /health — 200 when the app and database are healthy, 503 otherwise.
 */
const { healthService } = require('../../services');

async function check(req, res) {
  const { healthy, report } = await healthService.checkHealth();
  // Monitors should always see the live state, never a cached response.
  res.set('Cache-Control', 'no-store');
  res.status(healthy ? 200 : 503).json(report);
}

module.exports = { check };
