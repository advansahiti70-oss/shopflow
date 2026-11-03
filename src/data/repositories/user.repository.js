/**
 * User queries.
 */
const { query } = require('../db');

async function findByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create({ name, email, passwordHash, role = 'customer' }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, email, passwordHash, role],
  );
  return rows[0];
}

/** Creates the user, or updates name/password/role when the email exists. */
async function upsertByEmail({ name, email, passwordHash, role }) {
  const existing = await findByEmail(email);
  if (!existing) return create({ name, email, passwordHash, role });
  const { rows } = await query(
    `UPDATE users SET name = $2, password_hash = $3, role = $4
      WHERE id = $1
      RETURNING *`,
    [existing.id, name, passwordHash, role],
  );
  return rows[0];
}

module.exports = { findByEmail, findById, create, upsertByEmail };
