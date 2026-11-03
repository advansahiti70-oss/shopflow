/**
 * A minimal in-memory rate limiter (fixed window per client IP).
 * Used on the authentication routes to slow down password guessing.
 * For multiple server instances a shared store (e.g. Redis) would be needed.
 */
const { AppError } = require('../../models');

function rateLimit({ windowMs, max }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        return next(new AppError('Too many attempts. Please try again later.', { statusCode: 429, code: 'TOO_MANY_REQUESTS' }));
      }
    }

    // Drop expired entries now and then so the map does not grow forever.
    if (hits.size > 10000) {
      for (const [ip, value] of hits) if (value.resetAt <= now) hits.delete(ip);
    }
    return next();
  };
}

module.exports = { rateLimit };
