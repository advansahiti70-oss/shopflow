/**
 * Services layer entry point. The API layer and the worker import from here.
 */
module.exports = {
  productService: require('./product.service'),
  authService: require('./auth.service'),
  orderService: require('./order.service'),
  emailJobService: require('./emailJob.service'),
  healthService: require('./health.service'),
};
