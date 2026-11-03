/**
 * Category queries.
 */
const { query } = require('../db');

async function findAllWithProductCounts() {
  const { rows } = await query(`
    SELECT c.id, c.slug, c.name, c.description, c.image_url,
           COUNT(p.id) FILTER (WHERE p.is_active) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id
     ORDER BY c.name ASC
  `);
  return rows;
}

async function upsert({ slug, name, description, imageUrl }, executor) {
  const { rows } = await query(
    `INSERT INTO categories (slug, name, description, image_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           image_url = EXCLUDED.image_url
     RETURNING *`,
    [slug, name, description, imageUrl],
    executor,
  );
  return rows[0];
}

module.exports = { findAllWithProductCounts, upsert };
