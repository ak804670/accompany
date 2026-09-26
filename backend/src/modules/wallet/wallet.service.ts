import { createHmac } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

import { logger } from '../../utils/logger.js';
import type { PushMessage } from '../calls/notification-types.js';
import type { PaymentProvider } from './payment-provider.js';
import { payoutMinor, publicLabel, type LedgerType } from './wallet-rules.js';

export class WalletError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

type Notify = (message: PushMessage) => Promise<void>;

export class WalletService {
  constructor(
    private readonly pool: Pool,
    private readonly payments: PaymentProvider,
    private readonly notify: Notify,
    private readonly minimumWithdrawal: number,
    private readonly paisePerCoin: number,
  ) {}

  async summary(userId: string) {
    const wallet = await this.ensure(userId);
    return {
      availableCoins: wallet.balance,
      earnedCoins: wallet.earned,
      heldCoins: wallet.held,
    };
  }

  async transactions(userId: string) {
    const result = await this.pool.query<{
      id: string;
      transaction_type: string;
      entry_type: string;
      amount: string;
      status: string;
      created_at: Date;
      reference_type: string;
      reference_id: string;
    }>(
      `SELECT t.id, t.transaction_type, e.entry_type, e.amount, t.status, t.created_at, t.reference_type, t.reference_id
       FROM acc.t_ledger_entries e
       JOIN acc.t_ledger_transactions t ON t.id = e.transaction_id
       JOIN acc.m_wallets w ON w.id = e.wallet_id
       WHERE w.user_id = $1
       ORDER BY e.created_at DESC
       LIMIT 50`,
      [userId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      label: publicLabel(row.transaction_type),
      direction: row.entry_type === 'credit' ? 'credit' : 'debit',
      coins: Number(row.amount),
      status: row.status,
      createdAt: row.created_at,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
    }));
  }

  async packages() {
    const result = await this.pool.query(
      `SELECT id, name, coins, price_minor, currency, is_featured
       FROM acc.m_coin_packages WHERE status = 'active' ORDER BY display_order, coins`,
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      coins: Number(row.coins),
      priceMinor: Number(row.price_minor),
      currency: row.currency as string,
      featured: Boolean(row.is_featured),
    }));
  }

  async createPurchase(userId: string, packageId: string, idempotencyKey: string) {
    const existing = await this.pool.query(
      `SELECT p.id, p.status, p.coins, pay.provider_transaction_id
       FROM acc.t_coin_purchases p
       JOIN acc.t_payment_transactions pay ON pay.id = p.payment_transaction_id
       WHERE pay.idempotency_key = $1 AND p.user_id = $2`,
      [idempotencyKey, userId],
    );
    if (existing.rows[0]) {
      return { id: existing.rows[0].id, status: existing.rows[0].status, coins: Number(existing.rows[0].coins), alreadyCreated: true };
    }
    const pkg = await this.pool.query(
      `SELECT id, coins, price, price_minor, currency FROM acc.m_coin_packages WHERE id = $1 AND status = 'active'`,
      [packageId],
    );
    const item = pkg.rows[0];
    if (!item) throw new WalletError(404, 'NOT_FOUND', 'That coin package is not available.');
    const order = await this.payments.createOrder({
      purchaseId: idempotencyKey,
      amountMinor: Number(item.price_minor),
      currency: item.currency,
    });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const payment = await client.query<{ id: string }>(
        `INSERT INTO acc.t_payment_transactions (user_id, provider, provider_transaction_id, idempotency_key, amount, currency, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING id`,
        [userId, order.provider, order.providerOrderId, idempotencyKey, item.price, item.currency],
      );
      if (!payment.rows[0]) {
        await client.query('ROLLBACK');
        const again = await this.pool.query(`SELECT id, status, coins FROM acc.t_coin_purchases p JOIN acc.t_payment_transactions pay ON pay.id = p.payment_transaction_id WHERE pay.idempotency_key = $1`, [idempotencyKey]);
        return { id: again.rows[0]?.id as string, status: again.rows[0]?.status as string, coins: Number(again.rows[0]?.coins ?? 0), alreadyCreated: true };
      }
      const purchase = await client.query<{ id: string }>(
        `INSERT INTO acc.t_coin_purchases (user_id, package_id, payment_transaction_id, coins, amount, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
        [userId, item.id, payment.rows[0].id, item.coins, item.price],
      );
      await client.query('COMMIT');
      return {
        id: purchase.rows[0]?.id,
        status: 'pending',
        coins: Number(item.coins),
        priceMinor: Number(item.price_minor),
        currency: item.currency,
        provider: order.provider,
        providerOrderId: order.providerOrderId,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async completePayment(provider: string, providerTransactionId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const payment = await client.query<{ id: string; user_id: string; status: string }>(
        `SELECT id, user_id, status FROM acc.t_payment_transactions
         WHERE provider = $1 AND provider_transaction_id = $2 FOR UPDATE`,
        [provider, providerTransactionId],
      );
      const row = payment.rows[0];
      if (!row) throw new WalletError(404, 'NOT_FOUND', 'Payment was not found.');
      if (row.status === 'completed') {
        await client.query('COMMIT');
        return { credited: false };
      }
      const purchase = await client.query<{ id: string; coins: string }>(
        `SELECT id, coins FROM acc.t_coin_purchases WHERE payment_transaction_id = $1 FOR UPDATE`,
        [row.id],
      );
      const coins = Number(purchase.rows[0]?.coins ?? 0);
      await this.post(client, row.user_id, coins, 'credit', 'coin_purchase', 'payment', row.id, false);
      await client.query(
        `UPDATE acc.t_payment_transactions SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [row.id],
      );
      await client.query(
        `UPDATE acc.t_coin_purchases SET status = 'completed', completed_at = NOW() WHERE payment_transaction_id = $1`,
        [row.id],
      );
      await client.query('COMMIT');
      await this.safeNotify(row.user_id, 'COIN_PURCHASE_SUCCESS', 'Coins added', `${coins} coins were added.`);
      return { credited: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async requestWithdrawal(userId: string, coins: number, idempotencyKey: string, method: string, destination: string) {
    if (!Number.isInteger(coins) || coins <= 0) throw new WalletError(400, 'VALIDATION_ERROR', 'Enter a whole number of coins.');
    if (method.trim().length < 2 || destination.trim().length < 4) throw new WalletError(400, 'VALIDATION_ERROR', 'Add a payout method.');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const prior = await client.query(`SELECT id, status, coins FROM acc.t_withdrawals WHERE idempotency_key = $1 AND user_id = $2`, [idempotencyKey, userId]);
      if (prior.rows[0]) {
        await client.query('COMMIT');
        return { id: prior.rows[0].id, status: prior.rows[0].status, coins: Number(prior.rows[0].coins) };
      }
      const wallet = await this.lock(client, userId);
      if (coins < this.minimumWithdrawal) throw new WalletError(400, 'BELOW_MINIMUM', `The minimum withdrawal is ${this.minimumWithdrawal} coins.`);
      if (wallet.earned < coins) throw new WalletError(402, 'INSUFFICIENT_EARNINGS', 'Only coins you have earned can be withdrawn.');
      const minor = payoutMinor(coins, this.paisePerCoin);
      const amount = `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
      await client.query(
        `UPDATE acc.m_wallets
         SET balance = balance - $2, earned_coins = earned_coins - $2, held_coins = held_coins + $2
         WHERE id = $1`,
        [wallet.id, coins],
      );
      const created = await client.query<{ id: string }>(
        `INSERT INTO acc.t_withdrawals (user_id, idempotency_key, amount, currency, status, coins, payout_method, payout_destination, provider)
         VALUES ($1, $2, $3, 'INR', 'pending', $4, $5, $6, 'manual') RETURNING id`,
        [userId, idempotencyKey, amount, coins, method.trim(), destination.trim()],
      );
      await client.query('COMMIT');
      await this.safeNotify(userId, 'WITHDRAWAL_REQUESTED', 'Withdrawal requested', `${coins} coins are pending.`);
      return { id: created.rows[0]?.id, status: 'pending', coins, payoutMinor: minor };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof WalletError) throw error;
      throw new WalletError(409, 'WITHDRAWAL_IN_PROGRESS', 'You already have a withdrawal in progress.');
    } finally {
      client.release();
    }
  }

  async withdrawals(userId: string) {
    const result = await this.pool.query(
      `SELECT id, coins, amount, currency, status, requested_at, processed_at, failure_reason
       FROM acc.t_withdrawals WHERE user_id = $1 ORDER BY requested_at DESC LIMIT 50`,
      [userId],
    );
    return result.rows;
  }

  async settleWithdrawal(id: string, decision: 'completed' | 'rejected', reason: string | null, providerReference: string | null) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const row = await client.query<{ id: string; user_id: string; coins: string; status: string }>(
        `SELECT id, user_id, coins, status FROM acc.t_withdrawals WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const withdrawal = row.rows[0];
      if (!withdrawal || withdrawal.status !== 'pending') throw new WalletError(409, 'INVALID_STATE', 'This withdrawal can no longer change.');
      const coins = Number(withdrawal.coins);
      const wallet = await this.lock(client, withdrawal.user_id);
      if (decision === 'completed') {
        if (!providerReference) throw new WalletError(400, 'VALIDATION_ERROR', 'A confirmed payout reference is required.');
        await client.query(`UPDATE acc.m_wallets SET held_coins = held_coins - $2 WHERE id = $1 AND held_coins >= $2`, [wallet.id, coins]);
        const tx = await client.query<{ id: string }>(
          `INSERT INTO acc.t_ledger_transactions (reference_type, reference_id, transaction_type, status, description, completed_at)
           VALUES ('withdrawal', $1, 'withdrawal', 'completed', 'Withdrawal', NOW())
           ON CONFLICT (reference_type, reference_id, transaction_type) DO NOTHING
           RETURNING id`,
          [withdrawal.id],
        );
        if (tx.rows[0]) {
          await client.query(
            `INSERT INTO acc.t_ledger_entries (transaction_id, wallet_id, entry_type, amount, balance_before, balance_after)
             VALUES ($1, $2, 'debit', $3, $4, $5)`,
            [tx.rows[0].id, wallet.id, coins, wallet.balance + coins, wallet.balance],
          );
        }
        await client.query(
          `UPDATE acc.t_withdrawals SET status = 'completed', processed_at = NOW(), provider_reference = $2 WHERE id = $1`,
          [id, providerReference],
        );
      } else {
        await client.query(
          `UPDATE acc.m_wallets SET held_coins = held_coins - $2, balance = balance + $2, earned_coins = earned_coins + $2 WHERE id = $1`,
          [wallet.id, coins],
        );
        await client.query(
          `UPDATE acc.t_withdrawals SET status = 'rejected', failed_at = NOW(), failure_reason = $2 WHERE id = $1`,
          [id, reason ?? 'Rejected'],
        );
      }
      await client.query('COMMIT');
      await this.safeNotify(
        withdrawal.user_id,
        decision === 'completed' ? 'WITHDRAWAL_COMPLETED' : 'WITHDRAWAL_FAILED',
        decision === 'completed' ? 'Withdrawal completed' : 'Withdrawal rejected',
        decision === 'completed' ? 'Your withdrawal was paid.' : 'Your coins were returned.',
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async adjust(userId: string, coins: number, direction: 'credit' | 'debit', reason: string, actor: string) {
    if (!Number.isInteger(coins) || coins <= 0 || reason.trim().length < 3) throw new WalletError(400, 'VALIDATION_ERROR', 'Enter an amount and a reason.');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.post(client, userId, coins, direction, direction === 'credit' ? 'bonus' : 'adjustment', 'admin', crypto.randomUUID(), direction === 'credit');
      await client.query('COMMIT');
      logger.info('wallet adjustment', { userId, coins, direction, actor, reason });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async mismatches() {
    const result = await this.pool.query(
      `SELECT w.user_id, w.balance, w.earned_coins, w.held_coins,
              COALESCE(SUM(CASE WHEN e.entry_type = 'credit' THEN e.amount ELSE -e.amount END), 0) AS ledger_net
       FROM acc.m_wallets w
       LEFT JOIN acc.t_ledger_entries e ON e.wallet_id = w.id
       LEFT JOIN acc.t_ledger_transactions t ON t.id = e.transaction_id AND t.status = 'completed'
       GROUP BY w.id
       HAVING w.balance <> COALESCE(SUM(CASE WHEN e.entry_type = 'credit' THEN e.amount ELSE -e.amount END), 0) - w.held_coins`,
    );
    return result.rows;
  }

  private async ensure(userId: string) {
    const result = await this.pool.query<{ id: string; balance: string; earned_coins: string; held_coins: string }>(
      `INSERT INTO acc.m_wallets (user_id, currency_type)
       VALUES ($1, 'coins')
       ON CONFLICT (user_id, currency_type) DO UPDATE SET updated_at = NOW()
       RETURNING id, balance, earned_coins, held_coins`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) throw new WalletError(500, 'WALLET_UNAVAILABLE', 'Wallet is unavailable.');
    return { id: row.id, balance: Number(row.balance), earned: Number(row.earned_coins), held: Number(row.held_coins) };
  }

  private async lock(client: PoolClient, userId: string) {
    await this.ensure(userId);
    const result = await client.query<{ id: string; balance: string; earned_coins: string; held_coins: string }>(
      `SELECT id, balance, earned_coins, held_coins FROM acc.m_wallets
       WHERE user_id = $1 AND currency_type = 'coins' FOR UPDATE`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) throw new WalletError(404, 'NOT_FOUND', 'Wallet was not found.');
    return { id: row.id, balance: Number(row.balance), earned: Number(row.earned_coins), held: Number(row.held_coins) };
  }

  private async post(
    client: PoolClient,
    userId: string,
    coins: number,
    direction: 'credit' | 'debit',
    type: LedgerType,
    referenceType: string,
    referenceId: string,
    countsAsEarned: boolean,
  ) {
    const wallet = await this.lock(client, userId);
    if (direction === 'debit' && wallet.balance < coins) throw new WalletError(402, 'INSUFFICIENT_BALANCE', 'Not enough coins.');
    const before = wallet.balance;
    const after = direction === 'credit' ? before + coins : before - coins;
    const earned = countsAsEarned ? wallet.earned + coins : Math.min(wallet.earned, after);
    const updated = await client.query(
      `UPDATE acc.m_wallets SET balance = $2, earned_coins = $3 WHERE id = $1 AND balance = $4`,
      [wallet.id, after, earned, before],
    );
    if (updated.rowCount !== 1) throw new WalletError(409, 'CONFLICT', 'The wallet changed. Try again.');
    const tx = await client.query<{ id: string }>(
      `INSERT INTO acc.t_ledger_transactions (reference_type, reference_id, transaction_type, status, description, completed_at)
       VALUES ($1, $2, $3, 'completed', $3, NOW())
       ON CONFLICT (reference_type, reference_id, transaction_type) DO NOTHING
       RETURNING id`,
      [referenceType, referenceId, type],
    );
    if (!tx.rows[0]) return;
    await client.query(
      `INSERT INTO acc.t_ledger_entries (transaction_id, wallet_id, entry_type, amount, balance_before, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tx.rows[0].id, wallet.id, direction, coins, before, after],
    );
  }

  private async safeNotify(userId: string, type: PushMessage['type'], title: string, body: string) {
    await this.notify({ userId, type, title, body, data: { type } }).catch((error: unknown) => {
      logger.error('notification enqueue failed', { type, message: error instanceof Error ? error.message : 'failed' });
    });
  }
}

export function paymentSignature(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}
