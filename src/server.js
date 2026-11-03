/**
 * Web server entry point: `npm start`
 */
const config = require('./config');
const { createApp } = require('./api/app');
const { closePool } = require('./data');
const { createEmailWorker } = require('./workers/emailWorker');

config.assertRequired([
  ['DATABASE_URL', config.database.url],
  ['JWT_SECRET', config.auth.jwtSecret],
]);

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[server] ShopFlow listening on http://localhost:${config.port} (${config.env})`);
});

// Optional: run the email worker in the same process (single-instance hosting).
const worker = config.worker.runInProcess ? createEmailWorker() : null;
if (worker) worker.start();

async function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(async () => {
    if (worker) await worker.stop();
    await closePool();
    process.exit(0);
  });
  // Force exit if connections do not close in time.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
