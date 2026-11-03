/**
 * Builds the Express application (without starting it), so tests can run
 * requests against it directly.
 */
const path = require('node:path');
const express = require('express');
const { apiRouter, healthRouter } = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
}

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Needed for correct client IPs (rate limiting) behind Render/Railway proxies.
  app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(express.json({ limit: '100kb' }));

  app.use('/health', healthRouter);
  app.use('/api', apiRouter);
  app.use('/api', notFoundHandler);

  // The storefront: static HTML/CSS/JS. "/products" serves products.html.
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: '1h' }));
  app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html')));

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
