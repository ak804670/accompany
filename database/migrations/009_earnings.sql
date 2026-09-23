CREATE TABLE acc.t_companion_earnings (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  ledger_transaction_id UUID NOT NULL,
  gross_coins BIGINT NOT NULL,
  platform_fee_coins BIGINT NOT NULL,
  net_coins BIGINT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  available_at TIMESTAMPTZ,
  CONSTRAINT pk_t_companion_earnings PRIMARY KEY (id),
  CONSTRAINT fk_t_companion_earnings_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_companion_earnings_t_ledger_transactions FOREIGN KEY (ledger_transaction_id) REFERENCES acc.t_ledger_transactions (id) ON DELETE RESTRICT,
  CONSTRAINT uq_t_companion_earnings_source UNIQUE (source_type, source_id),
  CONSTRAINT uq_t_companion_earnings_ledger UNIQUE (ledger_transaction_id),
  CONSTRAINT chk_t_companion_earnings_source_type CHECK (
    source_type IN ('message_charge', 'voice_call_charge', 'video_call_charge')
  ),
  CONSTRAINT chk_t_companion_earnings_gross CHECK (gross_coins >= 0),
  CONSTRAINT chk_t_companion_earnings_fee CHECK (platform_fee_coins >= 0),
  CONSTRAINT chk_t_companion_earnings_net CHECK (net_coins >= 0),
  CONSTRAINT chk_t_companion_earnings_net_equation CHECK (net_coins = gross_coins - platform_fee_coins),
  CONSTRAINT chk_t_companion_earnings_status CHECK (status IN ('pending', 'available', 'paid', 'reversed'))
);

CREATE INDEX idx_t_companion_earnings_user_created
  ON acc.t_companion_earnings (user_id, created_at DESC);

CREATE TABLE acc.t_withdrawals (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT,
  provider_reference TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  CONSTRAINT pk_t_withdrawals PRIMARY KEY (id),
  CONSTRAINT fk_t_withdrawals_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_t_withdrawals_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT chk_t_withdrawals_amount CHECK (amount > 0),
  CONSTRAINT chk_t_withdrawals_currency CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_t_withdrawals_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

CREATE UNIQUE INDEX uq_t_withdrawals_provider_reference
  ON acc.t_withdrawals (provider, provider_reference)
  WHERE provider IS NOT NULL AND provider_reference IS NOT NULL;

CREATE INDEX idx_t_withdrawals_user_requested
  ON acc.t_withdrawals (user_id, requested_at DESC);
