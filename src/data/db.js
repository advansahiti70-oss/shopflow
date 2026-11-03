/**
 * PostgreSQL connection management.
 *
 * A single connection pool is shared by the whole process. Repositories run
 * queries through `query()`, and multi-step operations use
 * `withTransaction()` so that either every statement succeeds or none do.
 */
const { Pool } = require('pg');
const config = require('../config');

let pool = null;

function getPool() {
  if (!pool) {
    if (!config.database.url) {
      throw new Error('DATABASE_URL is not configured');
    }
    pool = new Pool({
      connectionString: config.database.url,
      max: config.database.poolMax,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
      // Fail quickly when the database is unreachable instead of hanging.
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    // An idle client can error (e.g. the database restarted). Log it so the
    // process does not crash; the pool will create a new client next time.
    pool.on('error', (err) => {
      console.error('[db] Unexpected error on idle PostgreSQL client:', err.message);
    });
  }
  return pool;
}

/**
 * Runs a parameterized query.
 * @param {string} text   SQL with $1, $2 ... placeholders
 * @param {Array}  params values for the placeholders (never string-concatenated)
 * @param {object} [executor] a transaction client; defaults to the pool
 */
async function query(text, params = [], executor) {
  const runner = executor || getPool();
  return runner.query(text, params);
}

/**
 * Runs `work(client)` inside a database transaction.
 * Commits when `work` resolves, rolls back when it throws.
 */
async function withTransaction(work) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[db] Rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (pool) {
    const closing = pool;
    pool = null;
    await closing.end();
  }
}

module.exports = { getPool, query, withTransaction, closePool };
