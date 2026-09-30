import { Redis } from 'ioredis';
import { Router } from 'express';

import { createApp } from './app.js';
import { readCallConfig } from './modules/calls/call-config.js';
import { createCallRouter, createLiveKitWebhook } from './modules/calls/call.routes.js';
import { CallService } from './modules/calls/call.service.js';
import { PgCallStore } from './modules/calls/call.store.js';
import { LiveKitProvider } from './modules/calls/livekit-provider.js';
import { createNotificationQueue, LogNotificationProvider, startNotificationWorker } from './modules/calls/notifications.js';
import { ManualPaymentProvider } from './modules/wallet/payment-provider.js';
import { createPaymentWebhook, createWalletRouter } from './modules/wallet/wallet.routes.js';
import { WalletService } from './modules/wallet/wallet.service.js';
import { readCommunicationConfig } from './config/communication.js';
import { readConfig } from './config/env.js';
import { createPool } from './infrastructure/database/pool.js';
import { attachChatSocket } from './infrastructure/realtime/chat-socket.js';
import { RedisRateLimiter } from './infrastructure/redis/rate-limit.js';
import { PgAuthRepository } from './modules/auth/auth.repository.js';
import { AuthService } from './modules/auth/auth.service.js';
import { CommunicationService } from './modules/communications/CommunicationService.js';
import { createEmailProvider, createSmsProvider } from './modules/communications/providerFactory.js';
import { PgCommunicationStore } from './modules/communications/store.js';
import { CommunicationWorker } from './modules/communications/worker.js';
import { LocalMediaStorage } from './modules/profile/media-storage.js';
import { PgProfileRepository } from './modules/profile/profile.repository.js';
import { ProfileService } from './modules/profile/profile.service.js';
import { createAuditLog } from './modules/audit/audit-log.js';
import { logger, setAuditSink } from './utils/logger.js';
import path from 'node:path';

const config = readConfig();
const communicationConfig = readCommunicationConfig(config.nodeEnv);
const pool = createPool(config.databaseUrl);
const audit = createAuditLog(pool);
setAuditSink((level, event, fields) => {
  const userId = typeof fields.userId === 'string' ? fields.userId : null;
  const sessionId = typeof fields.sessionId === 'string' ? fields.sessionId : null;
  const requestId = typeof fields.requestId === 'string' ? fields.requestId : null;
  audit({
    action: event,
    entityType: entityTypeFor(event),
    entityId: sessionId ?? userId ?? requestId,
    actorUserId: userId,
    metadata: { level, ...fields },
  });
});
const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 2 });
const communicationStore = new PgCommunicationStore(pool);
const emailProvider = createEmailProvider(communicationConfig, config.nodeEnv);
const smsProvider = createSmsProvider(communicationConfig, config.nodeEnv);
const communications = new CommunicationService(
  communicationStore,
  emailProvider,
  smsProvider,
  communicationConfig.encryptionSecret,
);
const worker = new CommunicationWorker(
  communicationStore,
  emailProvider,
  smsProvider,
  communicationConfig.encryptionSecret,
  communicationConfig.limits,
  communicationConfig.maxAttempts,
  communicationConfig.from,
);
const authService = new AuthService({
  repository: new PgAuthRepository(pool),
  rateLimiter: new RedisRateLimiter(redis),
  communications,
  config,
});

const media = new LocalMediaStorage(path.resolve(import.meta.dirname, '../storage/profile-media'));
const profileService = new ProfileService(
  authService,
  new PgProfileRepository(pool),
  media,
  {
    maxBytes: positive('PROFILE_IMAGE_MAX_SIZE_BYTES', 4_000_000),
    maxPhotos: positive('MAX_PROFILE_PHOTOS', 10),
  },
);

const callConfig = readCallConfig(process.env, config.nodeEnv);
const callStore = new PgCallStore(pool);
const notifications = createNotificationQueue(config.redisUrl);
const callService = callConfig
  ? new CallService(
      callStore,
      new LiveKitProvider(callConfig.livekitUrl, callConfig.livekitApiKey, callConfig.livekitApiSecret),
      callConfig,
      new RedisRateLimiter(redis),
      (message) => notifications.enqueue(message).then(() => undefined),
      redis,
    )
  : null;
const notificationWorker = callService
  ? startNotificationWorker(config.redisUrl, callStore, new LogNotificationProvider())
  : null;

const payments = new ManualPaymentProvider(process.env.PAYMENT_WEBHOOK_SECRET ?? '');
const wallet = new WalletService(
  pool,
  payments,
  (message) => notifications.enqueue(message).then(() => undefined),
  positive('WITHDRAWAL_MIN_COINS', 100),
  positive('COIN_PAYOUT_PAISE', 100),
);

const app = createApp({
  authService,
  profileService,
  pool,
  media,
  audit,
  nodeEnv: config.nodeEnv,
  wallet: { router: createWalletRouter(authService, wallet, process.env.ADMIN_API_KEY), webhook: createPaymentWebhook(wallet, payments) },
  calls: {
    router: createCallRouter(authService, callService, callStore),
    webhook: callService && callConfig
      ? createLiveKitWebhook(callConfig, callService, callStore)
      : Router(),
  },
  communicationWebhooks: {
    store: communicationStore,
    mailjetSecret: communicationConfig.mailjetWebhookSecret,
    textbeeSecret: communicationConfig.textbeeWebhookSecret,
  },
});

const server = app.listen(config.port, () => {
  logger.info('API listening', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    emailProvider: emailProvider.name,
    smsProvider: smsProvider.name,
  });
});

attachChatSocket(server, {
  auth: authService,
  pool,
  limiter: new RedisRateLimiter(redis),
  notify: (message) => notifications.enqueue(message).then(() => undefined),
});

void communicationStore.recoverInterrupted().catch((error: unknown) => {
  logger.error('communication recovery failed', { message: error instanceof Error ? error.message : 'failed' });
});

const callSweep = callService
  ? setInterval(() => {
      callService.sweep().catch((error: unknown) => {
        logger.error('call sweep failed', { message: error instanceof Error ? error.message : 'failed' });
      });
    }, 5000)
  : null;
callSweep?.unref();

const poll = setInterval(() => {
  worker.processAvailable().catch((error: unknown) => {
    logger.error('communication worker failed', { message: error instanceof Error ? error.message : 'failed' });
  });
}, communicationConfig.pollIntervalMs);
poll.unref();

function positive(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function entityTypeFor(event: string): string {
  const name = event.toLowerCase();
  if (name.includes('session') || name.includes('logout')) {
    return 'session';
  }
  if (name.includes('otp')) {
    return 'otp';
  }
  if (name.includes('profile')) {
    return 'profile';
  }
  if (name.includes('communication')) {
    return 'communication';
  }
  return 'system';
}

let stopping = false;

async function shutdown() {
  if (stopping) return;
  stopping = true;
  if (callSweep) clearInterval(callSweep);
  clearInterval(poll);
  await notificationWorker?.close();
  await notifications.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
  redis.disconnect();
}

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
