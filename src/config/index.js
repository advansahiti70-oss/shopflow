/**
 * Central configuration.
 *
 * Every setting is read from environment variables (loaded from .env in
 * development). The rest of the code imports this object instead of
 * touching process.env directly, so all configuration lives in one place.
 */
require('dotenv').config({ quiet: true });

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }
  return value;
}

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';

const config = {
  env,
  isProduction: env === 'production',
  isTest,
  port: intFromEnv('PORT', 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  database: {
    // Tests run against a separate database so they never touch real data.
    url: isTest
      ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
      : process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true',
    poolMax: intFromEnv('DATABASE_POOL_MAX', 10),
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
    bcryptRounds: intFromEnv('BCRYPT_ROUNDS', isTest ? 4 : 12),
  },

  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || 'Store Administrator',
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || 'ShopFlow <onboarding@resend.dev>',
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
  },

  worker: {
    pollIntervalMs: intFromEnv('EMAIL_WORKER_POLL_INTERVAL_MS', 5000),
    batchSize: intFromEnv('EMAIL_WORKER_BATCH_SIZE', 10),
    maxAttempts: intFromEnv('EMAIL_MAX_ATTEMPTS', 4),
    retryBaseDelayMs: intFromEnv('EMAIL_RETRY_BASE_DELAY_MS', 30000),
    lockTimeoutMs: intFromEnv('EMAIL_JOB_LOCK_TIMEOUT_MS', 300000),
    runInProcess: process.env.RUN_WORKER_IN_PROCESS === 'true',
  },
};

/** Fail fast on startup when a required setting is missing. */
function assertRequired(keys) {
  const missing = keys.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

config.assertRequired = assertRequired;

module.exports = config;
