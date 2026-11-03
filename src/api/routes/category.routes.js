const { Router } = require('express');
const controller = require('../controllers/product.controller');

const router = Router();

router.get('/', controller.listCategories);

module.exports = router;
