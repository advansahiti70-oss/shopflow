/**
 * Email job definitions used by the persistent email queue.
 */
const EMAIL_JOB_STATUS = Object.freeze({
  PENDING: 'pending', // waiting to be sent (new job or scheduled retry)
  PROCESSING: 'processing', // claimed by a worker right now
  SENT: 'sent', // delivered to Resend successfully
  FAILED: 'failed', // gave up after the maximum number of attempts
});

const EMAIL_TYPE = Object.freeze({
  ORDER_CONFIRMATION: 'order_confirmation',
  ORDER_STATUS_UPDATE: 'order_status_update',
});

function toEmailJobDTO(row) {
  return {
    id: row.id,
    recipientEmail: row.recipient_email,
    emailType: row.email_type,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lastError: row.last_error,
    nextAttemptAt: row.next_attempt_at,
    providerMessageId: row.provider_message_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    processedAt: row.processed_at,
  };
}

module.exports = { EMAIL_JOB_STATUS, EMAIL_TYPE, toEmailJobDTO };
