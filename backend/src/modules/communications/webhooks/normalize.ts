import type { NormalizedWebhook } from '../types.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
}

export function normalizeMailjetEvent(body: unknown): NormalizedWebhook[] {
  const events = Array.isArray(body) ? body : [body];
  return events.flatMap((event) => {
    const record = asRecord(event);
    if (!record) {
      return [];
    }
    const providerStatus = (text(record.event) ?? text(record.Event) ?? 'unknown').toLowerCase();
    const status = providerStatus === 'sent'
      ? 'sent'
      : providerStatus === 'open' || providerStatus === 'click'
        ? 'delivered'
        : providerStatus === 'bounce' || providerStatus === 'blocked' || providerStatus === 'spam'
          ? 'failed'
          : null;
    if (!status) {
      return [];
    }
    return [{
      provider: 'mailjet',
      communicationId: text(record.CustomID) ?? text(record.customid),
      providerMessageId: text(record.MessageID) ?? text(record.messageid),
      status,
      providerStatus,
    }];
  });
}

export function normalizeTextBeeEvent(body: unknown): NormalizedWebhook[] {
  const record = asRecord(body);
  if (!record) {
    return [];
  }
  const data = asRecord(record.data) ?? record;
  const providerStatus = (text(data.status) ?? text(record.event) ?? 'unknown').toLowerCase();
  const status = providerStatus === 'pending' || providerStatus === 'dispatched' || providerStatus === 'sent'
    ? 'sent'
    : providerStatus === 'delivered'
      ? 'delivered'
      : providerStatus === 'failed'
        ? 'failed'
        : null;
  if (!status) {
    return [];
  }
  return [{
    provider: 'textbee',
    communicationId: text(data.communicationId) ?? text(record.communicationId),
    providerMessageId: text(data.smsBatchId) ?? text(data.smsId) ?? text(data.messageId),
    status,
    providerStatus,
  }];
}
