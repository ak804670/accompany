import type { SqlClient } from '../../infrastructure/database/pool.js';

export type CommunicationChannel = 'email' | 'sms';
export type CommunicationPurpose = 'otp' | 'welcome' | 'security' | 'notification' | 'transactional';
export type CommunicationStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed';
export type InternalDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export type ScheduleInput = {
  db?: SqlClient | null;
  channel: CommunicationChannel;
  template: string;
  to: string;
  variables: Record<string, string>;
  purpose: CommunicationPurpose;
  idempotencyKey: string;
  userId?: string | null;
  metadata?: Record<string, string>;
};

export type CommunicationLog = {
  id: string;
  userId: string | null;
  channel: CommunicationChannel;
  provider: string;
  purpose: CommunicationPurpose;
  recipient: string;
  providerMessageId: string | null;
  providerStatus: string | null;
  status: CommunicationStatus;
  errorCode: string | null;
  errorMessage: string | null;
  idempotencyKey: string;
  createdAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
};

export type ClaimedJob = {
  outboxId: string;
  eventType: 'communication.email' | 'communication.sms';
  communicationId: string;
  retryCount: number;
  variablesEnc: string;
  template: string;
  recipient: string;
};

export type ProviderLimits = {
  maxRequestsPerSecond: number | null;
  maxDailyMessages: number | null;
  maxMonthlyMessages: number | null;
};

export type NormalizedWebhook = {
  provider: string;
  communicationId: string | null;
  providerMessageId: string | null;
  status: InternalDeliveryStatus;
  providerStatus: string;
};
