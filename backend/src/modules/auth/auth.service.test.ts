import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AppConfig } from '../../config/env.js';
import { MemoryRateLimiter } from '../../infrastructure/redis/rate-limit.js';
import { AuthError } from './auth.errors.js';
import { MemoryAuthRepository } from './memory-repository.js';
import { AuthService } from './auth.service.js';

const config: AppConfig = {
  nodeEnv: 'development',
  port: 4000,
  databaseUrl: 'postgres://localhost/test',
  redisUrl: 'redis://localhost',
  jwtAccessSecret: 'access-secret-access-secret-access',
  jwtRefreshSecret: 'refresh-secret-refresh-secret-refresh',
  accessTokenExpirySeconds: 900,
  refreshTokenExpirySeconds: 3600,
  otpExpirySeconds: 300,
  otpMaxAttempts: 5,
  otpResendSeconds: 30,
};

const context = { ip: '127.0.0.1', requestId: 'test' };

function setup(now = new Date('2026-09-23T00:00:00Z')) {
  const sent: string[] = [];
  const repository = new MemoryAuthRepository();
  let clock = now;
  const service = new AuthService({
    repository,
    rateLimiter: new MemoryRateLimiter(() => clock.getTime()),
    communications: {
      async schedule(input) {
        sent.push(input.variables.code ?? '');
        return { communicationId: input.idempotencyKey };
      },
    },
    config,
    now: () => clock,
  });

  return {
    service,
    repository,
    sent,
    advance(seconds: number) {
      clock = new Date(clock.getTime() + seconds * 1000);
    },
  };
}

describe('authentication service', () => {
  it('requests an OTP without returning the code', async () => {
    const { service, sent } = setup();
    const result = await service.requestOtp('email', 'User@Example.com', context);

    assert.equal(result.success, true);
    assert.equal(result.expiresIn, 300);
    assert.equal(sent.length, 1);
    assert.equal(JSON.stringify(result).includes(sent[0] ?? 'missing'), false);
  });

  it('creates a user and session for a valid OTP', async () => {
    const { service, sent, repository } = setup();
    await service.requestOtp('phone', '+14155552671', context);
    const result = await service.verifyOtp('phone', '+1 415 555 2671', sent[0]!, undefined, context);

    assert.equal(repository.users.length, 1);
    assert.equal(result.user.id, repository.users[0]?.id);
    assert.ok(result.session.accessToken);
    assert.ok(repository.users[0]?.lastLoginAt);
    const session = await service.session(result.session.accessToken);
    assert.equal(session.user.id, result.user.id);
  });

  it('logs in an existing user instead of creating another', async () => {
    const { service, sent, repository, advance } = setup();
    await service.requestOtp('email', 'user@example.com', context);
    await service.verifyOtp('email', 'user@example.com', sent[0]!, undefined, context);
    advance(31);
    await service.requestOtp('email', 'user@example.com', context);
    await service.verifyOtp('email', 'user@example.com', sent[1]!, undefined, context);

    assert.equal(repository.users.length, 1);
  });

  it('rejects an invalid OTP and blocks reuse', async () => {
    const { service, sent } = setup();
    await service.requestOtp('email', 'user@example.com', context);
    await assert.rejects(() => service.verifyOtp('email', 'user@example.com', '000000', undefined, context), (error: unknown) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, 'INVALID_OTP');
      return true;
    });

    await service.verifyOtp('email', 'user@example.com', sent[0]!, undefined, context);
    await assert.rejects(() => service.verifyOtp('email', 'user@example.com', sent[0]!, undefined, context), (error: unknown) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, 'INVALID_OTP');
      return true;
    });
  });

  it('rejects an expired OTP', async () => {
    const { service, sent, advance } = setup();
    await service.requestOtp('email', 'user@example.com', context);
    advance(301);
    await assert.rejects(() => service.verifyOtp('email', 'user@example.com', sent[0]!, undefined, context), (error: unknown) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, 'OTP_EXPIRED');
      return true;
    });
  });

  it('locks an OTP after the attempt limit', async () => {
    const { service } = setup();
    await service.requestOtp('email', 'user@example.com', context);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await assert.rejects(() => service.verifyOtp('email', 'user@example.com', '000000', undefined, context));
    }

    await assert.rejects(() => service.verifyOtp('email', 'user@example.com', '000000', undefined, context), (error: unknown) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, 'OTP_TOO_MANY_ATTEMPTS');
      return true;
    });
  });

  it('rate limits OTP requests for a destination', async () => {
    const { service, advance } = setup();

    for (let count = 0; count < 5; count += 1) {
      if (count > 0) {
        advance(31);
      }
      await service.requestOtp('email', 'user@example.com', context);
    }

    advance(31);
    await assert.rejects(() => service.requestOtp('email', 'user@example.com', context), (error: unknown) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, 'OTP_RATE_LIMITED');
      return true;
    });
  });

  it('rotates refresh tokens and rejects the previous token', async () => {
    const { service, sent } = setup();
    await service.requestOtp('email', 'user@example.com', context);
    const first = await service.verifyOtp('email', 'user@example.com', sent[0]!, undefined, context);
    const refreshed = await service.refresh(first.session.refreshToken, context);

    assert.notEqual(refreshed.session.refreshToken, first.session.refreshToken);
    await assert.rejects(() => service.refresh(first.session.refreshToken, context), (error: unknown) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, 'SESSION_REVOKED');
      return true;
    });
    const session = await service.session(refreshed.session.accessToken);
    assert.equal(session.user.id, first.user.id);
  });

  it('shares one refresh when the same token is used concurrently', async () => {
    const { service, sent } = setup();
    await service.requestOtp('email', 'user@example.com', context);
    const first = await service.verifyOtp('email', 'user@example.com', sent[0]!, undefined, context);
    const [left, right] = await Promise.all([
      service.refresh(first.session.refreshToken, context),
      service.refresh(first.session.refreshToken, context),
    ]);

    assert.equal(left.session.refreshToken, right.session.refreshToken);
    const session = await service.session(left.session.accessToken);
    assert.equal(session.user.id, first.user.id);
  });

  it('revokes a session on logout', async () => {
    const { service, sent } = setup();
    await service.requestOtp('email', 'user@example.com', context);
    const result = await service.verifyOtp('email', 'user@example.com', sent[0]!, undefined, context);
    await service.logout({ accessToken: result.session.accessToken }, context);

    await assert.rejects(() => service.session(result.session.accessToken), (error: unknown) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, 'SESSION_REVOKED');
      return true;
    });
    await assert.rejects(() => service.refresh(result.session.refreshToken, context), (error: unknown) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, 'SESSION_REVOKED');
      return true;
    });
  });
});
