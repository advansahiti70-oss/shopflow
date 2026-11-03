const { Router } = require('express');
const controller = require('../controllers/order.controller');
const { validate, idParamSchema } = require('../middleware/validate');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { ROLES, createOrderSchema, updateOrderStatusSchema, orderQuerySchema } = require('../../models');

const router = Router();

// Guests can check out; signed-in customers get the order linked to their account.
router.post('/', optionalAuth, validate({ body: createOrderSchema }), controller.create);

// Customers see their own orders, admins see all of them.
router.get('/', requireAuth, validate({ query: orderQuerySchema }), controller.list);
router.get('/:id', requireAuth, validate({ params: idParamSchema }), controller.getById);

// Only administrators may change an order's status.
router.patch(
  '/:id/status',
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate({ params: idParamSchema, body: updateOrderStatusSchema }),
  controller.updateStatus,
);

module.exports = router;
