import { randomUUID } from 'node:crypto';

import type { Pool, PoolClient } from 'pg';

import type { SqlClient } from '../../infrastructure/database/pool.js';

import type {
  DeviceInput,
  OtpChannel,
  OtpRecord,
  SessionRecord,
  UserRecord,
  UserStatus,
} from './auth.types.js';

export type NewOtp = {
  destination: string;
  channel: OtpChannel;
  otpHash: string;
  expiresAt: Date;
};

export type NewSession = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceId: string | null;
  platform: string | null;
  expiresAt: Date;
};

export interface AuthRepository {
  transaction<T>(work: (db: SqlClient) => Promise<T>): Promise<T>;
  insertOtp(input: NewOtp, db?: SqlClient): Promise<OtpRecord>;
  findLatestOtp(destination: string, channel: OtpChannel): Promise<OtpRecord | null>;
  saveOtp(record: OtpRecord): Promise<void>;
  findUserByIdentity(provider: 'phone' | 'email', subject: string): Promise<UserRecord | null>;
  createUser(status?: UserStatus): Promise<UserRecord>;
  createIdentity(input: {
    userId: string;
    provider: 'phone' | 'email';
    subject: string;
    email: string | null;
    phone: string | null;
  }): Promise<void>;
  touchLogin(userId: string, at: Date): Promise<void>;
  upsertDevice(userId: string, device: DeviceInput, seenAt: Date): Promise<string>;
  createSession(input: NewSession): Promise<SessionRecord>;
  findSessionByRefreshHash(hash: string): Promise<SessionRecord | null>;
  findSessionById(id: string): Promise<SessionRecord | null>;
  rotateSession(id: string, refreshTokenHash: string, expiresAt: Date, usedAt: Date): Promise<void>;
  revokeSession(id: string, at: Date): Promise<void>;
  findUserById(id: string): Promise<UserRecord | null>;
}

function mapUser(row: {
  id: string;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}): UserRecord {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function mapOtp(row: {
  id: string;
  destination: string;
  channel: OtpChannel;
  otp_hash: string;
  expires_at: Date;
  attempt_count: number;
  verified_at: Date | null;
  purpose: 'otp';
  status: OtpRecord['status'];
}): OtpRecord {
  return {
    id: row.id,
    destination: row.destination,
    channel: row.channel,
    otpHash: row.otp_hash,
    expiresAt: row.expires_at,
    attemptCount: row.attempt_count,
    verifiedAt: row.verified_at,
    purpose: row.purpose,
    status: row.status,
  };
}

function mapSession(row: {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  device_id: string | null;
  platform: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
  last_used_at: Date;
}): SessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    deviceId: row.device_id,
    platform: row.platform,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export class PgAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool) {}

  async transaction<T>(work: (db: SqlClient) => Promise<T>): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async insertOtp(input: NewOtp, db: SqlClient = this.pool): Promise<OtpRecord> {
    const id = randomUUID();
    const result = await db.query(
      `INSERT INTO otp_verifications (id, destination, channel, otp_hash, expires_at, purpose, status)
       VALUES ($1, $2, $3, $4, $5, 'otp', 'pending')
       RETURNING id, destination, channel, otp_hash, expires_at, attempt_count, verified_at, purpose, status`,
      [id, input.destination, input.channel, input.otpHash, input.expiresAt],
    );
    return mapOtp(result.rows[0] as Parameters<typeof mapOtp>[0]);
  }

  async findLatestOtp(destination: string, channel: OtpChannel): Promise<OtpRecord | null> {
    const result = await this.pool.query(
      `SELECT id, destination, channel, otp_hash, expires_at, attempt_count, verified_at, purpose, status
       FROM otp_verifications
       WHERE destination = $1 AND channel = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [destination, channel],
    );
    return result.rows[0] ? mapOtp(result.rows[0] as Parameters<typeof mapOtp>[0]) : null;
  }

  async saveOtp(record: OtpRecord): Promise<void> {
    await this.pool.query(
      `UPDATE otp_verifications
       SET attempt_count = $2, verified_at = $3, expires_at = $4, status = $5
       WHERE id = $1`,
      [record.id, record.attemptCount, record.verifiedAt, record.expiresAt, record.status],
    );
  }

  async findUserByIdentity(provider: 'phone' | 'email', subject: string): Promise<UserRecord | null> {
    const result = await this.pool.query(
      `SELECT u.id, u.status, u.created_at, u.updated_at, u.last_login_at
       FROM auth_identities i
       JOIN users u ON u.id = i.user_id
       WHERE i.provider = $1 AND i.provider_subject = $2`,
      [provider, subject],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async createUser(status: UserStatus = 'active'): Promise<UserRecord> {
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO users (id, status) VALUES ($1, $2)
       RETURNING id, status, created_at, updated_at, last_login_at`,
      [id, status],
    );
    return mapUser(result.rows[0]);
  }

  async createIdentity(input: {
    userId: string;
    provider: 'phone' | 'email';
    subject: string;
    email: string | null;
    phone: string | null;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO auth_identities (id, user_id, provider, provider_subject, email, phone)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), input.userId, input.provider, input.subject, input.email, input.phone],
    );
  }

  async touchLogin(userId: string, at: Date): Promise<void> {
    await this.pool.query(
      `UPDATE users SET last_login_at = $2, updated_at = $2 WHERE id = $1`,
      [userId, at],
    );
  }

  async upsertDevice(userId: string, device: DeviceInput, seenAt: Date): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO devices (id, user_id, device_identifier, platform, app_version, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (device_identifier)
       DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform,
         app_version = EXCLUDED.app_version, last_seen_at = EXCLUDED.last_seen_at
       RETURNING id`,
      [
        randomUUID(),
        userId,
        device.deviceIdentifier,
        device.platform,
        device.appVersion ?? null,
        seenAt,
      ],
    );
    return result.rows[0].id as string;
  }

  async createSession(input: NewSession): Promise<SessionRecord> {
    const result = await this.pool.query(
      `INSERT INTO sessions (id, user_id, refresh_token_hash, device_id, platform, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, refresh_token_hash, device_id, platform, expires_at, revoked_at, created_at, last_used_at`,
      [
        input.id,
        input.userId,
        input.refreshTokenHash,
        input.deviceId,
        input.platform,
        input.expiresAt,
      ],
    );
    return mapSession(result.rows[0]);
  }

  async findSessionById(id: string): Promise<SessionRecord | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, refresh_token_hash, device_id, platform, expires_at, revoked_at, created_at, last_used_at
       FROM sessions WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapSession(result.rows[0]) : null;
  }

  async findSessionByRefreshHash(hash: string): Promise<SessionRecord | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, refresh_token_hash, device_id, platform, expires_at, revoked_at, created_at, last_used_at
       FROM sessions WHERE refresh_token_hash = $1`,
      [hash],
    );
    return result.rows[0] ? mapSession(result.rows[0]) : null;
  }

  async rotateSession(id: string, refreshTokenHash: string, expiresAt: Date, usedAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE sessions
       SET refresh_token_hash = $2, expires_at = $3, last_used_at = $4
       WHERE id = $1 AND revoked_at IS NULL`,
      [id, refreshTokenHash, expiresAt, usedAt],
    );
  }

  async revokeSession(id: string, at: Date): Promise<void> {
    await this.pool.query(
      `UPDATE sessions SET revoked_at = $2, last_used_at = $2 WHERE id = $1 AND revoked_at IS NULL`,
      [id, at],
    );
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query(
      `SELECT id, status, created_at, updated_at, last_login_at FROM users WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }
}
