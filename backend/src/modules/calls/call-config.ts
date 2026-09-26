export type CallConfig = {
  livekitUrl: string;
  livekitApiKey: string;
  livekitApiSecret: string;
  ringTimeoutSeconds: number;
  billingIntervalSeconds: number;
  minBalance: number;
  reconnectGraceSeconds: number;
  tokenTtlSeconds: number;
};

function positive(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function readCallConfig(source: NodeJS.ProcessEnv = process.env, nodeEnv = source.NODE_ENV): CallConfig | null {
  const url = source.LIVEKIT_URL?.trim();
  if (!url) return null;
  if (nodeEnv === 'production' && !url.startsWith('wss://')) {
    throw new Error('LIVEKIT_URL must use wss:// in production');
  }
  const apiKey = source.LIVEKIT_API_KEY?.trim();
  const apiSecret = source.LIVEKIT_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required when LIVEKIT_URL is set');
  }
  return {
    livekitUrl: url,
    livekitApiKey: apiKey,
    livekitApiSecret: apiSecret,
    ringTimeoutSeconds: positive('CALL_RING_TIMEOUT_SECONDS', source.CALL_RING_TIMEOUT_SECONDS, 45),
    billingIntervalSeconds: positive('CALL_BILLING_INTERVAL_SECONDS', source.CALL_BILLING_INTERVAL_SECONDS, 60),
    minBalance: positive('CALL_MIN_BALANCE', source.CALL_MIN_BALANCE, 1),
    reconnectGraceSeconds: positive('CALL_RECONNECT_GRACE_SECONDS', source.CALL_RECONNECT_GRACE_SECONDS, 15),
    tokenTtlSeconds: positive('CALL_TOKEN_TTL_SECONDS', source.CALL_TOKEN_TTL_SECONDS, 600),
  };
}
