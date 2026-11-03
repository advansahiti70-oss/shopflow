/**
 * Email worker entry point: `npm run worker`
 * Runs as its own process, from the same codebase as the API.
 */
const config = require('./config');
const { closePool } = require('./data');
const { createEmailWorker } = require('./workers/emailWorker');

config.assertRequired([
  ['DATABASE_URL', config.database.url],
  ['RESEND_API_KEY', config.email.resendApiKey],
]);

const worker = createEmailWorker();
worker.start();

async function shutdown(signal) {
  console.log(`[worker] ${signal} received, finishing current batch`);
  // Let the current batch finish so no job is left half-processed.
  await worker.stop();
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
