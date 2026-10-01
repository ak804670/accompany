import { env } from '@/services/env';
import { secureStorage } from '@/services/storage';

import { ApiError, type ApiClient, type ApiRequestInit } from '@/services/api/types';

export type RefreshTokens = {
  accessToken: string;
  refreshToken: string;
};

type ApiClientDeps = {
  baseUrl: string;
  fetchFn?: typeof fetch;
  getAccessToken: () => Promise<string | null>;
  refresh: () => Promise<RefreshTokens | null>;
  onSessionLost: () => void;
};

type ApiAuthHandlers = {
  refresh: () => Promise<RefreshTokens | null>;
  onSessionLost: () => void;
};

let authHandlers: ApiAuthHandlers = {
  refresh: async () => null,
  onSessionLost: () => undefined,
};

export function configureApiAuth(handlers: ApiAuthHandlers) {
  authHandlers = handlers;
}

function resolveUrl(baseUrl: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const relative = path.startsWith('/') ? path.slice(1) : path;
  return new URL(relative, base).toString();
}

function parseBody(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function createApiClient(deps: ApiClientDeps): ApiClient {
  const fetchFn = deps.fetchFn ?? fetch;
  let inflightRefresh: Promise<RefreshTokens | null> | null = null;

  function refreshOnce() {
    if (!inflightRefresh) {
      inflightRefresh = deps
        .refresh()
        .then((tokens) => {
          if (!tokens) {
            deps.onSessionLost();
          }
          return tokens;
        })
        .finally(() => {
          inflightRefresh = null;
        });
    }

    return inflightRefresh;
  }

  async function request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    init?: ApiRequestInit,
    retried = false
  ): Promise<T> {
    if (!deps.baseUrl) {
      throw new ApiError('EXPO_PUBLIC_API_BASE_URL is not configured', 0, null);
    }

    const { rawBody, contentType, auth: _auth, headers: initHeaders, ...fetchInit } = init ?? {};
    const headers = new Headers(initHeaders);
    headers.set('Accept', 'application/json');

    if (rawBody) {
      headers.set('Content-Type', contentType ?? 'application/octet-stream');
    } else if (body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const useAuth = init?.auth !== false;
    if (useAuth) {
      const accessToken = await deps.getAccessToken();
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
    }

    const response = await fetchFn(resolveUrl(deps.baseUrl, path), {
      ...fetchInit,
      method,
      headers,
      body: (rawBody ? rawBody : body !== undefined ? JSON.stringify(body) : undefined) as BodyInit | undefined,
    });

    if (response.status === 401 && useAuth && !retried) {
      const refreshed = await refreshOnce();
      if (!refreshed) {
        throw new ApiError('Your session has expired. Sign in again.', 401, parseBody(await response.text()));
      }

      return request<T>(method, path, body, {
        ...init,
        headers: { Authorization: `Bearer ${refreshed.accessToken}` },
      }, true);
    }

    const parsed = parseBody(await response.text());

    if (!response.ok) {
      if (response.status === 401 && useAuth) {
        deps.onSessionLost();
      }
      throw new ApiError(response.statusText || 'Request failed', response.status, parsed);
    }

    return parsed as T;
  }

  return {
    get: (path, init) => request('GET', path, undefined, init),
    post: (path, body, init) => request('POST', path, body, init),
    put: (path, body, init) => request('PUT', path, body, init),
    patch: (path, body, init) => request('PATCH', path, body, init),
    upload: (path, body, contentType, init) =>
      request('POST', path, undefined, { ...init, rawBody: body, contentType }),
    delete: (path, init) => request('DELETE', path, undefined, init),
  };
}

export const apiClient = createApiClient({
  baseUrl: env.apiBaseUrl,
  getAccessToken: () => secureStorage.getAccessToken(),
  refresh: () => authHandlers.refresh(),
  onSessionLost: () => authHandlers.onSessionLost(),
});
