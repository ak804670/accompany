import type { Pool, PoolClient } from 'pg';

import { billableCoins, chargeKey, outstandingCoins, roomName, type CallStatus } from './call-rules.js';

export type CallRecord = {
  id: string;
  conversationId: string | null;
  callerId: string;
  receiverId: string;
  callType: 'AUDIO' | 'VIDEO';
  status: CallStatus;
  rateSnapshot: number;
  roomName: string;
  connectedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number;
  createdAt: Date;
};

type CallRow = {
  id: string;
  conversation_id: string | null;
  caller_id: string;
  receiver_id: string;
  call_type: 'AUDIO' | 'VIDEO';
  status: CallStatus;
  rate_snapshot: string;
  room_name: string;
  connected_at: Date | null;
  ended_at: Date | null;
  duration_seconds: string;
  created_at: Date;
};

export type RecentCall = {
  id: string;
  callType: 'AUDIO' | 'VIDEO';
  status: CallStatus;
  callerId: string;
  receiverId: string;
  durationSeconds: number;
  createdAt: Date;
  name: string;
  personId: string;
  conversationId: string | null;
};

type RecentCallRow = {
  id: string;
  call_type: 'AUDIO' | 'VIDEO';
  status: CallStatus;
  caller_id: string;
  receiver_id: string;
  duration_seconds: string;
  created_at: Date;
  display_name: string;
  person_id: string;
  conversation_id: string | null;
};

function mapCall(row: CallRow): CallRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    callerId: row.caller_id,
    receiverId: row.receiver_id,
    callType: row.call_type,
    status: row.status,
    rateSnapshot: Number(row.rate_snapshot),
    roomName: row.room_name,
    connectedAt: row.connected_at,
    endedAt: row.ended_at,
    durationSeconds: Number(row.duration_seconds),
    createdAt: row.created_at,
  };
}

const CALL_COLUMNS = `id, conversation_id, caller_id, receiver_id, call_type, status, rate_snapshot, room_name, connected_at, ended_at, duration_seconds, created_at`;

export class PgCallStore {
  constructor(private readonly pool: Pool) {}

  async blocked(left: string, right: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM acc.blocks
       WHERE (user_id = $1 AND blocked_user_id = $2) OR (user_id = $2 AND blocked_user_id = $1)
       LIMIT 1`,
      [left, right],
    );
    return Boolean(result.rows[0]);
  }

  async rate(receiverId: string, callType: 'AUDIO' | 'VIDEO'): Promise<number | null> {
    const result = await this.pool.query<{ rate_coins: string }>(
      `SELECT rate_coins FROM acc.m_companion_rates
       WHERE companion_user_id = $1 AND is_active AND communication_type = $2`,
      [receiverId, callType === 'AUDIO' ? 'voice_call' : 'video_call'],
    );
    return result.rows[0] ? Number(result.rows[0].rate_coins) : null;
  }

  async balance(userId: string): Promise<number> {
    const result = await this.pool.query<{ balance: string }>(
      `SELECT balance FROM acc.m_wallets WHERE user_id = $1 AND currency_type = 'coins' AND status = 'active'`,
      [userId],
    );
    return result.rows[0] ? Number(result.rows[0].balance) : 0;
  }

  async create(input: {
    callerId: string;
    receiverId: string;
    callType: 'AUDIO' | 'VIDEO';
    rate: number;
    conversationId: string | null;
  }): Promise<CallRecord> {
    const id = crypto.randomUUID();
    const result = await this.pool.query<CallRow>(
      `WITH inserted AS (
         INSERT INTO acc.t_calls (id, conversation_id, caller_id, receiver_id, call_type, status, rate_snapshot, room_name, started_at)
         VALUES ($1, $2, $3, $4, $5, 'RINGING', $6, $7, NOW())
         RETURNING ${CALL_COLUMNS}
       )
       INSERT INTO acc.t_call_billing (call_id, rate)
       SELECT id, rate_snapshot FROM inserted
       RETURNING call_id`,
      [id, input.conversationId, input.callerId, input.receiverId, input.callType, input.rate, roomName(id)],
    );
    if (!result.rows[0]) throw new Error('call was not created');
    const created = await this.get(id);
    if (!created) throw new Error('call was not created');
    return created;
  }

  async get(id: string): Promise<CallRecord | null> {
    const result = await this.pool.query<CallRow>(`SELECT ${CALL_COLUMNS} FROM acc.t_calls WHERE id = $1`, [id]);
    return result.rows[0] ? mapCall(result.rows[0]) : null;
  }

  async byRoom(room: string): Promise<CallRecord | null> {
    const result = await this.pool.query<CallRow>(`SELECT ${CALL_COLUMNS} FROM acc.t_calls WHERE room_name = $1`, [room]);
    return result.rows[0] ? mapCall(result.rows[0]) : null;
  }

  async history(userId: string, otherUserId: string): Promise<CallRecord[]> {
    const result = await this.pool.query<CallRow>(
      `SELECT ${CALL_COLUMNS} FROM acc.t_calls
       WHERE (caller_id = $1 AND receiver_id = $2) OR (caller_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC
       LIMIT 50`,
      [userId, otherUserId],
    );
    return result.rows.map(mapCall);
  }

  async recent(userId: string, cursor: { at: string; id: string } | null, limit: number, missed: boolean): Promise<RecentCall[]> {
    const params: unknown[] = [userId];
    let where = `(c.caller_id = $1 OR c.receiver_id = $1)`;
    if (missed) where += ` AND c.status = 'MISSED'`;
    if (cursor) {
      params.push(cursor.at, cursor.id);
      where += ` AND (c.created_at, c.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
    }
    params.push(limit);
    const result = await this.pool.query<RecentCallRow>(
      `SELECT c.id, c.call_type, c.status, c.caller_id, c.receiver_id, c.duration_seconds, c.created_at,
              COALESCE(NULLIF(BTRIM(pr.display_name), ''), 'Someone') AS display_name,
              CASE WHEN c.caller_id = $1 THEN c.receiver_id ELSE c.caller_id END AS person_id,
              COALESCE(c.conversation_id, conv.conversation_id) AS conversation_id
       FROM acc.t_calls c
       LEFT JOIN acc.m_profiles pr
         ON pr.user_id = CASE WHEN c.caller_id = $1 THEN c.receiver_id ELSE c.caller_id END
        AND pr.deleted_at IS NULL
       LEFT JOIN LATERAL (
         SELECT p1.conversation_id
         FROM acc.p_conversation_participants p1
         JOIN acc.p_conversation_participants p2 ON p2.conversation_id = p1.conversation_id
         WHERE p1.user_id = $1
           AND p2.user_id = CASE WHEN c.caller_id = $1 THEN c.receiver_id ELSE c.caller_id END
           AND p1.left_at IS NULL
           AND p2.left_at IS NULL
         ORDER BY p1.joined_at DESC
         LIMIT 1
       ) conv ON TRUE
       WHERE ${where}
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT $${params.length}`,
      params,
    );
    return result.rows.map((row) => ({
      id: row.id,
      callType: row.call_type,
      status: row.status,
      callerId: row.caller_id,
      receiverId: row.receiver_id,
      durationSeconds: Number(row.duration_seconds),
      createdAt: row.created_at,
      name: row.display_name,
      personId: row.person_id,
      conversationId: row.conversation_id,
    }));
  }

  async incoming(userId: string): Promise<CallRecord | null> {
    const result = await this.pool.query<CallRow>(
      `SELECT ${CALL_COLUMNS} FROM acc.t_calls
       WHERE receiver_id = $1 AND status = 'RINGING'
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    return result.rows[0] ? mapCall(result.rows[0]) : null;
  }

  async transition(id: string, from: CallStatus, to: CallStatus, reason: string | null): Promise<CallRecord | null> {
    const ended = ['ENDED', 'DECLINED', 'MISSED', 'CANCELLED', 'FAILED'].includes(to);
    const result = await this.pool.query<CallRow>(
      `UPDATE acc.t_calls
       SET status = $3,
           end_reason = COALESCE($4, end_reason),
           ended_at = CASE WHEN $5 THEN NOW() ELSE ended_at END,
           connected_at = CASE WHEN $3 = 'CONNECTED' AND connected_at IS NULL THEN NOW() ELSE connected_at END,
           duration_seconds = CASE
             WHEN $5 AND connected_at IS NOT NULL THEN EXTRACT(EPOCH FROM (NOW() - connected_at))::bigint
             ELSE duration_seconds
           END
       WHERE id = $1 AND status = $2
       RETURNING ${CALL_COLUMNS}`,
      [id, from, to, reason, ended],
    );
    return result.rows[0] ? mapCall(result.rows[0]) : null;
  }

  async expireRinging(olderThanSeconds: number): Promise<string[]> {
    const result = await this.pool.query<{ id: string }>(
      `UPDATE acc.t_calls
       SET status = 'MISSED', end_reason = 'timeout', ended_at = NOW()
       WHERE status = 'RINGING' AND created_at < NOW() - ($1::int * INTERVAL '1 second')
       RETURNING id`,
      [olderThanSeconds],
    );
    return result.rows.map((row) => row.id);
  }

  async claimWebhook(id: string, eventType: string, callId: string | null): Promise<boolean> {
    const result = await this.pool.query(
      `INSERT INTO acc.t_call_webhook_events (id, event_type, call_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [id, eventType, callId],
    );
    return Boolean(result.rows[0]);
  }

  async reconcile(callId: string, intervalSeconds: number): Promise<'charged' | 'settled' | 'insufficient' | 'skipped'> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const outcome = await reconcileOn(client, callId, intervalSeconds);
      await client.query('COMMIT');
      return outcome;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async activeTokens(userId: string): Promise<Array<{ id: string; token: string }>> {
    const result = await this.pool.query<{ id: string; token: string }>(
      `SELECT id, token FROM acc.p_device_tokens WHERE user_id = $1 AND is_active`,
      [userId],
    );
    return result.rows;
  }

  async saveToken(userId: string, platform: 'ios' | 'android', token: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO acc.p_device_tokens (user_id, platform, token, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, is_active = TRUE`,
      [userId, platform, token],
    );
  }

  async deactivateToken(userId: string, tokenId: string): Promise<void> {
    await this.pool.query(
      `UPDATE acc.p_device_tokens SET is_active = FALSE WHERE id = $1 AND user_id = $2`,
      [tokenId, userId],
    );
  }

  async deactivateTokenValue(token: string): Promise<void> {
    await this.pool.query(`UPDATE acc.p_device_tokens SET is_active = FALSE WHERE token = $1`, [token]);
  }
}

async function reconcileOn(client: PoolClient, callId: string, intervalSeconds: number): Promise<'charged' | 'settled' | 'insufficient' | 'skipped'> {
  const call = await client.query<CallRow>(
    `SELECT ${CALL_COLUMNS} FROM acc.t_calls WHERE id = $1 FOR UPDATE`,
    [callId],
  );
  const row = call.rows[0];
  if (!row || !row.connected_at) return 'skipped';
  const end = row.ended_at ?? new Date();
  const seconds = Math.max(0, Math.floor((end.getTime() - row.connected_at.getTime()) / 1000));
  const total = billableCoins(Number(row.rate_snapshot), seconds);
  const billing = await client.query<{ amount_charged: string; billing_status: string }>(
    `SELECT amount_charged, billing_status FROM acc.t_call_billing WHERE call_id = $1 FOR UPDATE`,
    [callId],
  );
  const charged = Number(billing.rows[0]?.amount_charged ?? 0);
  if (billing.rows[0]?.billing_status === 'settled') return 'settled';
  const due = outstandingCoins(total, charged);
  const period = Math.floor(seconds / intervalSeconds);
    let applied = 0;
    if (due > 0) {
    const wallet = await client.query<{ id: string; balance: string }>(
      `SELECT id, balance FROM acc.m_wallets WHERE user_id = $1 AND currency_type = 'coins' AND status = 'active' FOR UPDATE`,
      [row.caller_id],
    );
    const balance = Number(wallet.rows[0]?.balance ?? 0);
    if (!wallet.rows[0] || balance < due) {
      await client.query(`UPDATE acc.t_call_billing SET total_amount = $2, billable_duration = $3 WHERE call_id = $1`, [callId, total, seconds]);
      return 'insufficient';
    }
    const key = chargeKey(callId, period);
    const inserted = await client.query(
      `INSERT INTO acc.t_call_charges (call_id, period, coins, idempotency_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
      [callId, period, due, key],
    );
    if (inserted.rows[0]) {
      applied = due;
      await moveCoins(client, wallet.rows[0].id, row.caller_id, row.receiver_id, due, row.call_type, inserted.rows[0].id as string);
    }
  }
  const settled = row.status === 'ENDED' || row.status === 'FAILED';
  await client.query(
    `UPDATE acc.t_call_billing
     SET total_amount = $2, billable_duration = $3, amount_charged = amount_charged + $4,
         last_billed_at = NOW(), billing_status = $5
     WHERE call_id = $1`,
    [callId, total, seconds, applied, settled ? 'settled' : 'open'],
  );
  return settled ? 'settled' : 'charged';
}

async function moveCoins(
  client: PoolClient,
  payerWalletId: string,
  payerId: string,
  receiverId: string,
  coins: number,
  callType: 'AUDIO' | 'VIDEO',
  chargeId: string,
): Promise<void> {
  const debitType = callType === 'AUDIO' ? 'voice_call_debit' : 'video_call_debit';
  const creditType = callType === 'AUDIO' ? 'voice_call_credit' : 'video_call_credit';
  const debit = await client.query<{ id: string }>(
    `INSERT INTO acc.t_ledger_transactions (reference_type, reference_id, transaction_type, status, description, completed_at)
     VALUES ('call_charge', $1, $2, 'completed', 'Call charge', NOW())
     ON CONFLICT (reference_type, reference_id, transaction_type) DO NOTHING
     RETURNING id`,
    [chargeId, debitType],
  );
  if (!debit.rows[0]) return;
  await client.query(
    `INSERT INTO acc.t_ledger_entries (transaction_id, wallet_id, entry_type, amount) VALUES ($1, $2, 'debit', $3)`,
    [debit.rows[0].id, payerWalletId, coins],
  );
  await client.query(
    `UPDATE acc.m_wallets
     SET balance = balance - $2, earned_coins = LEAST(earned_coins, balance - $2)
     WHERE id = $1 AND balance >= $2`,
    [payerWalletId, coins],
  );
  const receiverWallet = await client.query<{ id: string }>(
    `INSERT INTO acc.m_wallets (user_id, currency_type) VALUES ($1, 'coins')
     ON CONFLICT (user_id, currency_type) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [receiverId],
  );
  const credit = await client.query<{ id: string }>(
    `INSERT INTO acc.t_ledger_transactions (reference_type, reference_id, transaction_type, status, description, completed_at)
     VALUES ('call_charge', $1, $2, 'completed', 'Call earning', NOW())
     RETURNING id`,
    [chargeId, creditType],
  );
  await client.query(
    `INSERT INTO acc.t_ledger_entries (transaction_id, wallet_id, entry_type, amount) VALUES ($1, $2, 'credit', $3)`,
    [credit.rows[0]?.id, receiverWallet.rows[0]?.id, coins],
  );
  await client.query(
    `UPDATE acc.m_wallets SET balance = balance + $2, earned_coins = earned_coins + $2 WHERE id = $1`,
    [receiverWallet.rows[0]?.id, coins],
  );
  void payerId;
}
