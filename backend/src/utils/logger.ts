const redacted = new Set([
  'otp',
  'accesstoken',
  'refreshtoken',
  'password',
  'authorization',
  'otpHash',
  'refreshTokenHash',
  'code',
  'apikey',
  'apisecret',
  'variablesenc',
  'secret',
]);

function sanitize(fields: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (redacted.has(key) || redacted.has(key.toLowerCase())) {
      continue;
    }

    safe[key] = value;
  }

  return safe;
}

function write(level: 'info' | 'error', event: string, fields: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...sanitize(fields),
  });

  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info(event: string, fields: Record<string, unknown> = {}) {
    write('info', event, fields);
  },
  error(event: string, fields: Record<string, unknown> = {}) {
    write('error', event, fields);
  },
};
