/**
 * Authentication HTTP handlers.
 */
const { authService } = require('../../services');

async function register(req, res) {
  const result = await authService.register(req.validated.body);
  res.status(201).json({ data: result });
}

async function login(req, res) {
  const result = await authService.login(req.validated.body);
  res.status(200).json({ data: result });
}

async function me(req, res) {
  res.status(200).json({ data: req.user });
}

module.exports = { register, login, me };
