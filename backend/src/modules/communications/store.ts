import { randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

import type { SqlClient } from '../../infrastructure/database/pool.js';
import type {
  ClaimedJob,
  CommunicationChannel,
  CommunicationLog,
  CommunicationPurpose,
  CommunicationStatus,
} from './types.js';

export type NewCommunication = {
  id: string;
  userId: string | null;
  channel: CommunicationChannel;
  provider: string;
  purpose: CommunicationPurpose;
  recipient: string;
  idempotencyKey: string;
  template: string;
  variablesEnc: string;
  metadata: Record<string, string>;
};

export interface CommunicationStore {
  enqueue(db: SqlClient | null, input: NewCommunication): Promise<{ id: string; created: boolean }>;
  claim(limit: number, now: Date): Promise<ClaimedJob[]>;
  get(id: string): Promise<CommunicationLog | null>;
  markSending(id: string): Promise<void>;
  markSent(id: string, outboxId: string, provider: string, providerMessageId: string | null, providerStatus: string, at: Date): Promise<void>;
  markDelivered(input: { communicationId?: string | null; provider: string; providerMessageId?: string | null; providerStatus: string; at: Date }): Promise<void>;
  defer(outboxId: string, until: Date): Promise<void>;
  markRetry(outboxId: string, id: string, retryCount: number, until: Date, errorCode: string): Promise<void>;
  markFailed(outboxId: string, id: string, errorCode: string, at: Date): Promise<void>;
  countSince(channel: CommunicationChannel, since: Date): Promise<number>;
  recoverInterrupted(): Promise<void>;
}

type MemoryLog = CommunicationLog & { template: string; variablesEnc: string };
type MemoryOutbox = {
  id: string;
  eventType: ClaimedJob['eventType'];
  communicationId: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  retryCount: number;
  availableAt: Date;
  idempotencyKey: string;
};

function toLog(row: MemoryLog): CommunicationLog {
  const { template: _template, variablesEnc: _variablesEnc, ...log } = row;
  return log;
}

export class MemoryCommunicationStore implements CommunicationStore {
  readonly logs: MemoryLog[] = [];
  readonly outbox: MemoryOutbox[] = [];

  async enqueue(_db: SqlClient | null, input: NewCommunication): Promise<{ id: string; created: boolean }> {
    const existing = this.logs.find((log) => log.idempotencyKey === input.idempotencyKey);
    if (existing) {
      return { id: existing.id, created: false };
    }
    const now = new Date();
    this.logs.push({
      id: input.id,
      userId: input.userId,
      channel: input.channel,
      provider: input.provider,
      purpose: input.purpose,
      recipient: input.recipient,
      providerMessageId: null,
      providerStatus: null,
      status: 'queued',
      errorCode: null,
      errorMessage: null,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      sentAt: null,
      deliveredAt: null,
      failedAt: null,
      template: input.template,
      variablesEnc: input.variablesEnc,
    });
    this.outbox.push({
      id: randomUUID(),
      eventType: input.channel === 'email' ? 'communication.email' : 'communication.sms',
      communicationId: input.id,
      status: 'pending',
      retryCount: 0,
      availableAt: now,
      idempotencyKey: input.idempotencyKey,
    });
    return { id: input.id, created: true };
  }

  async claim(limit: number, now: Date): Promise<ClaimedJob[]> {
    const ready = this.outbox
      .filter((event) => event.status === 'pending' && event.availableAt.getTime() <= now.getTime())
      .slice(0, limit);
    return ready.map((event) => {
      event.status = 'processing';
      const log = this.logs.find((item) => item.id === event.communicationId);
      if (!log) {
        throw new Error('Communication log missing for outbox event');
      }
      return {
        outboxId: event.id,
        eventType: event.eventType,
        communicationId: log.id,
        retryCount: event.retryCount,
        variablesEnc: log.variablesEnc,
        template: log.template,
        recipient: log.recipient,
      };
    });
  }

  async get(id: string): Promise<CommunicationLog | null> {
    const log = this.logs.find((item) => item.id === id);
    return log ? toLog(log) : null;
  }

  async markSending(id: string): Promise<void> {
    const log = this.require(id);
    log.status = 'sending';
  }

  async markSent(id: string, outboxId: string, provider: string, providerMessageId: string | null, providerStatus: string, at: Date): Promise<void> {
    const log = this.require(id);
    if (log.status !== 'delivered') {
      log.status = 'sent';
    }
    log.provider = provider;
    log.providerMessageId = providerMessageId;
    log.providerStatus = providerStatus;
    log.sentAt = at;
    this.finish(outboxId, 'processed');
  }

  async markDelivered(input: { communicationId?: string | null; provider: string; providerMessageId?: string | null; providerStatus: string; at: Date }): Promise<void> {
    const log = this.findForWebhook(input.communicationId, input.provider, input.providerMessageId);
    if (!log || log.status === 'failed') {
      return;
    }
    log.providerStatus = input.providerStatus;
    if (input.providerMessageId) {
      log.providerMessageId = input.providerMessageId;
    }
    const next = webhookStatus(input.providerStatus, log.status);
    log.status = next;
    if (next === 'delivered') {
      log.deliveredAt = input.at;
    }
    if (next === 'failed') {
      log.failedAt = input.at;
      log.errorCode = 'provider_failed';
    }
  }

  async defer(outboxId: string, until: Date): Promise<void> {
    const event = this.outbox.find((item) => item.id === outboxId);
    if (!event) {
      return;
    }
    event.status = 'pending';
    event.availableAt = until;
  }

  async markRetry(outboxId: string, id: string, retryCount: number, until: Date, errorCode: string): Promise<void> {
    const log = this.require(id);
    log.status = 'queued';
    log.errorCode = errorCode;
    const event = this.outbox.find((item) => item.id === outboxId);
    if (event) {
      event.status = 'pending';
      event.retryCount = retryCount;
      event.availableAt = until;
    }
  }

  async markFailed(outboxId: string, id: string, errorCode: string, at: Date): Promise<void> {
    const log = this.require(id);
    log.status = 'failed';
    log.errorCode = errorCode;
    log.failedAt = at;
    this.finish(outboxId, 'failed');
  }

  async recoverInterrupted(): Promise<void> {
    for (const event of this.outbox) {
      if (event.status !== 'processing') {
        continue;
      }
      const log = this.logs.find((item) => item.id === event.communicationId);
      if (!log || log.status === 'queued') {
        event.status = 'pending';
        continue;
      }
      if (log.status === 'sent' || log.status === 'delivered') {
        event.status = 'processed';
        continue;
      }
      if (log.status === 'sending' && !log.providerMessageId) {
        log.status = 'failed';
        log.errorCode = 'ambiguous_delivery';
        log.failedAt = new Date();
        event.status = 'failed';
      }
    }
  }

  async countSince(channel: CommunicationChannel, since: Date): Promise<number> {
    return this.logs.filter((log) => {
      return log.channel === channel
        && log.createdAt.getTime() >= since.getTime()
        && (log.status === 'sending' || log.status === 'sent' || log.status === 'delivered');
    }).length;
  }

  private require(id: string): MemoryLog {
    const log = this.logs.find((item) => item.id === id);
    if (!log) {
      throw new Error('Communication log not found');
    }
    return log;
  }

  private finish(outboxId: string, status: 'processed' | 'failed') {
    const event = this.outbox.find((item) => item.id === outboxId);
    if (event) {
      event.status = status;
    }
  }

  private findForWebhook(communicationId?: string | null, provider?: string, providerMessageId?: string | null): MemoryLog | undefined {
    if (communicationId) {
      return this.logs.find((log) => log.id === communicationId);
    }
    if (provider && providerMessageId) {
      return this.logs.find((log) => log.provider === provider && log.providerMessageId === providerMessageId);
    }
    return undefined;
  }
}

function webhookStatus(providerStatus: string, current: CommunicationStatus): CommunicationStatus {
  if (providerStatus === 'delivered') {
    return 'delivered';
  }
  if (providerStatus === 'failed') {
    return 'failed';
  }
  if (providerStatus === 'sent' && current === 'queued') {
    return 'sent';
  }
  if (providerStatus === 'sent' && current !== 'delivered' && current !== 'failed') {
    return 'sent';
  }
  return current;
}

type LogRow = {
  id: string;
  user_id: string | null;
  channel: CommunicationChannel;
  provider: string;
  purpose: CommunicationPurpose;
  recipient: string;
  provider_message_id: string | null;
  provider_status: string | null;
  status: CommunicationStatus;
  error_code: string | null;
  error_message: string | null;
  idempotency_key: string;
  created_at: Date;
  sent_at: Date | null;
  delivered_at: Date | null;
  failed_at: Date | null;
};

function mapLog(row: LogRow): CommunicationLog {
  return {
    id: row.id,
    userId: row.user_id,
    channel: row.channel,
    provider: row.provider,
    purpose: row.purpose,
    recipient: row.recipient,
    providerMessageId: row.provider_message_id,
    providerStatus: row.provider_status,
    status: row.status,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    failedAt: row.failed_at,
  };
}

export class PgCommunicationStore implements CommunicationStore {
  constructor(private readonly pool: Pool) {}

  async enqueue(db: SqlClient | null, input: NewCommunication): Promise<{ id: string; created: boolean }> {
    if (db) {
      return this.insert(db, input);
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this.insert(client, input);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async claim(limit: number, now: Date): Promise<ClaimedJob[]> {
    const result = await this.pool.query(
      `UPDATE acc.outbox_events
       SET status = 'processing'
       WHERE id IN (
         SELECT id FROM acc.outbox_events
         WHERE status = 'pending'
           AND available_at <= $2
           AND event_type IN ('communication.email', 'communication.sms')
         ORDER BY created_at
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       RETURNING id, event_type, payload, retry_count`,
      [limit, now],
    );
    return result.rows.map((row) => {
      const payload = row.payload as { communicationId: string; template: string; recipient: string; variablesEnc: string };
      return {
        outboxId: row.id as string,
        eventType: row.event_type as ClaimedJob['eventType'],
        communicationId: payload.communicationId,
        retryCount: row.retry_count as number,
        variablesEnc: payload.variablesEnc,
        template: payload.template,
        recipient: payload.recipient,
      };
    });
  }

  async get(id: string): Promise<CommunicationLog | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, channel, provider, purpose, recipient, provider_message_id, provider_status,
              status, error_code, error_message, idempotency_key, created_at, sent_at, delivered_at, failed_at
       FROM acc.communication_logs WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapLog(result.rows[0] as LogRow) : null;
  }

  async markSending(id: string): Promise<void> {
    await this.pool.query(`UPDATE acc.communication_logs SET status = 'sending' WHERE id = $1`, [id]);
  }

  async markSent(id: string, outboxId: string, provider: string, providerMessageId: string | null, providerStatus: string, at: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE acc.communication_logs
         SET status = CASE WHEN status = 'delivered' THEN status ELSE 'sent' END,
             provider = $2, provider_message_id = $3, provider_status = $4, sent_at = COALESCE(sent_at, $5), error_code = NULL
         WHERE id = $1`,
        [id, provider, providerMessageId, providerStatus, at],
      );
      await client.query(
        `UPDATE acc.outbox_events SET status = 'processed', processed_at = $2 WHERE id = $1`,
        [outboxId, at],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markDelivered(input: { communicationId?: string | null; provider: string; providerMessageId?: string | null; providerStatus: string; at: Date }): Promise<void> {
    const status = input.providerStatus === 'failed' ? 'failed' : input.providerStatus === 'delivered' ? 'delivered' : 'sent';
    if (input.communicationId) {
      await this.pool.query(
        `UPDATE acc.communication_logs
         SET provider_status = $2,
             provider_message_id = COALESCE($3, provider_message_id),
             status = CASE
               WHEN status = 'failed' THEN status
               WHEN $4 = 'failed' THEN 'failed'
               WHEN $4 = 'delivered' THEN 'delivered'
               WHEN status = 'delivered' THEN status
               ELSE $4
             END,
             delivered_at = CASE WHEN $4 = 'delivered' THEN $5 ELSE delivered_at END,
             failed_at = CASE WHEN $4 = 'failed' THEN $5 ELSE failed_at END,
             error_code = CASE WHEN $4 = 'failed' THEN 'provider_failed' ELSE error_code END
         WHERE id = $1`,
        [input.communicationId, input.providerStatus, input.providerMessageId ?? null, status, input.at],
      );
      return;
    }
    if (!input.providerMessageId) {
      return;
    }
    await this.pool.query(
      `UPDATE acc.communication_logs
       SET provider_status = $3,
           status = CASE
             WHEN status = 'failed' THEN status
             WHEN $4 = 'failed' THEN 'failed'
             WHEN $4 = 'delivered' THEN 'delivered'
             WHEN status = 'delivered' THEN status
             ELSE $4
           END,
           delivered_at = CASE WHEN $4 = 'delivered' THEN $5 ELSE delivered_at END,
           failed_at = CASE WHEN $4 = 'failed' THEN $5 ELSE failed_at END
       WHERE provider = $1 AND provider_message_id = $2`,
      [input.provider, input.providerMessageId, input.providerStatus, status, input.at],
    );
  }

  async defer(outboxId: string, until: Date): Promise<void> {
    await this.pool.query(
      `UPDATE acc.outbox_events SET status = 'pending', available_at = $2 WHERE id = $1`,
      [outboxId, until],
    );
  }

  async markRetry(outboxId: string, id: string, retryCount: number, until: Date, errorCode: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE acc.communication_logs SET status = 'queued', error_code = $2 WHERE id = $1`,
        [id, errorCode],
      );
      await client.query(
        `UPDATE acc.outbox_events SET status = 'pending', retry_count = $2, available_at = $3 WHERE id = $1`,
        [outboxId, retryCount, until],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markFailed(outboxId: string, id: string, errorCode: string, at: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE acc.communication_logs SET status = 'failed', error_code = $2, failed_at = $3 WHERE id = $1`,
        [id, errorCode, at],
      );
      await client.query(
        `UPDATE acc.outbox_events SET status = 'failed', processed_at = $2 WHERE id = $1`,
        [outboxId, at],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async recoverInterrupted(): Promise<void> {
    await this.pool.query(
      `UPDATE acc.outbox_events event
       SET status = 'pending'
       FROM acc.communication_logs log
       WHERE log.id = (event.payload->>'communicationId')::uuid
         AND event.status = 'processing'
         AND event.event_type IN ('communication.email', 'communication.sms')
         AND log.status = 'queued'`,
    );
    await this.pool.query(
      `UPDATE acc.outbox_events event
       SET status = 'processed', processed_at = NOW()
       FROM acc.communication_logs log
       WHERE log.id = (event.payload->>'communicationId')::uuid
         AND event.status = 'processing'
         AND log.status IN ('sent', 'delivered')`,
    );
    await this.pool.query(
      `UPDATE acc.communication_logs log
       SET status = 'failed', error_code = 'ambiguous_delivery', failed_at = NOW()
       FROM acc.outbox_events event
       WHERE log.id = (event.payload->>'communicationId')::uuid
         AND event.status = 'processing'
         AND log.status = 'sending'
         AND log.provider_message_id IS NULL`,
    );
    await this.pool.query(
      `UPDATE acc.outbox_events event
       SET status = 'failed', processed_at = NOW()
       FROM acc.communication_logs log
       WHERE log.id = (event.payload->>'communicationId')::uuid
         AND event.status = 'processing'
         AND log.status = 'failed'
         AND log.error_code = 'ambiguous_delivery'`,
    );
  }

  async countSince(channel: CommunicationChannel, since: Date): Promise<number> {
    const result = await this.pool.query(
      `SELECT count(*)::int AS total
       FROM acc.communication_logs
       WHERE channel = $1 AND created_at >= $2 AND status IN ('sending', 'sent', 'delivered')`,
      [channel, since],
    );
    return result.rows[0].total as number;
  }

  private async insert(db: SqlClient, input: NewCommunication): Promise<{ id: string; created: boolean }> {
    const existing = await db.query(
      `SELECT id FROM acc.communication_logs WHERE idempotency_key = $1`,
      [input.idempotencyKey],
    );
    if (existing.rows[0]) {
      return { id: existing.rows[0].id as string, created: false };
    }
    await db.query(
      `INSERT INTO acc.communication_logs
        (id, user_id, channel, provider, purpose, recipient, status, metadata, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, 'queued', $7::jsonb, $8)`,
      [
        input.id,
        input.userId,
        input.channel,
        input.provider,
        input.purpose,
        input.recipient,
        JSON.stringify(input.metadata),
        input.idempotencyKey,
      ],
    );
    await db.query(
      `INSERT INTO acc.outbox_events
        (aggregate_type, aggregate_id, event_type, payload, status, idempotency_key)
       VALUES ('communication', $1, $2, $3::jsonb, 'pending', $4)`,
      [
        input.id,
        input.channel === 'email' ? 'communication.email' : 'communication.sms',
        JSON.stringify({
          communicationId: input.id,
          template: input.template,
          recipient: input.recipient,
          variablesEnc: input.variablesEnc,
        }),
        input.idempotencyKey,
      ],
    );
    return { id: input.id, created: true };
  }
}
