ALTER TABLE acc.m_wallets
  ADD COLUMN held_coins BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN earned_coins BIGINT NOT NULL DEFAULT 0;

ALTER TABLE acc.m_wallets
  ADD CONSTRAINT chk_m_wallets_held_non_negative CHECK (held_coins >= 0),
  ADD CONSTRAINT chk_m_wallets_earned_non_negative CHECK (earned_coins >= 0),
  ADD CONSTRAINT chk_m_wallets_earned_within_balance CHECK (earned_coins <= balance);

ALTER TABLE acc.t_ledger_entries
  ADD COLUMN balance_before BIGINT,
  ADD COLUMN balance_after BIGINT;

ALTER TABLE acc.t_ledger_entries
  ADD CONSTRAINT chk_t_ledger_entries_balances CHECK (
    (balance_before IS NULL AND balance_after IS NULL)
    OR (balance_before >= 0 AND balance_after >= 0)
  );

ALTER TABLE acc.m_coin_packages
  ADD COLUMN price_minor BIGINT,
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE acc.m_coin_packages
SET price_minor = (price * 100)::bigint
WHERE price_minor IS NULL;

ALTER TABLE acc.m_coin_packages
  ALTER COLUMN price_minor SET NOT NULL;

ALTER TABLE acc.m_coin_packages
  ADD CONSTRAINT chk_m_coin_packages_price_minor CHECK (price_minor >= 0);

ALTER TABLE acc.t_withdrawals
  ADD COLUMN coins BIGINT,
  ADD COLUMN payout_method TEXT,
  ADD COLUMN payout_destination TEXT;

ALTER TABLE acc.t_withdrawals
  ADD CONSTRAINT chk_t_withdrawals_coins CHECK (coins IS NULL OR coins > 0);

ALTER TABLE acc.t_withdrawals DROP CONSTRAINT chk_t_withdrawals_status;

ALTER TABLE acc.t_withdrawals
  ADD CONSTRAINT chk_t_withdrawals_status CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'rejected', 'cancelled')
  );

CREATE UNIQUE INDEX uq_t_withdrawals_user_open
  ON acc.t_withdrawals (user_id)
  WHERE status IN ('pending', 'processing');

CREATE INDEX idx_t_ledger_transactions_reference
  ON acc.t_ledger_transactions (reference_type, reference_id);
