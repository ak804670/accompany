import { randomUUID } from 'node:crypto';

import type { SqlClient } from '../../infrastructure/database/pool.js';
import type { AuthRepository, NewOtp, NewSession } from './auth.repository.js';
import type { DeviceInput, OtpChannel, OtpRecord, SessionRecord, UserRecord, UserStatus } from './auth.types.js';

export class MemoryAuthRepository implements AuthRepository {
  readonly otps: OtpRecord[] = [];
  readonly users: UserRecord[] = [];
  readonly identities: { userId: string; provider: 'phone' | 'email'; subject: string }[] = [];
  readonly sessions: SessionRecord[] = [];
  readonly devices: { id: string; userId: string; deviceIdentifier: string }[] = [];

  async transaction<T>(work: (db: SqlClient) => Promise<T>): Promise<T> {
    return work({
      query: async () => ({ rows: [] }),
    });
  }

  async insertOtp(input: NewOtp): Promise<OtpRecord> {
    const record: OtpRecord = {
      id: randomUUID(),
      destination: input.destination,
      channel: input.channel,
      otpHash: input.otpHash,
      expiresAt: input.expiresAt,
      attemptCount: 0,
      verifiedAt: null,
      purpose: 'otp',
      status: 'pending',
    };
    this.otps.push(record);
    return record;
  }

  async findLatestOtp(destination: string, channel: OtpChannel): Promise<OtpRecord | null> {
    const matches = this.otps.filter((otp) => otp.destination === destination && otp.channel === channel);
    return matches.at(-1) ?? null;
  }

  async saveOtp(record: OtpRecord): Promise<void> {
    const index = this.otps.findIndex((otp) => otp.id === record.id);
    if (index >= 0) {
      this.otps[index] = record;
    }
  }

  async findUserByIdentity(provider: 'phone' | 'email', subject: string): Promise<UserRecord | null> {
    const identity = this.identities.find((item) => item.provider === provider && item.subject === subject);
    return this.users.find((user) => user.id === identity?.userId) ?? null;
  }

  async createUser(status: UserStatus = 'active'): Promise<UserRecord> {
    const now = new Date();
    const user: UserRecord = {
      id: randomUUID(),
      status,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };
    this.users.push(user);
    return user;
  }

  async createIdentity(input: {
    userId: string;
    provider: 'phone' | 'email';
    subject: string;
    email: string | null;
    phone: string | null;
  }): Promise<void> {
    this.identities.push({ userId: input.userId, provider: input.provider, subject: input.subject });
  }

  async touchLogin(userId: string, at: Date): Promise<void> {
    const user = this.users.find((item) => item.id === userId);
    if (user) {
      user.lastLoginAt = at;
      user.updatedAt = at;
    }
  }

  async upsertDevice(userId: string, device: DeviceInput, _seenAt: Date): Promise<string> {
    const existing = this.devices.find((item) => item.deviceIdentifier === device.deviceIdentifier);
    if (existing) {
      existing.userId = userId;
      return existing.id;
    }

    const id = randomUUID();
    this.devices.push({ id, userId, deviceIdentifier: device.deviceIdentifier });
    return id;
  }

  async createSession(input: NewSession): Promise<SessionRecord> {
    const now = new Date();
    const session: SessionRecord = {
      id: input.id,
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      deviceId: input.deviceId,
      platform: input.platform,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
    };
    this.sessions.push(session);
    return session;
  }

  async findSessionById(id: string): Promise<SessionRecord | null> {
    return this.sessions.find((session) => session.id === id) ?? null;
  }

  async findSessionByRefreshHash(hash: string): Promise<SessionRecord | null> {
    return this.sessions.find((session) => session.refreshTokenHash === hash) ?? null;
  }

  async rotateSession(id: string, refreshTokenHash: string, expiresAt: Date, usedAt: Date): Promise<void> {
    const session = this.sessions.find((item) => item.id === id && !item.revokedAt);
    if (session) {
      session.refreshTokenHash = refreshTokenHash;
      session.expiresAt = expiresAt;
      session.lastUsedAt = usedAt;
    }
  }

  async revokeSession(id: string, at: Date): Promise<void> {
    const session = this.sessions.find((item) => item.id === id && !item.revokedAt);
    if (session) {
      session.revokedAt = at;
      session.lastUsedAt = at;
    }
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }
}
