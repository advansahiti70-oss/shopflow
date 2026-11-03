/**
 * Usage: npm run migrate
 * Applies all pending SQL migrations from /migrations.
 */
const { runMigrations } = require('../src/data/migrator');
const { closePool } = require('../src/data/db');

runMigrations()
  .then(() => closePool())
  .catch(async (error) => {
    console.error('[migrate] failed:', error.message);
    await closePool();
    process.exit(1);
  });
