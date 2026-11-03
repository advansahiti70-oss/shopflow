-- 004: email_jobs — a persistent queue processed by the background worker

CREATE TABLE email_jobs (
  id               SERIAL PRIMARY KEY,
  recipient_email  VARCHAR(255) NOT NULL,
  email_type       VARCHAR(50)  NOT NULL,
  -- Everything the template needs to render the email.
  payload          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending',
  attempts         INTEGER      NOT NULL DEFAULT 0,
  max_attempts     INTEGER      NOT NULL DEFAULT 4,
  last_error       TEXT,
  -- The job is not picked up before this time (used for retry delays).
  next_attempt_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Set while a worker holds the job; used to detect crashed workers.
  locked_at        TIMESTAMPTZ,
  locked_by        VARCHAR(100),
  provider_message_id VARCHAR(100),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  processed_at     TIMESTAMPTZ,
  CONSTRAINT email_jobs_status_check CHECK (
    status IN ('pending', 'processing', 'sent', 'failed')
  ),
  CONSTRAINT email_jobs_type_check CHECK (
    email_type IN ('order_confirmation', 'order_status_update')
  ),
  CONSTRAINT email_jobs_attempts_check CHECK (attempts >= 0 AND max_attempts > 0)
);

-- The worker's main query: "pending jobs that are due, oldest first".
CREATE INDEX email_jobs_pending_idx ON email_jobs (next_attempt_at)
  WHERE status = 'pending';
-- Finding jobs abandoned by a crashed worker.
CREATE INDEX email_jobs_processing_idx ON email_jobs (locked_at)
  WHERE status = 'processing';

CREATE TRIGGER email_jobs_set_updated_at
  BEFORE UPDATE ON email_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
