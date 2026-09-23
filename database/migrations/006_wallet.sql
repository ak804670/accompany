CREATE TABLE acc.m_wallets (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  currency_type TEXT NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_m_wallets PRIMARY KEY (id),
  CONSTRAINT fk_m_wallets_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_m_wallets_user_currency UNIQUE (user_id, currency_type),
  CONSTRAINT chk_m_wallets_currency CHECK (currency_type IN ('coins')),
  CONSTRAINT chk_m_wallets_balance_non_negative CHECK (balance >= 0),
  CONSTRAINT chk_m_wallets_status CHECK (status IN ('active', 'frozen'))
);

CREATE TRIGGER trg_m_wallets_set_updated_at
BEFORE UPDATE ON acc.m_wallets
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.t_ledger_transactions (
  id UUID DEFAULT gen_random_uuid(),
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT pk_t_ledger_transactions PRIMARY KEY (id),
  CONSTRAINT uq_t_ledger_transactions_reference UNIQUE (reference_type, reference_id, transaction_type),
  CONSTRAINT chk_t_ledger_transactions_type CHECK (
    transaction_type IN (
      'coin_purchase',
      'message_debit',
      'message_credit',
      'voice_call_debit',
      'voice_call_credit',
      'video_call_debit',
      'video_call_credit',
      'refund',
      'adjustment',
      'bonus',
      'withdrawal'
    )
  ),
  CONSTRAINT chk_t_ledger_transactions_status CHECK (status IN ('pending', 'completed', 'failed', 'reversed'))
);

CREATE TABLE acc.t_ledger_entries (
  id UUID DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  wallet_id UUID NOT NULL,
  entry_type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_t_ledger_entries PRIMARY KEY (id),
  CONSTRAINT fk_t_ledger_entries_t_ledger_transactions FOREIGN KEY (transaction_id) REFERENCES acc.t_ledger_transactions (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_ledger_entries_m_wallets FOREIGN KEY (wallet_id) REFERENCES acc.m_wallets (id) ON DELETE RESTRICT,
  CONSTRAINT chk_t_ledger_entries_type CHECK (entry_type IN ('debit', 'credit')),
  CONSTRAINT chk_t_ledger_entries_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_t_ledger_entries_transaction_id
  ON acc.t_ledger_entries (transaction_id);

CREATE INDEX idx_t_ledger_entries_wallet_created
  ON acc.t_ledger_entries (wallet_id, created_at DESC);
