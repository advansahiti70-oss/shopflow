/**
 * Order HTTP handlers.
 */
const { orderService } = require('../../services');

async function create(req, res) {
  const order = await orderService.placeOrder(req.validated.body, req.user || null);
  res.status(201).location(`/api/orders/${order.id}`).json({ data: order });
}

async function list(req, res) {
  const result = await orderService.listOrders(req.validated.query, req.user);
  res.status(200).json(result);
}

async function getById(req, res) {
  const order = await orderService.getOrderById(req.validated.params.id, req.user);
  res.status(200).json({ data: order });
}

async function updateStatus(req, res) {
  const order = await orderService.updateOrderStatus(req.validated.params.id, req.validated.body.status);
  res.status(200).json({ data: order });
}

module.exports = { create, list, getById, updateStatus };
