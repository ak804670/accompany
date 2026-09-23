CREATE TABLE acc.m_coin_packages (
  id UUID DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coins BIGINT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_m_coin_packages PRIMARY KEY (id),
  CONSTRAINT chk_m_coin_packages_coins CHECK (coins > 0),
  CONSTRAINT chk_m_coin_packages_price CHECK (price >= 0),
  CONSTRAINT chk_m_coin_packages_status CHECK (status IN ('active', 'inactive')),
  CONSTRAINT chk_m_coin_packages_display_order CHECK (display_order >= 0),
  CONSTRAINT chk_m_coin_packages_currency CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE TRIGGER trg_m_coin_packages_set_updated_at
BEFORE UPDATE ON acc.m_coin_packages
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.t_payment_transactions (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  idempotency_key TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT pk_t_payment_transactions PRIMARY KEY (id),
  CONSTRAINT fk_t_payment_transactions_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_t_payment_transactions_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT chk_t_payment_transactions_amount CHECK (amount > 0),
  CONSTRAINT chk_t_payment_transactions_currency CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_t_payment_transactions_status CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')
  )
);

CREATE UNIQUE INDEX uq_t_payment_transactions_provider_txn
  ON acc.t_payment_transactions (provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX idx_t_payment_transactions_user_created
  ON acc.t_payment_transactions (user_id, created_at DESC);

CREATE TRIGGER trg_t_payment_transactions_set_updated_at
BEFORE UPDATE ON acc.t_payment_transactions
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.t_coin_purchases (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  package_id UUID NOT NULL,
  payment_transaction_id UUID NOT NULL,
  coins BIGINT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT pk_t_coin_purchases PRIMARY KEY (id),
  CONSTRAINT fk_t_coin_purchases_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_coin_purchases_m_coin_packages FOREIGN KEY (package_id) REFERENCES acc.m_coin_packages (id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_coin_purchases_t_payment_transactions FOREIGN KEY (payment_transaction_id) REFERENCES acc.t_payment_transactions (id) ON DELETE RESTRICT,
  CONSTRAINT uq_t_coin_purchases_payment UNIQUE (payment_transaction_id),
  CONSTRAINT chk_t_coin_purchases_coins CHECK (coins > 0),
  CONSTRAINT chk_t_coin_purchases_amount CHECK (amount > 0),
  CONSTRAINT chk_t_coin_purchases_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

CREATE INDEX idx_t_coin_purchases_user_created
  ON acc.t_coin_purchases (user_id, created_at DESC);
