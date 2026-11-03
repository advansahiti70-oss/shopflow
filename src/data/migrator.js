/**
 * Applies the SQL files in /migrations in filename order.
 *
 * Applied migrations are recorded in the schema_migrations table, so running
 * the migrator again only applies new files. Each file runs in its own
 * transaction: a failing migration leaves the database unchanged.
 */
const fs = require('node:fs');
const path = require('node:path');
const { query, withTransaction } = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        VARCHAR(255) PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function runMigrations({ log = console.log } = {}) {
  await ensureMigrationsTable();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const { rows } = await query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.name));
  const pending = files.filter((file) => !applied.has(file));

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
    log(`[migrate] applied ${file}`);
  }

  if (pending.length === 0) log('[migrate] database is up to date');
  return pending;
}

/** Drops every ShopFlow table. Used by the test suite only. */
async function resetDatabase() {
  await query(`
    DROP TABLE IF EXISTS email_jobs, order_items, orders, products, categories, users, schema_migrations CASCADE;
    DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
  `);
}

module.exports = { runMigrations, resetDatabase };
