export class ProviderRequestError extends Error {
  constructor(
    readonly retryable: boolean,
    readonly code: string,
  ) {
    super(code);
  }
}

export function failureForStatus(status: number): ProviderRequestError {
  if (status === 401 || status === 403) {
    return new ProviderRequestError(false, 'provider_auth');
  }
  if (status === 429) {
    return new ProviderRequestError(true, 'provider_rate_limit');
  }
  if (status >= 500) {
    return new ProviderRequestError(true, 'provider_unavailable');
  }
  return new ProviderRequestError(false, 'provider_rejected');
}
