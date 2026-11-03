/**
 * Sends a single email job through Resend.
 *
 * Only the background worker calls this module — never an HTTP request.
 */
const { Resend } = require('resend');
const config = require('../config');
const { renderEmail } = require('../templates');

let client = null;

function getResendClient() {
  if (!config.email.resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  if (!client) client = new Resend(config.email.resendApiKey);
  return client;
}

/**
 * Renders the job's template and sends it.
 * Resolves with { providerMessageId }; throws on any failure so the queue
 * can schedule a retry.
 */
async function deliverEmailJob(job) {
  let message;
  try {
    message = renderEmail(job.email_type, job.payload);
  } catch (error) {
    // A job that cannot be rendered will never succeed: do not retry it.
    error.permanent = true;
    throw error;
  }

  const { data, error } = await getResendClient().emails.send(
    {
      from: config.email.from,
      to: [job.recipient_email],
      replyTo: config.email.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: 'email_type', value: job.email_type }],
    },
    // The same key on every attempt of this job: if a previous attempt reached
    // Resend but the worker crashed before saving the result, Resend will not
    // send the email a second time.
    { idempotencyKey: `shopflow-email-job-${job.id}` },
  );

  if (error) {
    const deliveryError = new Error(`Resend error (${error.name}): ${error.message}`);
    deliveryError.providerCode = error.name;
    throw deliveryError;
  }
  return { providerMessageId: data && data.id };
}

module.exports = { deliverEmailJob };
