/**
 * User definitions: roles, request schemas and the public user DTO.
 */
const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  ADMIN: 'admin',
});

const loginSchema = {
  email: { type: 'string', required: true, format: 'email', maxLength: 255, lowercase: true },
  // Never trimmed or altered: passwords are compared exactly.
  password: { type: 'string', required: true, maxLength: 128 },
};

const registerSchema = {
  name: { type: 'string', required: true, minLength: 2, maxLength: 120 },
  email: { type: 'string', required: true, format: 'email', maxLength: 255, lowercase: true },
  password: { type: 'string', required: true, minLength: 8, maxLength: 128 },
};

/** Public user shape — the password hash is never included. */
function toUserDTO(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

module.exports = { ROLES, loginSchema, registerSchema, toUserDTO };
