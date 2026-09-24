import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';

import { createApp } from '../../app.js';
import type { AuthService } from '../auth/auth.service.js';
import { MemoryMediaStorage } from './memory-storage.js';
import { MemoryProfileRepository } from './memory-repository.js';
import { ProfileService } from './profile.service.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);

function start() {
  const auth = {
    async session(token: string) {
      if (token !== 'good') {
        throw Object.assign(new Error('expired'), { code: 'SESSION_EXPIRED', status: 401, name: 'AuthError' });
      }
      return { user: { id: 'user-1' } };
    },
  };
  const app = createApp({
    nodeEnv: 'development',
    authService: auth as unknown as AuthService,
    profileService: new ProfileService(auth as unknown as AuthService, new MemoryProfileRepository(), new MemoryMediaStorage()),
  });
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

describe('profile http', () => {
  it('requires a session and returns the created profile', async () => {
    const server = start();
    try {
      const denied = await fetch(`${server.url}/v1/profile`);
      assert.equal(denied.status, 401);

      const created = await fetch(`${server.url}/v1/profile`, {
        method: 'POST',
        headers: { authorization: 'Bearer good', 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: 'Anish', dateOfBirth: '1998-04-02' }),
      });
      const body = (await created.json()) as { profile: { displayName: string; complete: boolean } };
      assert.equal(created.status, 201);
      assert.equal(body.profile.displayName, 'Anish');
      assert.equal(body.profile.complete, false);

      const interests = await fetch(`${server.url}/v1/interests?q=mus`, { headers: { authorization: 'Bearer good' } });
      const listed = (await interests.json()) as { interests: Array<{ slug: string }> };
      assert.equal(listed.interests[0]?.slug, 'music');

      const upload = await fetch(`${server.url}/v1/profile/media`, {
        method: 'POST',
        headers: { authorization: 'Bearer good', 'content-type': 'image/jpeg' },
        body: jpeg,
      });
      assert.equal(upload.status, 201);
    } finally {
      await server.close();
    }
  });
});
