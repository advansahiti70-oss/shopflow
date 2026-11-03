/**
 * Database connectivity check used by GET /health.
 */
const { query } = require('../db');

/** Resolves with the round-trip time in ms, rejects if the database is unreachable. */
async function ping() {
  const started = Date.now();
  await query('SELECT 1');
  return Date.now() - started;
}

module.exports = { ping };
