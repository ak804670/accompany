import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test, { describe, it } from 'node:test';
import express from 'express';

import { createDeviceRouter } from './device.routes.js';
import type { DeviceStore } from './device.store.js';
import type { AuthService } from '../auth/auth.service.js';

class MemoryDeviceStore implements DeviceStore {
  tokens: Array<{ id: string; userId: string; platform: string; token: string; isActive: boolean }> = [];

  async activeTokens(userId: string) {
    return this.tokens
      .filter((t) => t.userId === userId && t.isActive)
      .map((t) => ({ id: t.id, token: t.token }));
  }

  async saveToken(userId: string, platform: 'ios' | 'android', token: string) {
    const existing = this.tokens.find((t) => t.token === token);
    if (existing) {
      existing.userId = userId;
      existing.platform = platform;
      existing.isActive = true;
    } else {
      this.tokens.push({
        id: `device-${this.tokens.length + 1}`,
        userId,
        platform,
        token,
        isActive: true,
      });
    }
  }

  async deactivateToken(userId: string, tokenId: string) {
    const existing = this.tokens.find((t) => t.id === tokenId && t.userId === userId);
    if (existing) existing.isActive = false;
  }

  async deactivateUserToken(userId: string, token: string) {
    const existing = this.tokens.find((t) => t.token === token && t.userId === userId);
    if (existing) existing.isActive = false;
  }

  async deactivateTokenValue(token: string) {
    const existing = this.tokens.find((t) => t.token === token);
    if (existing) existing.isActive = false;
  }
}

describe('device routes', () => {
  it('registers, deactivates on logout, and validates device tokens', async () => {
    const store = new MemoryDeviceStore();
    const fakeAuth = {
      session: async (token: string) => {
        if (token === 'valid-user-1') return { user: { id: 'u1' } };
        if (token === 'valid-user-2') return { user: { id: 'u2' } };
        throw new Error('UNAUTHORIZED');
      },
    } as unknown as AuthService;

    const app = express();
    app.use(express.json());
    app.use('/v1/devices', createDeviceRouter(fakeAuth, store));

    const server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}/v1/devices`;

    try {
      // 1. Missing Authorization header
      const resNoAuth = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'android', token: 'fcm-token-123' }),
      });
      assert.equal(resNoAuth.status, 401);

      // 2. Invalid platform
      const resBadPlatform = await fetch(base, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-1',
        },
        body: JSON.stringify({ platform: 'windows', token: 'fcm-token-123' }),
      });
      assert.equal(resBadPlatform.status, 400);

      // 3. Successful registration for user 1
      const resSuccess = await fetch(base, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-1',
        },
        body: JSON.stringify({ platform: 'android', token: 'fcm-token-123' }),
      });
      assert.equal(resSuccess.status, 204);
      assert.equal(store.tokens.length, 1);
      assert.equal(store.tokens[0]?.userId, 'u1');
      assert.equal(store.tokens[0]?.isActive, true);

      // 4. Token re-assigned if user 2 logs in on the same device
      const resReassign = await fetch(base, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-2',
        },
        body: JSON.stringify({ platform: 'android', token: 'fcm-token-123' }),
      });
      assert.equal(resReassign.status, 204);
      assert.equal(store.tokens.length, 1);
      assert.equal(store.tokens[0]?.userId, 'u2');
      assert.equal(store.tokens[0]?.isActive, true);

      // 5. User 1 cannot deactivate user 2's device via logout
      const resLogoutWrongUser = await fetch(`${base}/current`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-1',
        },
        body: JSON.stringify({ token: 'fcm-token-123' }),
      });
      assert.equal(resLogoutWrongUser.status, 204);
      assert.equal(store.tokens[0]?.isActive, true); // Still active because u1 does not own it

      // 6. User 2 deactivates token on logout
      const resLogoutSuccess = await fetch(`${base}/current`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-user-2',
        },
        body: JSON.stringify({ token: 'fcm-token-123' }),
      });
      assert.equal(resLogoutSuccess.status, 204);
      assert.equal(store.tokens[0]?.isActive, false);

      // 7. Deactivate by ID
      await store.saveToken('u1', 'ios', 'token-ios-999');
      const iosDevice = store.tokens.find((t) => t.token === 'token-ios-999');
      assert.ok(iosDevice);
      assert.equal(iosDevice.isActive, true);

      const resDeleteId = await fetch(`${base}/${iosDevice.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-user-1',
        },
      });
      assert.equal(resDeleteId.status, 204);
      assert.equal(iosDevice.isActive, false);
    } finally {
      server.close();
    }
  });
});
