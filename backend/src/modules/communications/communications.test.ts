import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';

import { createApp } from '../../app.js';
import type { AppConfig } from '../../config/env.js';
import { MemoryRateLimiter } from '../../infrastructure/redis/rate-limit.js';
import { MemoryAuthRepository } from '../auth/memory-repository.js';
import { AuthService } from '../auth/auth.service.js';
import { CommunicationService } from './CommunicationService.js';
import { NotificationService } from './NotificationService.js';
import { MailjetEmailProvider } from './providers/email/MailjetEmailProvider.js';
import { MockEmailProvider } from './providers/email/MockEmailProvider.js';
import { ProviderRequestError } from './providers/errors.js';
import type { EmailProvider } from './providers/email/EmailProvider.js';
import { MockSmsProvider } from './providers/sms/MockSmsProvider.js';
import type { SmsProvider } from './providers/sms/SmsProvider.js';
import { TextBeeSmsProvider } from './providers/sms/TextBeeSmsProvider.js';
import { createEmailProvider, createSmsProvider } from './providerFactory.js';
import { MemoryCommunicationStore } from './store.js';
import { CommunicationWorker } from './worker.js';
import { normalizeMailjetEvent, normalizeTextBeeEvent } from './webhooks/normalize.js';
import type { CommunicationConfig } from '../../config/communication.js';
import { readCommunicationConfig } from '../../config/communication.js';

const secret = 'communication-test-secret';
const limits = {
  email: { maxRequestsPerSecond: null, maxDailyMessages: null, maxMonthlyMessages: null },
  sms: { maxRequestsPerSecond: null, maxDailyMessages: null, maxMonthlyMessages: null },
};

function workerFor(store: MemoryCommunicationStore, email: EmailProvider, sms: SmsProvider = new MockSmsProvider(), maxAttempts = 3) {
  return new CommunicationWorker(store, email, sms, secret, limits, maxAttempts, {
    email: 'no-reply@accompany.test',
    name: 'Accompany',
  });
}

describe('communication providers', () => {
  it('sends through the mock providers without vendor credentials', async () => {
    const store = new MemoryCommunicationStore();
    const email = new MockEmailProvider();
    const sms = new MockSmsProvider();
    const service = new CommunicationService(store, email, sms, secret);
    await service.schedule({
      channel: 'sms',
      template: 'auth.otp',
      to: '+14155552671',
      variables: { code: '123456' },
      purpose: 'otp',
      idempotencyKey: 'otp-1',
    });
    const processed = await workerFor(store, email, sms).processAvailable();

    assert.equal(processed, 1);
    assert.equal(sms.sent.length, 1);
    assert.equal(sms.sent[0]?.text, 'Your Accompany code is 123456.');
    assert.equal(store.logs[0]?.status, 'sent');
    assert.equal(store.logs[0]?.provider, 'mock');
    assert.equal(JSON.stringify(store.logs[0]).includes('123456'), false);
  });

  it('does not enqueue the same idempotency key twice', async () => {
    const store = new MemoryCommunicationStore();
    const service = new CommunicationService(store, new MockEmailProvider(), new MockSmsProvider(), secret);
    const first = await service.schedule({
      channel: 'email',
      template: 'auth.otp',
      to: 'user@example.com',
      variables: { code: '111111' },
      purpose: 'otp',
      idempotencyKey: 'same',
    });
    const second = await service.schedule({
      channel: 'email',
      template: 'auth.otp',
      to: 'user@example.com',
      variables: { code: '222222' },
      purpose: 'otp',
      idempotencyKey: 'same',
    });

    assert.equal(first.communicationId, second.communicationId);
    assert.equal(store.outbox.length, 1);
  });

  it('retries a failed provider and then stops', async () => {
    const store = new MemoryCommunicationStore();
    let calls = 0;
    const email: EmailProvider = {
      name: 'mailjet',
      async sendEmail() {
        calls += 1;
        throw new ProviderRequestError(true, 'provider_unavailable');
      },
      async isHealthy() {
        return false;
      },
    };
    const service = new CommunicationService(store, email, new MockSmsProvider(), secret);
    await service.schedule({
      channel: 'email',
      template: 'auth.welcome',
      to: 'user@example.com',
      variables: { name: 'Ava' },
      purpose: 'welcome',
      idempotencyKey: 'welcome-1',
    });
    let now = new Date(Date.now() + 1_000);
    const timed = new CommunicationWorker(store, email, new MockSmsProvider(), secret, limits, 3, {
      email: 'no-reply@accompany.test',
      name: 'Accompany',
    }, () => now);

    await timed.processAvailable();
    await timed.processAvailable();
    now = new Date(now.getTime() + 120_000);
    await timed.processAvailable();
    now = new Date(now.getTime() + 120_000);
    await timed.processAvailable();

    assert.equal(calls, 3);
    assert.equal(store.logs[0]?.status, 'failed');
    assert.equal(store.logs[0]?.errorCode, 'provider_unavailable');
  });

  it('does not send again when delivery was left ambiguous', async () => {
    const store = new MemoryCommunicationStore();
    const sms = new MockSmsProvider();
    const service = new CommunicationService(store, new MockEmailProvider(), sms, secret);
    await service.schedule({
      channel: 'sms',
      template: 'auth.otp',
      to: '+14155552671',
      variables: { code: '123456' },
      purpose: 'otp',
      idempotencyKey: 'ambiguous',
    });
    store.logs[0]!.status = 'sending';
    await workerFor(store, new MockEmailProvider(), sms).processAvailable();

    assert.equal(sms.sent.length, 0);
    assert.equal(store.logs[0]?.status, 'failed');
    assert.equal(store.logs[0]?.errorCode, 'ambiguous_delivery');
  });

  it('translates email into the Mailjet payload and SMS into the TextBee payload', async () => {
    const mailjetCalls: unknown[] = [];
    const mailjet = new MailjetEmailProvider({
      apiKey: 'public-key',
      apiSecret: 'secret-key',
      fromEmail: 'hello@accompany.test',
      fromName: 'Accompany',
      fetchImpl: async (_url, init) => {
        if (init?.body) {
          mailjetCalls.push(JSON.parse(String(init.body)));
        }
        return new Response(JSON.stringify({ Messages: [{ Status: 'success', To: [{ MessageID: 99 }] }] }), { status: 200 });
      },
    });
    const textbeeCalls: unknown[] = [];
    const textbee = new TextBeeSmsProvider({
      apiKey: 'device-key',
      deviceId: 'device-1',
      fetchImpl: async (_url, init) => {
        textbeeCalls.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ data: { smsBatchId: 'batch-1', success: true } }), { status: 200 });
      },
    });
    const store = new MemoryCommunicationStore();
    const service = new CommunicationService(store, mailjet, textbee, secret);
    await service.schedule({
      channel: 'email',
      template: 'auth.otp',
      to: 'user@example.com',
      variables: { code: '654321' },
      purpose: 'otp',
      idempotencyKey: 'mail',
    });
    await service.schedule({
      channel: 'sms',
      template: 'auth.otp',
      to: '+14155552671',
      variables: { code: '654321' },
      purpose: 'otp',
      idempotencyKey: 'sms',
    });
    await workerFor(store, mailjet, textbee).processAvailable();

    const mailjetBody = mailjetCalls[0] as { Messages: Array<{ HTMLPart: string; CustomID: string }> };
    assert.equal(mailjetBody.Messages[0]?.HTMLPart.includes('654321'), true);
    assert.equal(JSON.stringify(mailjetBody).includes('TemplateID'), false);
    const textbeeBody = textbeeCalls[0] as { recipients: string[]; message: string; deviceId: string };
    assert.deepEqual(textbeeBody.recipients, ['+14155552671']);
    assert.equal(textbeeBody.deviceId, 'device-1');
    assert.equal(textbeeBody.message, 'Your Accompany code is 654321.');
    assert.equal(await mailjet.isHealthy(), true);
  });

  it('normalizes provider webhooks into internal statuses', async () => {
    assert.equal(normalizeMailjetEvent({ event: 'bounce', CustomID: 'abc', MessageID: 5 })[0]?.status, 'failed');
    assert.equal(normalizeMailjetEvent({ event: 'open', MessageID: 5 })[0]?.status, 'delivered');
    assert.equal(normalizeTextBeeEvent({ data: { status: 'delivered', smsBatchId: 'batch-1' } })[0]?.status, 'delivered');

    const store = new MemoryCommunicationStore();
    const sms = new MockSmsProvider();
    const service = new CommunicationService(store, new MockEmailProvider(), sms, secret);
    const queued = await service.schedule({
      channel: 'sms',
      template: 'auth.phone-verification',
      to: '+14155552671',
      variables: { code: '101010' },
      purpose: 'otp',
      idempotencyKey: 'hook',
    });
    await workerFor(store, new MockEmailProvider(), sms).processAvailable();
    await store.markDelivered({
      communicationId: queued.communicationId,
      provider: 'textbee',
      providerMessageId: 'batch-1',
      providerStatus: 'delivered',
      at: new Date(),
    });
    assert.equal(store.logs[0]?.status, 'delivered');
  });

  it('switches email and SMS providers without changing AuthService', async () => {
    const source = await readFile(new URL('../auth/auth.service.ts', import.meta.url), 'utf8');
    assert.equal(source.toLowerCase().includes('mailjet'), false);
    assert.equal(source.toLowerCase().includes('textbee'), false);

    const config: AppConfig = {
      nodeEnv: 'development',
      port: 0,
      databaseUrl: 'postgres://localhost/test',
      redisUrl: 'redis://localhost',
      jwtAccessSecret: secret,
      jwtRefreshSecret: 'refresh-secret-refresh-secret-refresh',
      accessTokenExpirySeconds: 900,
      refreshTokenExpirySeconds: 3600,
      otpExpirySeconds: 300,
      otpMaxAttempts: 5,
      otpResendSeconds: 30,
    };

    async function deliver(emailName: 'mock' | 'mailjet') {
      const store = new MemoryCommunicationStore();
      const email: EmailProvider = emailName === 'mock'
        ? new MockEmailProvider()
        : new MailjetEmailProvider({
            apiKey: 'k',
            apiSecret: 's',
            fromEmail: 'hello@accompany.test',
            fromName: 'Accompany',
            fetchImpl: async () => new Response(JSON.stringify({ Messages: [{ Status: 'success', To: [{ MessageID: 1 }] }] }), { status: 200 }),
          });
      const sms = new MockSmsProvider();
      const communications = new CommunicationService(store, email, sms, secret);
      const auth = new AuthService({
        repository: new MemoryAuthRepository(),
        rateLimiter: new MemoryRateLimiter(),
        communications,
        config,
      });
      await auth.requestOtp('email', 'user@example.com', { ip: '127.0.0.1', requestId: 'provider-switch' });
      await workerFor(store, email, sms).processAvailable();
      return store.logs[0]?.provider;
    }

    assert.equal(await deliver('mock'), 'mock');
    assert.equal(await deliver('mailjet'), 'mailjet');
  });

  it('selects providers from configuration', () => {
    const development = readCommunicationConfig('development', { JWT_ACCESS_SECRET: secret });
    assert.equal(development.emailProvider, 'mock');
    assert.equal(development.smsProvider, 'mock');
    assert.equal(createEmailProvider(development, 'development').name, 'mock');
    assert.equal(createSmsProvider(development, 'development').name, 'mock');

    const production: CommunicationConfig = {
      ...development,
      emailProvider: 'mailjet',
      smsProvider: 'textbee',
      revealMockDelivery: false,
      mailjet: { apiKey: 'k', apiSecret: 's', fromEmail: 'hello@accompany.test', fromName: 'Accompany' },
      textbee: { apiKey: 'device' },
    };
    assert.equal(createEmailProvider(production, 'production').name, 'mailjet');
    assert.equal(createSmsProvider(production, 'production').name, 'textbee');
    assert.throws(() => createEmailProvider({ ...development, emailProvider: 'mock' }, 'production'));
  });

  it('accepts a signed webhook and rejects a missing secret', async () => {
    const store = new MemoryCommunicationStore();
    const app = createApp({
      nodeEnv: 'development',
      authService: new AuthService({
        repository: new MemoryAuthRepository(),
        rateLimiter: new MemoryRateLimiter(),
        communications: { async schedule() { return { communicationId: 'unused' }; } },
        config: {
          nodeEnv: 'development',
          port: 0,
          databaseUrl: 'postgres://localhost/test',
          redisUrl: 'redis://localhost',
          jwtAccessSecret: secret,
          jwtRefreshSecret: 'refresh-secret-refresh-secret-refresh',
          accessTokenExpirySeconds: 900,
          refreshTokenExpirySeconds: 3600,
          otpExpirySeconds: 300,
          otpMaxAttempts: 5,
          otpResendSeconds: 30,
        },
      }),
      communicationWebhooks: { store, mailjetSecret: 'hook-secret' },
    });
    const server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    try {
      const denied = await fetch(`http://127.0.0.1:${port}/webhooks/email/mailjet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'sent' }),
      });
      const accepted = await fetch(`http://127.0.0.1:${port}/webhooks/email/mailjet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-webhook-secret': 'hook-secret' },
        body: JSON.stringify({ event: 'sent', CustomID: 'missing' }),
      });
      assert.equal(denied.status, 401);
      assert.equal(accepted.status, 200);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('queues a notification without a provider payload', async () => {
    const store = new MemoryCommunicationStore();
    const notifications = new NotificationService(new CommunicationService(store, new MockEmailProvider(), new MockSmsProvider(), secret));
    await notifications.scheduleNewMessage({
      to: 'user@example.com',
      senderName: 'Ava',
      idempotencyKey: 'message-1',
    });
    assert.equal(store.logs[0]?.purpose, 'notification');
    assert.equal(store.logs[0]?.provider, 'mock');
  });
});
