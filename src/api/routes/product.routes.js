const { Router } = require('express');
const controller = require('../controllers/product.controller');
const { validate, idParamSchema } = require('../middleware/validate');
const { productQuerySchema } = require('../../models');

const router = Router();

router.get('/', validate({ query: productQuerySchema }), controller.list);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);
router.get('/:id/related', validate({ params: idParamSchema }), controller.getRelated);

module.exports = router;
