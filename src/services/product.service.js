/**
 * Product catalog business logic.
 */
const { productRepository, categoryRepository } = require('../data');
const { NotFoundError, ValidationError, toProductDTO, toCategoryDTO } = require('../models');

function buildPaginationMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/**
 * Lists products. `filters` has already passed request validation.
 * Prices arrive as decimal amounts and are converted to cents here.
 */
async function listProducts(filters) {
  const { page, limit } = filters;
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) {
    throw new ValidationError('minPrice cannot be greater than maxPrice', [
      { field: 'minPrice', message: 'minPrice cannot be greater than maxPrice' },
    ]);
  }

  const { rows, total } = await productRepository.findMany({
    search: filters.search,
    categorySlug: filters.category,
    minPriceCents: filters.minPrice !== undefined ? Math.round(filters.minPrice * 100) : undefined,
    maxPriceCents: filters.maxPrice !== undefined ? Math.round(filters.maxPrice * 100) : undefined,
    featured: filters.featured,
    sort: filters.sort,
    limit,
    offset: (page - 1) * limit,
  });

  return { data: rows.map(toProductDTO), meta: buildPaginationMeta(page, limit, total) };
}

async function getProductById(id) {
  const row = await productRepository.findById(id);
  if (!row) throw new NotFoundError('Product not found');
  return toProductDTO(row);
}

async function getRelatedProducts(id, limit = 4) {
  const product = await productRepository.findById(id);
  if (!product) throw new NotFoundError('Product not found');
  const rows = await productRepository.findRelated(product.id, product.category_id, limit);
  return rows.map(toProductDTO);
}

async function listCategories() {
  const rows = await categoryRepository.findAllWithProductCounts();
  return rows.map(toCategoryDTO);
}

module.exports = { listProducts, getProductById, getRelatedProducts, listCategories, buildPaginationMeta };
