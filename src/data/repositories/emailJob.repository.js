/**
 * Email job queue queries.
 *
 * The queue lives in the email_jobs table. Workers "claim" jobs with
 * SELECT ... FOR UPDATE SKIP LOCKED: rows already locked by another worker
 * are skipped, so two workers can never process the same job at once.
 */
const { query } = require('../db');

async function create({ recipientEmail, emailType, payload, maxAttempts }, executor) {
  const { rows } = await query(
    `INSERT INTO email_jobs (recipient_email, email_type, payload, max_attempts)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [recipientEmail, emailType, JSON.stringify(payload), maxAttempts],
    executor,
  );
  return rows[0];
}

/**
 * Atomically claims up to `limit` due jobs for `workerId`:
 * marks them as processing, records the lock and counts the attempt.
 */
async function claimDueJobs({ limit, workerId }) {
  const { rows } = await query(
    `WITH due AS (
       SELECT id
         FROM email_jobs
        WHERE status = 'pending' AND next_attempt_at <= NOW()
        ORDER BY next_attempt_at ASC, id ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
     )
     UPDATE email_jobs j
        SET status = 'processing',
            locked_at = NOW(),
            locked_by = $2,
            attempts = j.attempts + 1
       FROM due
      WHERE j.id = due.id
     RETURNING j.*`,
    [limit, workerId],
  );
  return rows;
}

// The "AND locked_by = $2" condition below makes sure a worker can only
// finish a job it still owns (not one that was released after a timeout).

async function markSent(id, workerId, providerMessageId) {
  const { rows } = await query(
    `UPDATE email_jobs
        SET status = 'sent', provider_message_id = $3, last_error = NULL,
            processed_at = NOW(), locked_at = NULL, locked_by = NULL
      WHERE id = $1 AND locked_by = $2 AND status = 'processing'
      RETURNING *`,
    [id, workerId, providerMessageId],
  );
  return rows[0] || null;
}

async function scheduleRetry(id, workerId, errorMessage, delayMs) {
  const { rows } = await query(
    `UPDATE email_jobs
        SET status = 'pending', last_error = $3,
            next_attempt_at = NOW() + ($4::int * INTERVAL '1 millisecond'),
            locked_at = NULL, locked_by = NULL
      WHERE id = $1 AND locked_by = $2 AND status = 'processing'
      RETURNING *`,
    [id, workerId, errorMessage, delayMs],
  );
  return rows[0] || null;
}

async function markFailed(id, workerId, errorMessage) {
  const { rows } = await query(
    `UPDATE email_jobs
        SET status = 'failed', last_error = $3, processed_at = NOW(),
            locked_at = NULL, locked_by = NULL
      WHERE id = $1 AND locked_by = $2 AND status = 'processing'
      RETURNING *`,
    [id, workerId, errorMessage],
  );
  return rows[0] || null;
}

/**
 * Recovers jobs left in "processing" by a worker that crashed or was killed.
 * Jobs with attempts left go back to pending; the rest are marked failed.
 */
async function releaseStaleJobs(lockTimeoutMs) {
  const { rows } = await query(
    `UPDATE email_jobs
        SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
            last_error = COALESCE(last_error, 'Worker stopped before finishing the job'),
            processed_at = CASE WHEN attempts >= max_attempts THEN NOW() ELSE NULL END,
            next_attempt_at = NOW(),
            locked_at = NULL,
            locked_by = NULL
      WHERE status = 'processing'
        AND locked_at < NOW() - ($1::int * INTERVAL '1 millisecond')
      RETURNING *`,
    [lockTimeoutMs],
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM email_jobs WHERE id = $1', [id]);
  return rows[0] || null;
}

async function countByStatus() {
  const { rows } = await query('SELECT status, COUNT(*)::int AS count FROM email_jobs GROUP BY status');
  return rows;
}

module.exports = {
  create,
  claimDueJobs,
  markSent,
  scheduleRetry,
  markFailed,
  releaseStaleJobs,
  findById,
  countByStatus,
};
