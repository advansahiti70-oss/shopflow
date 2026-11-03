/**
 * Product queries.
 */
const { query } = require('../db');

// Columns shared by every product query (product + its category).
const PRODUCT_COLUMNS = `
  p.id, p.category_id, p.name, p.slug, p.description, p.price_cents, p.image_url,
  p.rating, p.review_count, p.stock, p.is_featured, p.created_at,
  c.slug AS category_slug, c.name AS category_name
`;

// Whitelisted ORDER BY clauses. User input selects a key, it is never
// inserted into the SQL directly.
const SORT_SQL = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price_cents ASC, p.id ASC',
  price_desc: 'p.price_cents DESC, p.id ASC',
  name_asc: 'p.name ASC',
  name_desc: 'p.name DESC',
  rating_desc: 'p.rating DESC, p.review_count DESC',
};

/**
 * Finds active products matching the given filters, with pagination.
 * Returns { rows, total }.
 */
async function findMany({ search, categorySlug, minPriceCents, maxPriceCents, featured, sort = 'newest', limit, offset }) {
  const conditions = ['p.is_active = TRUE'];
  const params = [];

  // Each filter adds a placeholder ($1, $2 ...) and pushes its value.
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`p.name ILIKE $${params.length}`);
  }
  if (categorySlug) {
    params.push(categorySlug);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (minPriceCents !== undefined) {
    params.push(minPriceCents);
    conditions.push(`p.price_cents >= $${params.length}`);
  }
  if (maxPriceCents !== undefined) {
    params.push(maxPriceCents);
    conditions.push(`p.price_cents <= $${params.length}`);
  }
  if (featured !== undefined) {
    params.push(featured);
    conditions.push(`p.is_featured = $${params.length}`);
  }

  const where = conditions.join(' AND ');
  const orderBy = SORT_SQL[sort] || SORT_SQL.newest;

  const countResult = await query(
    `SELECT COUNT(*)::int AS total
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE ${where}`,
    params,
  );

  const listResult = await query(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return { rows: listResult.rows, total: countResult.rows[0].total };
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1 AND p.is_active = TRUE`,
    [id],
  );
  return rows[0] || null;
}

/** Other products in the same category, best rated first. */
async function findRelated(productId, categoryId, limit = 4) {
  const { rows } = await query(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.category_id = $1 AND p.id <> $2 AND p.is_active = TRUE
      ORDER BY p.rating DESC, p.id ASC
      LIMIT $3`,
    [categoryId, productId, limit],
  );
  return rows;
}

/**
 * Locks the given products until the transaction ends (SELECT ... FOR UPDATE)
 * so two concurrent checkouts cannot both buy the last item in stock.
 */
async function lockByIds(ids, executor) {
  const { rows } = await query(
    `SELECT id, name, price_cents, image_url, stock, is_active
       FROM products
      WHERE id = ANY($1::int[])
      ORDER BY id
      FOR UPDATE`,
    [ids],
    executor,
  );
  return rows;
}

async function decrementStock(productId, quantity, executor) {
  await query('UPDATE products SET stock = stock - $2 WHERE id = $1', [productId, quantity], executor);
}

async function incrementStock(productId, quantity, executor) {
  await query('UPDATE products SET stock = stock + $2 WHERE id = $1', [productId, quantity], executor);
}

async function upsert(product, executor) {
  const { rows } = await query(
    `INSERT INTO products
       (category_id, name, slug, description, price_cents, image_url, rating, review_count, stock, is_featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (slug) DO UPDATE
       SET category_id = EXCLUDED.category_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           price_cents = EXCLUDED.price_cents,
           image_url = EXCLUDED.image_url,
           rating = EXCLUDED.rating,
           review_count = EXCLUDED.review_count,
           stock = EXCLUDED.stock,
           is_featured = EXCLUDED.is_featured
     RETURNING *`,
    [
      product.categoryId,
      product.name,
      product.slug,
      product.description,
      product.priceCents,
      product.imageUrl,
      product.rating,
      product.reviewCount,
      product.stock,
      product.isFeatured,
    ],
    executor,
  );
  return rows[0];
}

module.exports = {
  findMany,
  findById,
  findRelated,
  lockByIds,
  decrementStock,
  incrementStock,
  upsert,
};
