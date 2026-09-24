import { Redis } from 'ioredis';

import { createApp } from './app.js';
import { readCommunicationConfig } from './config/communication.js';
import { readConfig } from './config/env.js';
import { createPool } from './infrastructure/database/pool.js';
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

const app = createApp({
  authService,
  profileService,
  pool,
  media,
  audit,
  nodeEnv: config.nodeEnv,
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

void communicationStore.recoverInterrupted().catch((error: unknown) => {
  logger.error('communication recovery failed', { message: error instanceof Error ? error.message : 'failed' });
});

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

async function shutdown() {
  clearInterval(poll);
  server.close();
  await pool.end();
  redis.disconnect();
}

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
