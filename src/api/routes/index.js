/**
 * Mounts every API route under /api, plus the /health endpoint.
 */
const { Router } = require('express');
const healthController = require('../controllers/health.controller');

const apiRouter = Router();
apiRouter.use('/products', require('./product.routes'));
apiRouter.use('/categories', require('./category.routes'));
apiRouter.use('/auth', require('./auth.routes'));
apiRouter.use('/orders', require('./order.routes'));

const healthRouter = Router();
healthRouter.get('/', healthController.check);

module.exports = { apiRouter, healthRouter };
