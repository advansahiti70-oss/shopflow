/**
 * Health check logic for GET /health.
 * Reports only up/down information — never connection strings or errors
 * that could reveal database details.
 */
const { healthRepository } = require('../data');

const DATABASE_TIMEOUT_MS = 3000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Health check timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function checkHealth() {
  const database = { status: 'up' };
  try {
    database.latencyMs = await withTimeout(healthRepository.ping(), DATABASE_TIMEOUT_MS);
  } catch {
    database.status = 'down';
  }

  const healthy = database.status === 'up';
  return {
    healthy,
    report: {
      status: healthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        app: { status: 'up' },
        database,
      },
    },
  };
}

module.exports = { checkHealth };
