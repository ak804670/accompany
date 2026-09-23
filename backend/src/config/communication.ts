import type { NodeEnv } from './env.js';
import type { ProviderLimits } from '../modules/communications/types.js';

export type CommunicationConfig = {
  emailProvider: 'mailjet' | 'mock';
  smsProvider: 'textbee' | 'mock';
  revealMockDelivery: boolean;
  encryptionSecret: string;
  maxAttempts: number;
  pollIntervalMs: number;
  from: { email: string; name: string };
  limits: { email: ProviderLimits; sms: ProviderLimits };
  mailjet?: {
    apiKey: string;
    apiSecret: string;
    fromEmail: string;
    fromName: string;
    webhookSecret?: string;
  };
  textbee?: {
    apiKey: string;
    deviceId?: string;
    webhookSecret?: string;
  };
  mailjetWebhookSecret?: string;
  textbeeWebhookSecret?: string;
};

function optional(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return value;
}

function optionalLimit(name: string, value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

function limits(prefix: string, source: NodeJS.ProcessEnv): ProviderLimits {
  return {
    maxRequestsPerSecond: optionalLimit(`${prefix}_MAX_REQUESTS_PER_SECOND`, source[`${prefix}_MAX_REQUESTS_PER_SECOND`]),
    maxDailyMessages: optionalLimit(`${prefix}_MAX_DAILY_MESSAGES`, source[`${prefix}_MAX_DAILY_MESSAGES`]),
    maxMonthlyMessages: optionalLimit(`${prefix}_MAX_MONTHLY_MESSAGES`, source[`${prefix}_MAX_MONTHLY_MESSAGES`]),
  };
}

export function readCommunicationConfig(nodeEnv: NodeEnv, source: NodeJS.ProcessEnv = process.env): CommunicationConfig {
  const emailProvider = optional(source.EMAIL_PROVIDER) ?? (nodeEnv === 'development' ? 'mock' : '');
  const smsProvider = optional(source.SMS_PROVIDER) ?? (nodeEnv === 'development' ? 'mock' : '');
  if (emailProvider !== 'mailjet' && emailProvider !== 'mock') {
    throw new Error('EMAIL_PROVIDER must be mailjet or mock');
  }
  if (smsProvider !== 'textbee' && smsProvider !== 'mock') {
    throw new Error('SMS_PROVIDER must be textbee or mock');
  }

  const mailjetKey = optional(source.MAILJET_API_KEY);
  const mailjetSecret = optional(source.MAILJET_API_SECRET);
  const fromEmail = optional(source.MAILJET_FROM_EMAIL);
  const fromName = optional(source.MAILJET_FROM_NAME) ?? 'Accompany';
  const textbeeKey = optional(source.TEXTBEE_API_KEY);

  if (emailProvider === 'mailjet' && (!mailjetKey || !mailjetSecret || !fromEmail)) {
    throw new Error('MAILJET_API_KEY, MAILJET_API_SECRET, and MAILJET_FROM_EMAIL are required');
  }
  if (smsProvider === 'textbee' && !textbeeKey) {
    throw new Error('TEXTBEE_API_KEY is required');
  }

  const maxAttempts = optionalLimit('COMMUNICATION_MAX_ATTEMPTS', source.COMMUNICATION_MAX_ATTEMPTS) ?? 3;
  const pollIntervalMs = optionalLimit('COMMUNICATION_POLL_MS', source.COMMUNICATION_POLL_MS) ?? 2_000;

  return {
    emailProvider,
    smsProvider,
    revealMockDelivery: nodeEnv === 'development',
    encryptionSecret: source.JWT_ACCESS_SECRET ?? 'development-communication-secret',
    maxAttempts,
    pollIntervalMs,
    from: { email: fromEmail ?? 'no-reply@localhost', name: fromName },
    limits: { email: limits('EMAIL', source), sms: limits('SMS', source) },
    mailjet: mailjetKey && mailjetSecret && fromEmail
      ? {
          apiKey: mailjetKey,
          apiSecret: mailjetSecret,
          fromEmail,
          fromName,
          webhookSecret: optional(source.MAILJET_WEBHOOK_SECRET),
        }
      : undefined,
    textbee: textbeeKey
      ? {
          apiKey: textbeeKey,
          deviceId: optional(source.TEXTBEE_DEVICE_ID),
          webhookSecret: optional(source.TEXTBEE_WEBHOOK_SECRET),
        }
      : undefined,
    mailjetWebhookSecret: optional(source.MAILJET_WEBHOOK_SECRET),
    textbeeWebhookSecret: optional(source.TEXTBEE_WEBHOOK_SECRET),
  };
}
