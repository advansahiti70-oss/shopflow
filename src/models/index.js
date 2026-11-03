/**
 * Models layer entry point: shared, dependency-free definitions
 * (entities/DTOs, request schemas, constants and error types).
 */
module.exports = {
  ...require('./errors'),
  ...require('./validation'),
  ...require('./money'),
  ...require('./product.model'),
  ...require('./user.model'),
  ...require('./order.model'),
  ...require('./emailJob.model'),
};
