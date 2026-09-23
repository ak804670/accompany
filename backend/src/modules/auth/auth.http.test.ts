import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';

import { createApp } from '../../app.js';
import type { AppConfig } from '../../config/env.js';
import { MemoryRateLimiter } from '../../infrastructure/redis/rate-limit.js';
import { MemoryAuthRepository } from './memory-repository.js';
import { AuthService } from './auth.service.js';

const config: AppConfig = {
  nodeEnv: 'development',
  port: 0,
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

async function start() {
  const sent: string[] = [];
  const app = createApp({
    nodeEnv: 'development',
    authService: new AuthService({
      repository: new MemoryAuthRepository(),
      rateLimiter: new MemoryRateLimiter(),
      communications: {
        async schedule(input) {
          sent.push(input.variables.code ?? '');
          return { communicationId: input.idempotencyKey };
        },
      },
      config,
    }),
  });
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;

  return {
    sent,
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

describe('auth http', () => {
  it('does not return an OTP from request-otp and rejects HTTPS-less staging traffic', async () => {
    const server = await start();

    try {
      const response = await fetch(`${server.url}/v1/auth/request-otp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel: 'email', destination: 'user@example.com' }),
      });
      const body = (await response.json()) as { success: boolean; otp?: string };

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.otp, undefined);
      assert.equal(JSON.stringify(body).includes(server.sent[0] ?? 'x'), false);
    } finally {
      await server.close();
    }
  });

  it('requires https outside development', async () => {
    const app = createApp({
      nodeEnv: 'production',
      authService: new AuthService({
        repository: new MemoryAuthRepository(),
        rateLimiter: new MemoryRateLimiter(),
        communications: { async schedule() { return { communicationId: 'unused' }; } },
        config,
      }),
    });
    const server = app.listen(0);
    const port = (server.address() as AddressInfo).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/auth/request-otp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel: 'email', destination: 'user@example.com' }),
      });
      assert.equal(response.status, 403);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
