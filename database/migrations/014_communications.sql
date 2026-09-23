ALTER TABLE acc.otp_verifications
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'otp',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE acc.otp_verifications
  DROP CONSTRAINT IF EXISTS chk_otp_verifications_purpose;

ALTER TABLE acc.otp_verifications
  ADD CONSTRAINT chk_otp_verifications_purpose CHECK (purpose IN ('otp'));

ALTER TABLE acc.otp_verifications
  DROP CONSTRAINT IF EXISTS chk_otp_verifications_status;

ALTER TABLE acc.otp_verifications
  ADD CONSTRAINT chk_otp_verifications_status CHECK (status IN ('pending', 'verified', 'expired', 'locked'));

ALTER TABLE acc.outbox_events
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_outbox_events_idempotency_key
  ON acc.outbox_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outbox_events_available
  ON acc.outbox_events (available_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS acc.communication_logs (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID,
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  purpose TEXT NOT NULL,
  recipient TEXT NOT NULL,
  provider_message_id TEXT,
  provider_status TEXT,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  CONSTRAINT pk_communication_logs PRIMARY KEY (id),
  CONSTRAINT uq_communication_logs_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT chk_communication_logs_channel CHECK (channel IN ('email', 'sms')),
  CONSTRAINT chk_communication_logs_purpose CHECK (
    purpose IN ('otp', 'welcome', 'security', 'notification', 'transactional')
  ),
  CONSTRAINT chk_communication_logs_status CHECK (
    status IN ('queued', 'sending', 'sent', 'delivered', 'failed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_logs_provider_message
  ON acc.communication_logs (provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communication_logs_channel_created
  ON acc.communication_logs (channel, created_at DESC);

DO $$
BEGIN
  ALTER TABLE acc.communication_logs
    ADD CONSTRAINT fk_communication_logs_m_users
    FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
