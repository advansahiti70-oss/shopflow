/**
 * Data layer entry point. Services import repositories from here.
 */
const { withTransaction, closePool } = require('./db');

module.exports = {
  withTransaction,
  closePool,
  categoryRepository: require('./repositories/category.repository'),
  productRepository: require('./repositories/product.repository'),
  userRepository: require('./repositories/user.repository'),
  orderRepository: require('./repositories/order.repository'),
  emailJobRepository: require('./repositories/emailJob.repository'),
  healthRepository: require('./repositories/health.repository'),
};
