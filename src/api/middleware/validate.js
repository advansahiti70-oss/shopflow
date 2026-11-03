/**
 * Request validation middleware.
 *
 * Usage: router.post('/', validate({ body: createOrderSchema }), controller.create)
 *
 * Validated, cleaned values are stored on req.validated.{body,query,params}.
 * Invalid requests are rejected with 400 before reaching the controller.
 */
const { validate: runValidation, ValidationError } = require('../../models');

function validate(schemas) {
  return (req, res, next) => {
    req.validated = req.validated || {};
    const allErrors = [];

    for (const source of ['params', 'query', 'body']) {
      if (!schemas[source]) continue;
      const { value, errors } = runValidation(schemas[source], req[source]);
      req.validated[source] = value;
      allErrors.push(...errors);
    }

    if (allErrors.length > 0) {
      return next(new ValidationError('The request contains invalid data', allErrors));
    }
    return next();
  };
}

/** Shared schema for routes with a numeric :id parameter. */
const idParamSchema = { id: { type: 'integer', required: true, min: 1, max: 2147483647 } };

module.exports = { validate, idParamSchema };
