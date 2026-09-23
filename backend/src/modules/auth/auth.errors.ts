export const authErrorCodes = [
  'INVALID_OTP',
  'OTP_EXPIRED',
  'OTP_TOO_MANY_ATTEMPTS',
  'OTP_RATE_LIMITED',
  'INVALID_DESTINATION',
  'SESSION_EXPIRED',
  'SESSION_REVOKED',
  'AUTH_UNAVAILABLE',
] as const;

export type AuthErrorCode = (typeof authErrorCodes)[number];

const messages: Record<AuthErrorCode, string> = {
  INVALID_OTP: 'That code is not valid. Try again.',
  OTP_EXPIRED: 'That code has expired. Request a new one.',
  OTP_TOO_MANY_ATTEMPTS: 'Too many attempts. Request a new code.',
  OTP_RATE_LIMITED: 'Too many attempts. Please wait and try again.',
  INVALID_DESTINATION: 'Check the phone number or email and try again.',
  SESSION_EXPIRED: 'Your session has expired. Sign in again.',
  SESSION_REVOKED: 'Your session is no longer valid. Sign in again.',
  AUTH_UNAVAILABLE: 'Something went wrong. Please try again.',
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;
  readonly retryAfterSeconds: number | undefined;

  constructor(code: AuthErrorCode, status: number, retryAfterSeconds?: number) {
    super(messages[code]);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
