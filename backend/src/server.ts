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
import { logger } from './utils/logger.js';

const config = readConfig();
const communicationConfig = readCommunicationConfig(config.nodeEnv);
const pool = createPool(config.databaseUrl);
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

const app = createApp({
  authService,
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
