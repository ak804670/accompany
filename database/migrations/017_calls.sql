CREATE TABLE acc.t_calls (
  id UUID DEFAULT gen_random_uuid(),
  conversation_id UUID,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  call_type TEXT NOT NULL,
  status TEXT NOT NULL,
  rate_snapshot BIGINT NOT NULL,
  room_name TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds BIGINT NOT NULL DEFAULT 0,
  end_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_t_calls PRIMARY KEY (id),
  CONSTRAINT fk_t_calls_caller FOREIGN KEY (caller_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_calls_receiver FOREIGN KEY (receiver_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_t_calls_room_name UNIQUE (room_name),
  CONSTRAINT chk_t_calls_not_self CHECK (caller_id <> receiver_id),
  CONSTRAINT chk_t_calls_type CHECK (call_type IN ('AUDIO', 'VIDEO')),
  CONSTRAINT chk_t_calls_status CHECK (
    status IN ('RINGING', 'ACCEPTED', 'CONNECTING', 'CONNECTED', 'ENDED', 'DECLINED', 'MISSED', 'CANCELLED', 'FAILED')
  ),
  CONSTRAINT chk_t_calls_rate CHECK (rate_snapshot >= 0),
  CONSTRAINT chk_t_calls_duration CHECK (duration_seconds >= 0)
);

CREATE INDEX idx_t_calls_caller_created ON acc.t_calls (caller_id, created_at DESC);
CREATE INDEX idx_t_calls_receiver_created ON acc.t_calls (receiver_id, created_at DESC);
CREATE INDEX idx_t_calls_conversation_created ON acc.t_calls (conversation_id, created_at DESC);
CREATE INDEX idx_t_calls_status_created ON acc.t_calls (status, created_at DESC);

CREATE UNIQUE INDEX uq_t_calls_caller_active
  ON acc.t_calls (caller_id)
  WHERE status IN ('RINGING', 'ACCEPTED', 'CONNECTING', 'CONNECTED');

CREATE UNIQUE INDEX uq_t_calls_receiver_active
  ON acc.t_calls (receiver_id)
  WHERE status IN ('RINGING', 'ACCEPTED', 'CONNECTING', 'CONNECTED');

CREATE TRIGGER trg_t_calls_set_updated_at
BEFORE UPDATE ON acc.t_calls
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.t_call_billing (
  call_id UUID NOT NULL,
  rate BIGINT NOT NULL,
  billing_unit TEXT NOT NULL DEFAULT 'minute',
  billable_duration BIGINT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  amount_charged BIGINT NOT NULL DEFAULT 0,
  billing_status TEXT NOT NULL DEFAULT 'open',
  last_billed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_t_call_billing PRIMARY KEY (call_id),
  CONSTRAINT fk_t_call_billing_t_calls FOREIGN KEY (call_id) REFERENCES acc.t_calls (id) ON DELETE RESTRICT,
  CONSTRAINT chk_t_call_billing_rate CHECK (rate >= 0),
  CONSTRAINT chk_t_call_billing_duration CHECK (billable_duration >= 0),
  CONSTRAINT chk_t_call_billing_amounts CHECK (total_amount >= 0 AND amount_charged >= 0 AND amount_charged <= total_amount),
  CONSTRAINT chk_t_call_billing_status CHECK (billing_status IN ('open', 'settled', 'failed'))
);

CREATE INDEX idx_t_call_billing_status ON acc.t_call_billing (billing_status);

CREATE TRIGGER trg_t_call_billing_set_updated_at
BEFORE UPDATE ON acc.t_call_billing
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.t_call_charges (
  id UUID DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL,
  period INTEGER NOT NULL,
  coins BIGINT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_t_call_charges PRIMARY KEY (id),
  CONSTRAINT fk_t_call_charges_t_calls FOREIGN KEY (call_id) REFERENCES acc.t_calls (id) ON DELETE RESTRICT,
  CONSTRAINT uq_t_call_charges_period UNIQUE (call_id, period),
  CONSTRAINT uq_t_call_charges_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT chk_t_call_charges_period CHECK (period >= 0),
  CONSTRAINT chk_t_call_charges_coins CHECK (coins >= 0)
);

CREATE INDEX idx_t_call_charges_call ON acc.t_call_charges (call_id);

CREATE TABLE acc.p_device_tokens (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_p_device_tokens PRIMARY KEY (id),
  CONSTRAINT fk_p_device_tokens_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_p_device_tokens_token UNIQUE (token),
  CONSTRAINT chk_p_device_tokens_platform CHECK (platform IN ('ios', 'android'))
);

CREATE INDEX idx_p_device_tokens_user_active
  ON acc.p_device_tokens (user_id, platform)
  WHERE is_active;

CREATE TRIGGER trg_p_device_tokens_set_updated_at
BEFORE UPDATE ON acc.p_device_tokens
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.t_call_webhook_events (
  id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  call_id UUID,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_t_call_webhook_events PRIMARY KEY (id),
  CONSTRAINT fk_t_call_webhook_events_t_calls FOREIGN KEY (call_id) REFERENCES acc.t_calls (id) ON DELETE RESTRICT
);
