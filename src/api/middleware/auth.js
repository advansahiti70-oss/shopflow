/**
 * Authentication and authorization middleware.
 *
 * Clients send the JWT from /api/auth/login as:
 *   Authorization: Bearer <token>
 */
const { authService } = require('../../services');
const { UnauthorizedError, ForbiddenError } = require('../../models');

function readBearerToken(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme && scheme.toLowerCase() === 'bearer' && token ? token : null;
}

/** Rejects the request with 401 unless a valid token is provided. */
async function requireAuth(req, res, next) {
  const token = readBearerToken(req);
  if (!token) return next(new UnauthorizedError('Please sign in to continue'));
  try {
    req.user = await authService.authenticateToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
}

/** Attaches req.user when a valid token is present, but never rejects. */
async function optionalAuth(req, res, next) {
  const token = readBearerToken(req);
  if (!token) return next();
  try {
    req.user = await authService.authenticateToken(token);
  } catch {
    req.user = undefined;
  }
  return next();
}

/** Rejects with 403 unless the signed-in user has one of the given roles. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError());
    return next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };
