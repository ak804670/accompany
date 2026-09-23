-- Call coins from a snapshotted per-minute rate and billable seconds.
-- ceil_minute: 125s at 10 coins/min = 30
-- floor_minute: 125s at 10 coins/min = 20
-- per_second: 125s at 10 coins/min = 21 (half up)
-- Installed default is ceil_minute. Grace seconds are subtracted before this runs.
CREATE FUNCTION acc.billable_coins(
  rate_coins BIGINT,
  billable_seconds BIGINT,
  rounding_mode TEXT
) RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE rounding_mode
    WHEN 'ceil_minute' THEN rate_coins * ((billable_seconds + 59) / 60)
    WHEN 'floor_minute' THEN rate_coins * (billable_seconds / 60)
    WHEN 'per_second' THEN (rate_coins * billable_seconds + 30) / 60
  END
$$;

CREATE TABLE acc.m_billing_policies (
  id UUID DEFAULT gen_random_uuid(),
  communication_type TEXT NOT NULL,
  rounding_mode TEXT NOT NULL,
  grace_seconds INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_m_billing_policies PRIMARY KEY (id),
  CONSTRAINT chk_m_billing_policies_type CHECK (communication_type IN ('message', 'voice_call', 'video_call')),
  CONSTRAINT chk_m_billing_policies_rounding CHECK (
    (communication_type = 'message' AND rounding_mode = 'per_message')
    OR (
      communication_type IN ('voice_call', 'video_call')
      AND rounding_mode IN ('ceil_minute', 'floor_minute', 'per_second')
    )
  ),
  CONSTRAINT chk_m_billing_policies_grace CHECK (grace_seconds >= 0)
);

CREATE UNIQUE INDEX uq_m_billing_policies_active
  ON acc.m_billing_policies (communication_type)
  WHERE is_active;

CREATE TRIGGER trg_m_billing_policies_set_updated_at
BEFORE UPDATE ON acc.m_billing_policies
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

-- quantity is 1 message, or billable seconds for a call (after grace).
-- rate and rounding_mode are copies of the policy used for this event.
CREATE TABLE acc.t_billing_events (
  id UUID DEFAULT gen_random_uuid(),
  communication_type TEXT NOT NULL,
  communication_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payer_user_id UUID NOT NULL,
  companion_user_id UUID NOT NULL,
  billing_policy_id UUID NOT NULL,
  rate BIGINT NOT NULL,
  quantity BIGINT NOT NULL,
  rounding_mode TEXT NOT NULL,
  coins BIGINT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT pk_t_billing_events PRIMARY KEY (id),
  CONSTRAINT fk_t_billing_events_payer FOREIGN KEY (payer_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_billing_events_companion FOREIGN KEY (companion_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_billing_events_m_billing_policies FOREIGN KEY (billing_policy_id) REFERENCES acc.m_billing_policies (id) ON DELETE RESTRICT,
  CONSTRAINT uq_t_billing_events_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT chk_t_billing_events_not_self CHECK (payer_user_id <> companion_user_id),
  CONSTRAINT chk_t_billing_events_type CHECK (communication_type IN ('message', 'voice_call', 'video_call')),
  CONSTRAINT chk_t_billing_events_event_type CHECK (length(btrim(event_type)) > 0),
  CONSTRAINT chk_t_billing_events_idempotency_key CHECK (length(btrim(idempotency_key)) > 0),
  CONSTRAINT chk_t_billing_events_rate CHECK (rate >= 0),
  CONSTRAINT chk_t_billing_events_quantity CHECK (quantity >= 0),
  CONSTRAINT chk_t_billing_events_message_quantity CHECK (communication_type <> 'message' OR quantity = 1),
  CONSTRAINT chk_t_billing_events_coins CHECK (coins >= 0),
  CONSTRAINT chk_t_billing_events_status CHECK (status IN ('pending', 'processed', 'failed')),
  CONSTRAINT chk_t_billing_events_coins_match CHECK (
    (
      communication_type = 'message'
      AND rounding_mode = 'per_message'
      AND coins = rate * quantity
    )
    OR (
      communication_type IN ('voice_call', 'video_call')
      AND rounding_mode IN ('ceil_minute', 'floor_minute', 'per_second')
      AND coins = acc.billable_coins(rate, quantity, rounding_mode)
    )
  )
);

CREATE INDEX idx_t_billing_events_communication
  ON acc.t_billing_events (communication_type, communication_id, created_at DESC);

CREATE INDEX idx_t_billing_events_pending
  ON acc.t_billing_events (created_at)
  WHERE status = 'pending';

CREATE TABLE acc.t_message_charges (
  id UUID DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  billing_event_id UUID NOT NULL,
  payer_user_id UUID NOT NULL,
  companion_user_id UUID NOT NULL,
  rate_coins BIGINT NOT NULL,
  coins_charged BIGINT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT pk_t_message_charges PRIMARY KEY (id),
  CONSTRAINT fk_t_message_charges_messages FOREIGN KEY (message_id) REFERENCES acc.messages (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_message_charges_t_billing_events FOREIGN KEY (billing_event_id) REFERENCES acc.t_billing_events (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_message_charges_payer FOREIGN KEY (payer_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_message_charges_companion FOREIGN KEY (companion_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_t_message_charges_message UNIQUE (message_id),
  CONSTRAINT uq_t_message_charges_billing_event UNIQUE (billing_event_id),
  CONSTRAINT uq_t_message_charges_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT chk_t_message_charges_not_self CHECK (payer_user_id <> companion_user_id),
  CONSTRAINT chk_t_message_charges_rate CHECK (rate_coins >= 0),
  CONSTRAINT chk_t_message_charges_coins CHECK (coins_charged = rate_coins),
  CONSTRAINT chk_t_message_charges_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  CONSTRAINT chk_t_message_charges_idempotency_key CHECK (length(btrim(idempotency_key)) > 0)
);

CREATE INDEX idx_t_message_charges_payer_created
  ON acc.t_message_charges (payer_user_id, created_at DESC);

CREATE INDEX idx_t_message_charges_companion_created
  ON acc.t_message_charges (companion_user_id, created_at DESC);

CREATE TABLE acc.t_voice_call_charges (
  id UUID DEFAULT gen_random_uuid(),
  voice_call_id UUID NOT NULL,
  billing_event_id UUID NOT NULL,
  payer_user_id UUID NOT NULL,
  companion_user_id UUID NOT NULL,
  rate_coins_per_minute BIGINT NOT NULL,
  billable_seconds BIGINT NOT NULL,
  rounding_mode TEXT NOT NULL,
  coins_charged BIGINT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT pk_t_voice_call_charges PRIMARY KEY (id),
  CONSTRAINT fk_t_voice_call_charges_voice_calls FOREIGN KEY (voice_call_id) REFERENCES acc.voice_calls (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_voice_call_charges_t_billing_events FOREIGN KEY (billing_event_id) REFERENCES acc.t_billing_events (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_voice_call_charges_payer FOREIGN KEY (payer_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_voice_call_charges_companion FOREIGN KEY (companion_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_t_voice_call_charges_billing_event UNIQUE (billing_event_id),
  CONSTRAINT uq_t_voice_call_charges_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT chk_t_voice_call_charges_not_self CHECK (payer_user_id <> companion_user_id),
  CONSTRAINT chk_t_voice_call_charges_rate CHECK (rate_coins_per_minute >= 0),
  CONSTRAINT chk_t_voice_call_charges_seconds CHECK (billable_seconds >= 0),
  CONSTRAINT chk_t_voice_call_charges_rounding CHECK (rounding_mode IN ('ceil_minute', 'floor_minute', 'per_second')),
  CONSTRAINT chk_t_voice_call_charges_coins CHECK (
    coins_charged = acc.billable_coins(rate_coins_per_minute, billable_seconds, rounding_mode)
  ),
  CONSTRAINT chk_t_voice_call_charges_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  CONSTRAINT chk_t_voice_call_charges_idempotency_key CHECK (length(btrim(idempotency_key)) > 0)
);

CREATE INDEX idx_t_voice_call_charges_call
  ON acc.t_voice_call_charges (voice_call_id, created_at DESC);

CREATE INDEX idx_t_voice_call_charges_payer_created
  ON acc.t_voice_call_charges (payer_user_id, created_at DESC);

CREATE TABLE acc.t_video_call_charges (
  id UUID DEFAULT gen_random_uuid(),
  video_call_id UUID NOT NULL,
  billing_event_id UUID NOT NULL,
  payer_user_id UUID NOT NULL,
  companion_user_id UUID NOT NULL,
  rate_coins_per_minute BIGINT NOT NULL,
  billable_seconds BIGINT NOT NULL,
  rounding_mode TEXT NOT NULL,
  coins_charged BIGINT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT pk_t_video_call_charges PRIMARY KEY (id),
  CONSTRAINT fk_t_video_call_charges_video_calls FOREIGN KEY (video_call_id) REFERENCES acc.video_calls (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_video_call_charges_t_billing_events FOREIGN KEY (billing_event_id) REFERENCES acc.t_billing_events (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_video_call_charges_payer FOREIGN KEY (payer_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_video_call_charges_companion FOREIGN KEY (companion_user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_t_video_call_charges_billing_event UNIQUE (billing_event_id),
  CONSTRAINT uq_t_video_call_charges_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT chk_t_video_call_charges_not_self CHECK (payer_user_id <> companion_user_id),
  CONSTRAINT chk_t_video_call_charges_rate CHECK (rate_coins_per_minute >= 0),
  CONSTRAINT chk_t_video_call_charges_seconds CHECK (billable_seconds >= 0),
  CONSTRAINT chk_t_video_call_charges_rounding CHECK (rounding_mode IN ('ceil_minute', 'floor_minute', 'per_second')),
  CONSTRAINT chk_t_video_call_charges_coins CHECK (
    coins_charged = acc.billable_coins(rate_coins_per_minute, billable_seconds, rounding_mode)
  ),
  CONSTRAINT chk_t_video_call_charges_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  CONSTRAINT chk_t_video_call_charges_idempotency_key CHECK (length(btrim(idempotency_key)) > 0)
);

CREATE INDEX idx_t_video_call_charges_call
  ON acc.t_video_call_charges (video_call_id, created_at DESC);

CREATE INDEX idx_t_video_call_charges_payer_created
  ON acc.t_video_call_charges (payer_user_id, created_at DESC);

ALTER TABLE acc.messages
  ADD CONSTRAINT fk_messages_t_ledger_transactions
  FOREIGN KEY (billing_transaction_id) REFERENCES acc.t_ledger_transactions (id) ON DELETE RESTRICT;
