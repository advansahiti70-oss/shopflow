/**
 * Authentication: registration, login and JWT handling.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { userRepository } = require('../data');
const { ConflictError, UnauthorizedError, ROLES, toUserDTO } = require('../models');

// Used when the email does not exist, so a login attempt takes the same time
// whether or not the account exists (prevents discovering valid emails).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', config.auth.bcryptRounds);

function getJwtSecret() {
  if (!config.auth.jwtSecret) throw new Error('JWT_SECRET is not configured');
  return config.auth.jwtSecret;
}

function hashPassword(password) {
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

function issueToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, getJwtSecret(), {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

function buildAuthResult(userRow) {
  const user = toUserDTO(userRow);
  return { token: issueToken(user), user };
}

async function register({ name, email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new ConflictError('An account with this email already exists');

  try {
    const user = await userRepository.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: ROLES.CUSTOMER,
    });
    return buildAuthResult(user);
  } catch (error) {
    // Two simultaneous registrations with the same email: the unique index wins.
    if (error.code === '23505') throw new ConflictError('An account with this email already exists');
    throw error;
  }
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  const passwordMatches = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !passwordMatches) {
    // Same message for both cases so attackers cannot tell which part was wrong.
    throw new UnauthorizedError('Invalid email or password');
  }
  return buildAuthResult(user);
}

/** Verifies a JWT and returns the current user, or throws UnauthorizedError. */
async function authenticateToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    throw new UnauthorizedError('Your session is invalid or has expired. Please sign in again.');
  }
  const user = await userRepository.findById(Number(payload.sub));
  if (!user) throw new UnauthorizedError('Your account no longer exists');
  return toUserDTO(user);
}

module.exports = { register, login, authenticateToken, hashPassword, issueToken };
