/**
 * Tests for GET /health.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { config, closePool, resetAndSeed } = require('./helpers');
const { createApp } = require('../src/api/app');

const app = createApp();

test.before(resetAndSeed);
test.after(closePool);

test('returns 200 with app and database status when healthy', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.checks.app.status, 'up');
  assert.equal(res.body.checks.database.status, 'up');
  assert.equal(typeof res.body.checks.database.latencyMs, 'number');
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('returns 503 when the database is unreachable, without leaking details', async () => {
  const realUrl = config.database.url;
  await closePool();
  // Nothing listens on port 1, so connections are refused immediately.
  config.database.url = 'postgres://secret_user:secret_pass@127.0.0.1:1/missing_db';
  try {
    const res = await request(app).get('/health');
    assert.equal(res.status, 503);
    assert.equal(res.body.status, 'error');
    assert.equal(res.body.checks.app.status, 'up');
    assert.equal(res.body.checks.database.status, 'down');
    const body = JSON.stringify(res.body);
    assert.ok(!body.includes('secret'), 'health response must not expose credentials');
    assert.ok(!body.includes('127.0.0.1'));
  } finally {
    await closePool();
    config.database.url = realUrl;
  }

  const recovered = await request(app).get('/health');
  assert.equal(recovered.status, 200);
});
