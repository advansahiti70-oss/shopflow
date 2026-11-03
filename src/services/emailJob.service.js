/**
 * Email queue business logic.
 *
 * - enqueueEmail() is called by other services *inside their transaction*,
 *   so an email job exists if and only if the business change was saved.
 * - processDueJobs() is called by the background worker. It claims jobs,
 *   delivers them and records the result, scheduling retries on failure.
 */
const config = require('../config');
const { emailJobRepository } = require('../data');
const { EMAIL_TYPE } = require('../models');
const emailDelivery = require('./emailDelivery.service');

const KNOWN_TYPES = Object.values(EMAIL_TYPE);
const MAX_ERROR_LENGTH = 1000;

/** Creates a pending email job. Pass the transaction client as `executor`. */
async function enqueueEmail({ emailType, recipientEmail, payload }, executor) {
  if (!KNOWN_TYPES.includes(emailType)) throw new Error(`Unknown email type: ${emailType}`);
  return emailJobRepository.create(
    { emailType, recipientEmail, payload, maxAttempts: config.worker.maxAttempts },
    executor,
  );
}

/**
 * Delay before the next attempt grows exponentially:
 * attempt 1 failed -> 30s, attempt 2 -> 2 min, attempt 3 -> 8 min (with the default base).
 */
function getRetryDelayMs(attemptNumber, baseDelayMs = config.worker.retryBaseDelayMs) {
  return baseDelayMs * 4 ** Math.max(0, attemptNumber - 1);
}

function describeError(error) {
  const message = error && error.message ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

/** Records the outcome of one delivery attempt. */
async function handleFailure(job, workerId, error) {
  const message = describeError(error);
  const attemptsLeft = job.attempts < job.max_attempts;

  if (attemptsLeft && !error.permanent) {
    const delayMs = getRetryDelayMs(job.attempts);
    await emailJobRepository.scheduleRetry(job.id, workerId, message, delayMs);
    return { outcome: 'retry', delayMs, error: message };
  }
  await emailJobRepository.markFailed(job.id, workerId, message);
  return { outcome: 'failed', error: message };
}

/**
 * Claims up to `batchSize` due jobs and processes them one by one.
 * `deliver` sends a single job and resolves with { providerMessageId };
 * it defaults to the real Resend delivery and can be replaced in tests.
 */
async function processDueJobs({
  workerId,
  batchSize = config.worker.batchSize,
  deliver = emailDelivery.deliverEmailJob,
  log = () => {},
} = {}) {
  const jobs = await emailJobRepository.claimDueJobs({ limit: batchSize, workerId });
  const summary = { claimed: jobs.length, sent: 0, retried: 0, failed: 0 };

  for (const job of jobs) {
    try {
      const { providerMessageId } = await deliver(job);
      await emailJobRepository.markSent(job.id, workerId, providerMessageId || null);
      summary.sent += 1;
      log(`job #${job.id} (${job.email_type}) sent to ${job.recipient_email}`);
    } catch (error) {
      const result = await handleFailure(job, workerId, error);
      if (result.outcome === 'retry') {
        summary.retried += 1;
        log(`job #${job.id} attempt ${job.attempts}/${job.max_attempts} failed, retrying in ${Math.round(result.delayMs / 1000)}s: ${result.error}`);
      } else {
        summary.failed += 1;
        log(`job #${job.id} failed permanently after ${job.attempts} attempt(s): ${result.error}`);
      }
    }
  }
  return summary;
}

/** Releases jobs abandoned by crashed workers. Returns how many were released. */
async function recoverStaleJobs(lockTimeoutMs = config.worker.lockTimeoutMs) {
  const released = await emailJobRepository.releaseStaleJobs(lockTimeoutMs);
  return released.length;
}

async function getQueueStats() {
  const rows = await emailJobRepository.countByStatus();
  return Object.fromEntries(rows.map((row) => [row.status, row.count]));
}

module.exports = { enqueueEmail, processDueJobs, recoverStaleJobs, getRetryDelayMs, getQueueStats };
