import { Queue, Worker } from 'bullmq';

import { logger } from '../../utils/logger.js';
import type { PgCallStore } from './call.store.js';
import type { PushMessage } from './notification-types.js';

export interface NotificationProvider {
  send(token: string, message: PushMessage): Promise<'sent' | 'invalid' | 'failed'>;
}

export class LogNotificationProvider implements NotificationProvider {
  async send(token: string, message: PushMessage): Promise<'sent'> {
    logger.info('notification sent', { type: message.type, userId: message.userId, tokenSuffix: token.slice(-6) });
    return 'sent';
  }
}

export function createNotificationQueue(redisUrl: string) {
  const queue = new Queue<PushMessage>('notifications', { connection: { url: redisUrl, maxRetriesPerRequest: null } });
  return {
    enqueue(message: PushMessage) {
      return queue.add('send', message, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      });
    },
    async close() {
      await queue.close();
    },
  };
}

export function startNotificationWorker(redisUrl: string, store: PgCallStore, provider: NotificationProvider) {
  const worker = new Worker<PushMessage>(
    'notifications',
    async (job) => {
      const tokens = await store.activeTokens(job.data.userId);
      for (const device of tokens) {
        const result = await provider.send(device.token, job.data);
        if (result === 'invalid') await store.deactivateTokenValue(device.token);
        if (result === 'failed') throw new Error('notification failed');
      }
      logger.info('notification delivered', { type: job.data.type, userId: job.data.userId, devices: tokens.length });
    },
    { connection: { url: redisUrl, maxRetriesPerRequest: null } },
  );
  worker.on('failed', (job, error) => {
    logger.error('notification failed', { type: job?.data.type, message: error.message });
  });
  return worker;
}
