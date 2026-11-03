/**
 * Tests for the persistent email queue and worker logic (real PostgreSQL).
 * Delivery is replaced by a test function so no real emails are sent.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { resetAndSeed, orderInput, sql, closePool } = require('./helpers');
const { emailJobService, orderService } = require('../src/services');
const { emailJobRepository } = require('../src/data');
const { renderEmail } = require('../src/templates');
const { createEmailWorker } = require('../src/workers/emailWorker');

let fixtures;

const enqueueTestJob = (recipientEmail = 'buyer@test.local') =>
  emailJobService.enqueueEmail({
    emailType: 'order_confirmation',
    recipientEmail,
    payload: { orderNumber: 'SF-TEST-1', customerName: 'Test Buyer', items: [], subtotal: 10, shipping: 0, total: 10, shippingAddress: {} },
  });

/** Makes every waiting job due now (skips the retry delay). */
const makeJobsDue = () => sql("UPDATE email_jobs SET next_attempt_at = NOW() WHERE status = 'pending'");

test.beforeEach(async () => {
  fixtures = await resetAndSeed();
});
test.after(closePool);

test('a pending job is sent and marked as sent', async () => {
  const job = await enqueueTestJob();
  const delivered = [];
  const summary = await emailJobService.processDueJobs({
    workerId: 'worker-a',
    deliver: async (claimed) => {
      delivered.push(claimed.id);
      return { providerMessageId: 'msg_123' };
    },
  });

  assert.deepEqual(summary, { claimed: 1, sent: 1, retried: 0, failed: 0 });
  assert.deepEqual(delivered, [job.id]);
  const saved = await emailJobRepository.findById(job.id);
  assert.equal(saved.status, 'sent');
  assert.equal(saved.attempts, 1);
  assert.equal(saved.provider_message_id, 'msg_123');
  assert.ok(saved.processed_at);
  assert.equal(saved.locked_by, null);
});

test('a failed job is retried with a delay, then marked failed after the maximum attempts', async () => {
  const job = await enqueueTestJob();
  const failingDelivery = async () => {
    throw new Error('Resend is temporarily unavailable');
  };

  // Attempt 1 fails -> back to pending with a future next_attempt_at.
  let summary = await emailJobService.processDueJobs({ workerId: 'w', deliver: failingDelivery });
  assert.equal(summary.retried, 1);
  let saved = await emailJobRepository.findById(job.id);
  assert.equal(saved.status, 'pending');
  assert.equal(saved.attempts, 1);
  assert.match(saved.last_error, /temporarily unavailable/);
  assert.ok(new Date(saved.next_attempt_at) > new Date());

  // Not due yet: the worker must not pick it up again immediately.
  summary = await emailJobService.processDueJobs({ workerId: 'w', deliver: failingDelivery });
  assert.equal(summary.claimed, 0);

  // Attempts 2 and 3 fail -> still pending (retries 1 and 2).
  for (let attempt = 2; attempt <= 3; attempt += 1) {
    await makeJobsDue();
    await emailJobService.processDueJobs({ workerId: 'w', deliver: failingDelivery });
    saved = await emailJobRepository.findById(job.id);
    assert.equal(saved.status, 'pending');
    assert.equal(saved.attempts, attempt);
  }

  // Attempt 4 (3rd retry) fails -> permanently failed.
  await makeJobsDue();
  summary = await emailJobService.processDueJobs({ workerId: 'w', deliver: failingDelivery });
  assert.equal(summary.failed, 1);
  saved = await emailJobRepository.findById(job.id);
  assert.equal(saved.status, 'failed');
  assert.equal(saved.attempts, 4);
  assert.ok(saved.processed_at);
});

test('a job that succeeds on a retry ends up sent', async () => {
  const job = await enqueueTestJob();
  let calls = 0;
  const flakyDelivery = async () => {
    calls += 1;
    if (calls === 1) throw new Error('timeout');
    return { providerMessageId: 'msg_retry' };
  };
  await emailJobService.processDueJobs({ workerId: 'w', deliver: flakyDelivery });
  await makeJobsDue();
  await emailJobService.processDueJobs({ workerId: 'w', deliver: flakyDelivery });

  const saved = await emailJobRepository.findById(job.id);
  assert.equal(saved.status, 'sent');
  assert.equal(saved.attempts, 2);
});

test('retry delays grow exponentially', () => {
  assert.equal(emailJobService.getRetryDelayMs(1, 30000), 30000);
  assert.equal(emailJobService.getRetryDelayMs(2, 30000), 120000);
  assert.equal(emailJobService.getRetryDelayMs(3, 30000), 480000);
});

test('concurrent workers never claim the same job', async () => {
  for (let i = 0; i < 20; i += 1) await enqueueTestJob(`buyer${i}@test.local`);

  const claims = await Promise.all(
    ['w1', 'w2', 'w3', 'w4'].map((workerId) => emailJobRepository.claimDueJobs({ limit: 8, workerId })),
  );
  const ids = claims.flat().map((job) => job.id);
  assert.equal(ids.length, 20);
  assert.equal(new Set(ids).size, 20, 'a job was claimed twice');
});

test('jobs abandoned by a crashed worker are released and can be processed', async () => {
  const job = await enqueueTestJob();
  // Simulate a worker that claimed the job and then crashed.
  await emailJobRepository.claimDueJobs({ limit: 10, workerId: 'crashed-worker' });
  await sql("UPDATE email_jobs SET locked_at = NOW() - INTERVAL '10 minutes' WHERE id = $1", [job.id]);

  const released = await emailJobService.recoverStaleJobs(5 * 60 * 1000);
  assert.equal(released, 1);

  // The crashed worker can no longer finish a job it lost.
  assert.equal(await emailJobRepository.markSent(job.id, 'crashed-worker', 'late'), null);

  const summary = await emailJobService.processDueJobs({ workerId: 'healthy', deliver: async () => ({ providerMessageId: 'ok' }) });
  assert.equal(summary.sent, 1);
  const saved = await emailJobRepository.findById(job.id);
  assert.equal(saved.status, 'sent');
  assert.equal(saved.attempts, 2);
});

test('a job that cannot be rendered fails immediately without retries', async () => {
  const [job] = await sql(
    `INSERT INTO email_jobs (recipient_email, email_type, payload)
     VALUES ('x@test.local', 'order_status_update', '{"status":"unknown"}') RETURNING id`,
  );
  // Use the real delivery function: rendering fails before Resend is called.
  const { deliverEmailJob } = require('../src/services/emailDelivery.service');
  const summary = await emailJobService.processDueJobs({ workerId: 'w', deliver: deliverEmailJob });
  assert.equal(summary.failed, 1);
  const saved = await emailJobRepository.findById(job.id);
  assert.equal(saved.status, 'failed');
  assert.equal(saved.attempts, 1);
});

test('the worker processes the job created by a real checkout', async () => {
  await orderService.placeOrder(orderInput([{ productId: fixtures.products.tee.id, quantity: 1 }]));
  const sentTo = [];
  const worker = createEmailWorker({
    deliver: async (job) => {
      // Render the real template to be sure the payload is complete.
      const message = renderEmail(job.email_type, job.payload);
      assert.match(message.subject, /Order confirmed/);
      sentTo.push(job.recipient_email);
      return { providerMessageId: 'msg_worker' };
    },
    logger: { log: () => {}, error: () => {} },
  });
  await worker.runOnce();
  assert.deepEqual(sentTo, ['casey@test.local']);
  const [job] = await sql('SELECT status FROM email_jobs');
  assert.equal(job.status, 'sent');
});

test('email templates escape customer-provided text', () => {
  const { html, subject, text } = renderEmail('order_status_update', {
    orderNumber: 'SF-1',
    customerName: '<script>alert(1)</script>',
    status: 'shipped',
    previousStatus: 'confirmed',
    items: [{ productName: 'Mug & Cup', quantity: 1, unitPrice: 12, lineTotal: 12 }],
    subtotal: 12,
    shipping: 7.95,
    total: 19.95,
    shippingAddress: { line1: '1 Road', city: 'Town', postalCode: '1', country: 'US' },
  });
  assert.equal(subject, 'Your order SF-1 is shipped');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Mug &amp; Cup'));
  assert.ok(html.includes('$19.95'));
  assert.match(text, /SF-1 is now shipped/);
});
