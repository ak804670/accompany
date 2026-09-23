import { logger } from '../../utils/logger.js';
import { maskRecipient } from './mask.js';
import { decryptVariables } from './payload.js';
import { ProviderRequestError } from './providers/errors.js';
import type { EmailProvider } from './providers/email/EmailProvider.js';
import type { SmsProvider } from './providers/sms/SmsProvider.js';
import type { CommunicationStore } from './store.js';
import { renderEmailTemplate, renderSmsTemplate } from './templates/index.js';
import type { ClaimedJob, ProviderLimits } from './types.js';

const retryDelaysMs = [5_000, 20_000, 60_000];

export class CommunicationWorker {
  constructor(
    private readonly store: CommunicationStore,
    private readonly email: EmailProvider,
    private readonly sms: SmsProvider,
    private readonly encryptionSecret: string,
    private readonly limits: { email: ProviderLimits; sms: ProviderLimits },
    private readonly maxAttempts: number,
    private readonly from: { email: string; name: string },
    private readonly now: () => Date = () => new Date(),
  ) {}

  async processAvailable(limit = 20): Promise<number> {
    const jobs = await this.store.claim(limit, this.now());
    for (const job of jobs) {
      await this.processOne(job);
    }
    return jobs.length;
  }

  private async processOne(job: ClaimedJob): Promise<void> {
    const log = await this.store.get(job.communicationId);
    if (!log) {
      return;
    }
    if (log.status === 'sent' || log.status === 'delivered') {
      await this.store.markSent(log.id, job.outboxId, log.provider, log.providerMessageId, log.providerStatus ?? 'sent', log.sentAt ?? this.now());
      return;
    }
    if (log.status === 'sending' && !log.providerMessageId) {
      await this.store.markFailed(job.outboxId, log.id, 'ambiguous_delivery', this.now());
      logger.error('communication delivery ambiguous', {
        channel: log.channel,
        purpose: log.purpose,
        recipient: maskRecipient(log.channel, log.recipient),
      });
      return;
    }

    const channel = job.eventType === 'communication.email' ? 'email' : 'sms';
    if (await this.overLimit(channel)) {
      await this.store.defer(job.outboxId, new Date(this.now().getTime() + 1_000));
      return;
    }

    await this.store.markSending(log.id);
    try {
      const variables = decryptVariables(this.encryptionSecret, job.variablesEnc);
      const sent = channel === 'email'
        ? await this.sendEmail(job, variables)
        : await this.sendSms(job, variables);
      await this.store.markSent(log.id, job.outboxId, sent.provider, sent.providerMessageId, sent.providerStatus, this.now());
      logger.info('communication sent', {
        channel,
        provider: sent.provider,
        purpose: log.purpose,
        recipient: maskRecipient(channel, job.recipient),
        providerMessageId: sent.providerMessageId,
        status: 'sent',
      });
    } catch (error) {
      const retryable = error instanceof ProviderRequestError ? error.retryable : true;
      const code = error instanceof ProviderRequestError ? error.code : 'provider_unavailable';
      const nextAttempt = job.retryCount + 1;
      if (retryable && nextAttempt < this.maxAttempts) {
        const delay = retryDelaysMs[Math.min(job.retryCount, retryDelaysMs.length - 1)] ?? 60_000;
        await this.store.markRetry(job.outboxId, log.id, nextAttempt, new Date(this.now().getTime() + delay), code);
        return;
      }
      await this.store.markFailed(job.outboxId, log.id, code, this.now());
      logger.error('communication failed', {
        channel,
        purpose: log.purpose,
        recipient: maskRecipient(channel, job.recipient),
        errorCode: code,
        status: 'failed',
      });
    }
  }

  private async sendEmail(job: ClaimedJob, variables: Record<string, string>) {
    const rendered = renderEmailTemplate(job.template, variables);
    const result = await this.email.sendEmail({
      to: job.recipient,
      from: this.from,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      idempotencyKey: job.communicationId,
    });
    return { ...result, provider: this.email.name };
  }

  private async sendSms(job: ClaimedJob, variables: Record<string, string>) {
    const result = await this.sms.sendSms({
      to: job.recipient,
      text: renderSmsTemplate(job.template, variables),
      idempotencyKey: job.communicationId,
    });
    return { ...result, provider: this.sms.name };
  }

  private async overLimit(channel: 'email' | 'sms'): Promise<boolean> {
    const limits = this.limits[channel];
    const now = this.now();
    const checks: Array<[number | null, Date]> = [
      [limits.maxRequestsPerSecond, new Date(now.getTime() - 1_000)],
      [limits.maxDailyMessages, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))],
      [limits.maxMonthlyMessages, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))],
    ];
    for (const [limit, since] of checks) {
      if (limit === null) {
        continue;
      }
      const count = await this.store.countSince(channel, since);
      if (count >= limit) {
        return true;
      }
    }
    return false;
  }
}
