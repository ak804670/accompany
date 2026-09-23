export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export type ApiRequestInit = RequestInit & {
  auth?: boolean;
};

export type ApiClient = {
  get<T>(path: string, init?: ApiRequestInit): Promise<T>;
  post<T>(path: string, body?: unknown, init?: ApiRequestInit): Promise<T>;
  put<T>(path: string, body?: unknown, init?: ApiRequestInit): Promise<T>;
  delete<T>(path: string, init?: ApiRequestInit): Promise<T>;
};
