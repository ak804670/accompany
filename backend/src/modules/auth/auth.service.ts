import { randomUUID } from 'node:crypto';

import { SignJWT, jwtVerify } from 'jose';

import type { AppConfig } from '../../config/env.js';
import type { ScheduleInput } from '../communications/types.js';
import type { RateLimiter } from '../../infrastructure/redis/rate-limit.js';
import { hashesMatch, hmacSha256, randomOtp, randomToken } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import { AuthError } from './auth.errors.js';
import type { AuthRepository } from './auth.repository.js';
import type { AuthChannel, DeviceInput, OtpChannel, RequestContext, UserRecord } from './auth.types.js';
import { normalizeDestination } from './auth.validation.js';

const destinationWindowSeconds = 10 * 60;
const destinationOtpLimit = 5;
const ipOtpLimit = 20;
const refreshLimit = 30;

function otpChannel(channel: AuthChannel): OtpChannel {
  return channel === 'phone' ? 'sms' : 'email';
}

function maskDestination(channel: AuthChannel, destination: string): string {
  if (channel === 'email') {
    const [name, domain] = destination.split('@');
    return `${name?.slice(0, 1) ?? '*'}***@${domain ?? 'invalid'}`;
  }

  return `${destination.slice(0, 3)}***${destination.slice(-2)}`;
}

export type OtpScheduler = {
  schedule(input: ScheduleInput): Promise<{ communicationId: string }>;
};

export type AuthServiceDeps = {
  repository: AuthRepository;
  rateLimiter: RateLimiter;
  communications: OtpScheduler;
  config: AppConfig;
  now?: () => Date;
};

export class AuthService {
  private readonly now: () => Date;
  private readonly inflightRefresh = new Map<string, Promise<Awaited<ReturnType<AuthService['performRefresh']>>>>();

  constructor(private readonly deps: AuthServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  async requestOtp(channel: AuthChannel, rawDestination: string, context: RequestContext) {
    const destination = normalizeDestination(channel, rawDestination);
    await this.consumeLimit(
      `otp:dest:${channel}:${destination}`,
      destinationOtpLimit,
      destinationWindowSeconds,
    );
    await this.consumeLimit(`otp:ip:${context.ip}`, ipOtpLimit, destinationWindowSeconds);

    const latest = await this.deps.repository.findLatestOtp(destination, otpChannel(channel));
    if (
      latest &&
      !latest.verifiedAt &&
      this.now().getTime() - (latest.expiresAt.getTime() - this.deps.config.otpExpirySeconds * 1000) <
        this.deps.config.otpResendSeconds * 1000
    ) {
      throw new AuthError('OTP_RATE_LIMITED', 429, this.deps.config.otpResendSeconds);
    }

    const otp = randomOtp();
    const expiresAt = new Date(this.now().getTime() + this.deps.config.otpExpirySeconds * 1000);
    try {
      await this.deps.repository.transaction(async (db) => {
        const record = await this.deps.repository.insertOtp(
          {
            destination,
            channel: otpChannel(channel),
            otpHash: hmacSha256(this.deps.config.jwtAccessSecret, `${channel}:${destination}:${otp}`),
            expiresAt,
          },
          db,
        );
        await this.deps.communications.schedule({
          db,
          channel: otpChannel(channel),
          template: 'auth.otp',
          to: destination,
          variables: { code: otp },
          purpose: 'otp',
          idempotencyKey: record.id,
          userId: null,
        });
      });
    } catch (error) {
      logger.error('OTP delivery failed', { requestId: context.requestId, channel });
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('AUTH_UNAVAILABLE', 503);
    }

    logger.info('OTP requested', {
      requestId: context.requestId,
      channel,
      destination: maskDestination(channel, destination),
    });

    return {
      success: true as const,
      expiresIn: this.deps.config.otpExpirySeconds,
      resendAfter: this.deps.config.otpResendSeconds,
    };
  }

  async verifyOtp(
    channel: AuthChannel,
    rawDestination: string,
    otp: string,
    device: DeviceInput | undefined,
    context: RequestContext,
  ) {
    const destination = normalizeDestination(channel, rawDestination);
    await this.consumeLimit(
      `verify:dest:${channel}:${destination}`,
      this.deps.config.otpMaxAttempts * 2,
      destinationWindowSeconds,
    );

    const record = await this.deps.repository.findLatestOtp(destination, otpChannel(channel));
    if (!record || record.verifiedAt) {
      logger.info('OTP verification failed', { requestId: context.requestId, reason: 'missing' });
      throw new AuthError('INVALID_OTP', 401);
    }

    if (record.expiresAt.getTime() <= this.now().getTime()) {
      logger.info('OTP verification failed', { requestId: context.requestId, reason: 'expired' });
      throw new AuthError('OTP_EXPIRED', 401);
    }

    if (record.attemptCount >= this.deps.config.otpMaxAttempts) {
      logger.info('OTP verification failed', { requestId: context.requestId, reason: 'attempts' });
      throw new AuthError('OTP_TOO_MANY_ATTEMPTS', 429);
    }

    const expected = hmacSha256(this.deps.config.jwtAccessSecret, `${channel}:${destination}:${otp}`);
    if (!hashesMatch(record.otpHash, expected)) {
      record.attemptCount += 1;
      record.status = record.attemptCount >= this.deps.config.otpMaxAttempts ? 'locked' : 'pending';
      await this.deps.repository.saveOtp(record);
      logger.info('OTP verification failed', { requestId: context.requestId, reason: 'mismatch' });
      if (record.attemptCount >= this.deps.config.otpMaxAttempts) {
        throw new AuthError('OTP_TOO_MANY_ATTEMPTS', 429);
      }
      throw new AuthError('INVALID_OTP', 401);
    }

    record.verifiedAt = this.now();
    record.status = 'verified';
    await this.deps.repository.saveOtp(record);

    const user = await this.findOrCreateUser(channel, destination);
    if (user.status !== 'active') {
      throw new AuthError('AUTH_UNAVAILABLE', 403);
    }

    const session = await this.issueSession(user, device, context);
    await this.deps.repository.touchLogin(user.id, this.now());
    logger.info('OTP verification succeeded', { requestId: context.requestId, userId: user.id });
    logger.info('Session created', { requestId: context.requestId, userId: user.id, sessionId: session.sessionId });

    return session;
  }

  async refresh(refreshToken: string, context: RequestContext) {
    const hash = hmacSha256(this.deps.config.jwtRefreshSecret, refreshToken);
    const pending = this.inflightRefresh.get(hash);
    if (pending) {
      return pending;
    }

    const work = this.performRefresh(refreshToken, context);
    this.inflightRefresh.set(hash, work);

    try {
      return await work;
    } finally {
      this.inflightRefresh.delete(hash);
    }
  }

  private async performRefresh(refreshToken: string, context: RequestContext) {
    await this.consumeLimit(`refresh:ip:${context.ip}`, refreshLimit, destinationWindowSeconds);
    const hash = hmacSha256(this.deps.config.jwtRefreshSecret, refreshToken);
    const session = await this.deps.repository.findSessionByRefreshHash(hash);

    if (!session) {
      throw new AuthError('SESSION_REVOKED', 401);
    }

    if (session.revokedAt) {
      throw new AuthError('SESSION_REVOKED', 401);
    }

    if (session.expiresAt.getTime() <= this.now().getTime()) {
      await this.deps.repository.revokeSession(session.id, this.now());
      throw new AuthError('SESSION_EXPIRED', 401);
    }

    const user = await this.deps.repository.findUserById(session.userId);
    if (!user || user.status !== 'active') {
      await this.deps.repository.revokeSession(session.id, this.now());
      throw new AuthError('SESSION_REVOKED', 401);
    }

    const next = await this.tokenPair(user.id, session.id);
    const expiresAt = new Date(this.now().getTime() + this.deps.config.refreshTokenExpirySeconds * 1000);
    await this.deps.repository.rotateSession(
      session.id,
      hmacSha256(this.deps.config.jwtRefreshSecret, next.refreshToken),
      expiresAt,
      this.now(),
    );
    logger.info('Session refreshed', { requestId: context.requestId, userId: user.id, sessionId: session.id });

    return {
      user: { id: user.id },
      session: {
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        expiresIn: this.deps.config.accessTokenExpirySeconds,
      },
    };
  }

  async logout(input: { accessToken?: string; refreshToken?: string }, context: RequestContext) {
    const sessionId = input.accessToken ? await this.readSessionId(input.accessToken) : null;

    if (sessionId) {
      await this.deps.repository.revokeSession(sessionId, this.now());
      logger.info('Session revoked', { requestId: context.requestId, sessionId });
    } else if (input.refreshToken) {
      const hash = hmacSha256(this.deps.config.jwtRefreshSecret, input.refreshToken);
      const session = await this.deps.repository.findSessionByRefreshHash(hash);
      if (session) {
        await this.deps.repository.revokeSession(session.id, this.now());
        logger.info('Session revoked', { requestId: context.requestId, sessionId: session.id });
      }
    }

    logger.info('Logout', { requestId: context.requestId });
  }

  async session(accessToken: string) {
    const { userId, sessionId } = await this.verifyAccessToken(accessToken);
    const [user, session] = await Promise.all([
      this.deps.repository.findUserById(userId),
      this.deps.repository.findSessionById(sessionId),
    ]);

    if (!session || session.revokedAt || session.userId !== userId) {
      throw new AuthError('SESSION_REVOKED', 401);
    }

    if (session.expiresAt.getTime() <= this.now().getTime()) {
      throw new AuthError('SESSION_EXPIRED', 401);
    }

    if (!user || user.status !== 'active') {
      throw new AuthError('SESSION_REVOKED', 401);
    }

    return { user: { id: user.id } };
  }

  private async findOrCreateUser(channel: AuthChannel, destination: string): Promise<UserRecord> {
    const existing = await this.deps.repository.findUserByIdentity(channel, destination);
    if (existing) {
      return existing;
    }

    const user = await this.deps.repository.createUser('active');
    await this.deps.repository.createIdentity({
      userId: user.id,
      provider: channel,
      subject: destination,
      email: channel === 'email' ? destination : null,
      phone: channel === 'phone' ? destination : null,
    });
    return user;
  }

  private async issueSession(user: UserRecord, device: DeviceInput | undefined, context: RequestContext) {
    const deviceId = device
      ? await this.deps.repository.upsertDevice(user.id, device, this.now())
      : null;
    const sessionId = randomUUID();
    const tokens = await this.tokenPair(user.id, sessionId);
    const expiresAt = new Date(this.now().getTime() + this.deps.config.refreshTokenExpirySeconds * 1000);
    await this.deps.repository.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: hmacSha256(this.deps.config.jwtRefreshSecret, tokens.refreshToken),
      deviceId,
      platform: device?.platform ?? null,
      expiresAt,
    });

    return {
      user: { id: user.id },
      session: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.deps.config.accessTokenExpirySeconds,
      },
      sessionId,
    };
  }

  private async tokenPair(userId: string, sessionId: string) {
    const accessToken = await new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt(Math.floor(this.now().getTime() / 1000))
      .setExpirationTime(`${this.deps.config.accessTokenExpirySeconds}s`)
      .sign(new TextEncoder().encode(this.deps.config.jwtAccessSecret));

    return { accessToken, refreshToken: randomToken() };
  }

  private async verifyAccessToken(accessToken: string): Promise<{ userId: string; sessionId: string }> {
    try {
      const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(this.deps.config.jwtAccessSecret));
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
        throw new AuthError('SESSION_EXPIRED', 401);
      }
      return { userId: payload.sub, sessionId: payload.sid };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('SESSION_EXPIRED', 401);
    }
  }

  private async readSessionId(accessToken: string): Promise<string | null> {
    try {
      const verified = await this.verifyAccessToken(accessToken);
      return verified.sessionId;
    } catch {
      return null;
    }
  }

  private async consumeLimit(key: string, limit: number, windowSeconds: number) {
    const result = await this.deps.rateLimiter.consume(key, limit, windowSeconds);
    if (!result.allowed) {
      throw new AuthError('OTP_RATE_LIMITED', 429, result.retryAfterSeconds);
    }
  }
}
