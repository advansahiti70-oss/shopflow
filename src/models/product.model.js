/**
 * Product and category definitions: request schemas and response DTOs.
 */
const { centsToAmount } = require('./money');

const PRODUCT_SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'rating_desc'];

/** Query parameters accepted by GET /api/products */
const productQuerySchema = {
  search: { type: 'string', maxLength: 100 },
  category: { type: 'string', maxLength: 80 },
  minPrice: { type: 'number', min: 0 },
  maxPrice: { type: 'number', min: 0 },
  featured: { type: 'boolean' },
  sort: { type: 'string', enum: PRODUCT_SORT_OPTIONS, default: 'newest' },
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 48, default: 12 },
};

/** Converts a database row into the shape returned by the API. */
function toProductDTO(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: centsToAmount(row.price_cents),
    priceCents: row.price_cents,
    imageUrl: row.image_url,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    stock: row.stock,
    inStock: row.stock > 0,
    isFeatured: row.is_featured,
    category: {
      id: row.category_id,
      slug: row.category_slug,
      name: row.category_name,
    },
  };
}

function toCategoryDTO(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    productCount: row.product_count !== undefined ? Number(row.product_count) : undefined,
  };
}

module.exports = {
  PRODUCT_SORT_OPTIONS,
  productQuerySchema,
  toProductDTO,
  toCategoryDTO,
};
