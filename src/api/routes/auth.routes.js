const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { loginSchema, registerSchema } = require('../../models');

const router = Router();

// At most 20 login/register attempts per IP every 15 minutes.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
router.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
router.get('/me', requireAuth, controller.me);

module.exports = router;
