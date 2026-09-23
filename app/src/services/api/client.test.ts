import { createApiClient } from '@/services/api/client';
import { ApiError } from '@/services/api/types';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('api client auth refresh', () => {
  it('retries a 401 once after a single refresh', async () => {
    const calls: string[] = [];
    let accessToken = 'expired';
    const fetchFn = jest.fn(async (_url: string, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get('Authorization');
      calls.push(authorization ?? 'none');
      if (authorization === 'Bearer fresh') {
        return jsonResponse(200, { ok: true });
      }
      return jsonResponse(401, {
        error: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Sign in again.' },
      });
    });

    const client = createApiClient({
      baseUrl: 'http://127.0.0.1:4000',
      fetchFn: fetchFn as typeof fetch,
      getAccessToken: async () => accessToken,
      refresh: async () => {
        accessToken = 'fresh';
        return { accessToken: 'fresh', refreshToken: 'rotated' };
      },
      onSessionLost: jest.fn(),
    });

    await expect(client.get<{ ok: boolean }>('/v1/example')).resolves.toEqual({ ok: true });
    expect(calls).toEqual(['Bearer expired', 'Bearer fresh']);
  });

  it('uses one refresh for concurrent 401 responses', async () => {
    let refreshCalls = 0;
    let releaseRefresh: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let accessToken = 'expired';
    const fetchFn = jest.fn(async (_url: string, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get('Authorization');
      if (authorization === 'Bearer fresh') {
        return jsonResponse(200, { ok: true });
      }
      return jsonResponse(401, {
        error: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Sign in again.' },
      });
    });
    const client = createApiClient({
      baseUrl: 'http://127.0.0.1:4000',
      fetchFn: fetchFn as typeof fetch,
      getAccessToken: async () => accessToken,
      refresh: async () => {
        refreshCalls += 1;
        await gate;
        accessToken = 'fresh';
        return { accessToken: 'fresh', refreshToken: 'rotated' };
      },
      onSessionLost: jest.fn(),
    });

    const pending = Promise.all([
      client.get('/v1/a'),
      client.get('/v1/b'),
      client.get('/v1/c'),
    ]);

    for (let attempt = 0; attempt < 10 && refreshCalls < 1; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    releaseRefresh();

    await expect(pending).resolves.toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshCalls).toBe(1);
  });

  it('clears the session when refresh fails', async () => {
    const onSessionLost = jest.fn();
    const fetchFn = jest.fn(async () =>
      jsonResponse(401, {
        error: { code: 'SESSION_REVOKED', message: 'Your session is no longer valid. Sign in again.' },
      })
    );
    const client = createApiClient({
      baseUrl: 'http://127.0.0.1:4000',
      fetchFn: fetchFn as typeof fetch,
      getAccessToken: async () => 'expired',
      refresh: async () => null,
      onSessionLost,
    });

    await expect(client.get('/v1/example')).rejects.toBeInstanceOf(ApiError);
    expect(onSessionLost).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
