import { existsSync, readFileSync } from 'node:fs';
import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging, type Message } from 'firebase-admin/messaging';

import type { FirebaseConfig } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { NotificationProvider } from '../calls/notifications.js';
import { LogNotificationProvider } from '../calls/notifications.js';
import type { PushMessage } from '../calls/notification-types.js';

export class FirebaseNotificationProvider implements NotificationProvider {
  private readonly app?: App;
  private readonly messaging?: { send(message: Message): Promise<string> };

  constructor(
    config: FirebaseConfig,
    appName = 'accompany-push',
    customApp?: App,
    customMessaging?: { send(message: Message): Promise<string> },
  ) {
    if (customMessaging) {
      this.messaging = customMessaging;
      return;
    }

    if (customApp) {
      this.app = customApp;
      return;
    }

    const credential = resolveCredential(config);
    if (!credential) {
      throw new Error('Firebase credentials are required to initialize FirebaseNotificationProvider');
    }

    const existingApp = getApps().find((app) => app.name === appName);
    this.app = existingApp ?? initializeApp({ credential, projectId: config.projectId }, appName);
  }

  async send(token: string, message: PushMessage): Promise<'sent' | 'invalid' | 'failed'> {
    const channelId = message.type === 'MESSAGE_RECEIVED' ? 'chat' : 'default';
    const payload: Message = {
      token,
      notification: {
        title: message.title,
        body: message.body,
      },
      data: {
        type: message.type,
        ...sanitizeData(message.data),
      },
      android: {
        priority: 'high',
        notification: {
          channelId,
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      const client = this.messaging ?? getMessaging(this.app!);
      await client.send(payload);
      logger.info('fcm notification sent', {
        type: message.type,
        userId: message.userId,
        tokenSuffix: token.slice(-6),
      });
      return 'sent';
    } catch (caught: unknown) {
      const code = (caught as { code?: string })?.code ?? '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument'
      ) {
        logger.info('fcm token invalid', {
          userId: message.userId,
          tokenSuffix: token.slice(-6),
          code,
        });
        return 'invalid';
      }

      logger.error('fcm delivery error', {
        type: message.type,
        userId: message.userId,
        tokenSuffix: token.slice(-6),
        code,
        message: caught instanceof Error ? caught.message : 'fcm dispatch failed',
      });
      return 'failed';
    }
  }
}

function resolveCredential(config: FirebaseConfig) {
  if (config.serviceAccountJson) {
    try {
      const parsed = JSON.parse(config.serviceAccountJson) as ServiceAccount;
      return cert(parsed);
    } catch {
      logger.error('invalid FIREBASE_SERVICE_ACCOUNT_JSON');
      return null;
    }
  }

  if (config.serviceAccountPath && existsSync(config.serviceAccountPath)) {
    try {
      const content = readFileSync(config.serviceAccountPath, 'utf8');
      const parsed = JSON.parse(content) as ServiceAccount;
      return cert(parsed);
    } catch {
      logger.error('failed to read FIREBASE_SERVICE_ACCOUNT_PATH', { path: config.serviceAccountPath });
      return null;
    }
  }

  if (config.clientEmail && config.privateKey) {
    return cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    });
  }

  return null;
}

function sanitizeData(data: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (value !== null && value !== undefined) {
      result[key] = String(value);
    }
  }
  return result;
}

export function createNotificationProvider(config: FirebaseConfig): NotificationProvider {
  const hasCredentials = Boolean(
    config.serviceAccountJson ||
    (config.serviceAccountPath && existsSync(config.serviceAccountPath)) ||
    (config.clientEmail && config.privateKey),
  );

  if (hasCredentials) {
    try {
      return new FirebaseNotificationProvider(config);
    } catch (error) {
      logger.error('failed to initialize FirebaseNotificationProvider, falling back to LogNotificationProvider', {
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  } else {
    logger.info('Firebase credentials not configured; using LogNotificationProvider for push notifications');
  }

  return new LogNotificationProvider();
}
