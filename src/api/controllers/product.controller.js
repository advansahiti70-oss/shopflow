/**
 * Product and category HTTP handlers.
 */
const { productService } = require('../../services');

async function list(req, res) {
  const result = await productService.listProducts(req.validated.query);
  res.status(200).json(result);
}

async function getById(req, res) {
  const product = await productService.getProductById(req.validated.params.id);
  res.status(200).json({ data: product });
}

async function getRelated(req, res) {
  const products = await productService.getRelatedProducts(req.validated.params.id);
  res.status(200).json({ data: products });
}

async function listCategories(req, res) {
  const categories = await productService.listCategories();
  res.status(200).json({ data: categories });
}

module.exports = { list, getById, getRelated, listCategories };
