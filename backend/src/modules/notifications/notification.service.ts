import type { Pool } from 'pg';

import type { NotificationQueue } from '../calls/notifications.js';
import type { PushMessage } from '../calls/notification-types.js';
import { logger } from '../../utils/logger.js';

export interface NotificationService {
  notifyNewMessage(input: {
    recipientId: string;
    senderId: string;
    senderName?: string | null;
    conversationId: string;
    messageId: string;
    content?: string | null;
  }): Promise<void>;

  notifyChatRequest(input: {
    recipientId: string;
    senderId: string;
    senderName?: string | null;
    conversationId: string;
    message?: string | null;
  }): Promise<void>;

  notifyChatAccepted(input: {
    recipientId: string;
    acceptorName?: string | null;
    conversationId: string;
  }): Promise<void>;

  enqueueGeneric(message: PushMessage, jobId?: string): Promise<void>;
}

export class AppNotificationService implements NotificationService {
  constructor(
    private readonly queue: NotificationQueue,
    private readonly pool?: Pool,
  ) {}

  async notifyNewMessage(input: {
    recipientId: string;
    senderId: string;
    senderName?: string | null;
    conversationId: string;
    messageId: string;
    content?: string | null;
  }): Promise<void> {
    const senderName = input.senderName ?? (await this.resolveDisplayName(input.senderId)) ?? 'Someone';
    const body = truncate(input.content) || 'Sent you a new message.';
    const jobId = `msg-${input.messageId}`;

    const message: PushMessage = {
      userId: input.recipientId,
      type: 'MESSAGE_RECEIVED',
      title: senderName,
      body,
      data: {
        conversationId: input.conversationId,
        messageId: input.messageId,
        senderId: input.senderId,
      },
    };

    try {
      await this.queue.enqueue(message, jobId);
      logger.info('notification enqueued', {
        type: message.type,
        recipientId: input.recipientId,
        jobId,
      });
    } catch (error) {
      logger.error('failed to enqueue notification', {
        jobId,
        error: error instanceof Error ? error.message : 'queue error',
      });
    }
  }

  async notifyChatRequest(input: {
    recipientId: string;
    senderId: string;
    senderName?: string | null;
    conversationId: string;
    message?: string | null;
  }): Promise<void> {
    const senderName = input.senderName ?? (await this.resolveDisplayName(input.senderId)) ?? 'Someone';
    const body = truncate(input.message) || 'Sent you a chat request.';
    const jobId = `chat-req-${input.conversationId}`;

    const message: PushMessage = {
      userId: input.recipientId,
      type: 'REQUEST_RECEIVED',
      title: `${senderName} wants to chat`,
      body,
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
      },
    };

    try {
      await this.queue.enqueue(message, jobId);
      logger.info('notification enqueued', {
        type: message.type,
        recipientId: input.recipientId,
        jobId,
      });
    } catch (error) {
      logger.error('failed to enqueue notification', {
        jobId,
        error: error instanceof Error ? error.message : 'queue error',
      });
    }
  }

  async notifyChatAccepted(input: {
    recipientId: string;
    acceptorName?: string | null;
    conversationId: string;
  }): Promise<void> {
    const acceptorName = input.acceptorName ?? 'Your match';
    const jobId = `chat-acc-${input.conversationId}`;

    const message: PushMessage = {
      userId: input.recipientId,
      type: 'REQUEST_ACCEPTED',
      title: 'Chat request accepted',
      body: `${acceptorName} accepted your request. Start chatting!`,
      data: {
        conversationId: input.conversationId,
      },
    };

    try {
      await this.queue.enqueue(message, jobId);
      logger.info('notification enqueued', {
        type: message.type,
        recipientId: input.recipientId,
        jobId,
      });
    } catch (error) {
      logger.error('failed to enqueue notification', {
        jobId,
        error: error instanceof Error ? error.message : 'queue error',
      });
    }
  }

  async enqueueGeneric(message: PushMessage, jobId?: string): Promise<void> {
    try {
      await this.queue.enqueue(message, jobId);
      logger.info('generic notification enqueued', {
        type: message.type,
        userId: message.userId,
        jobId,
      });
    } catch (error) {
      logger.error('failed to enqueue generic notification', {
        type: message.type,
        error: error instanceof Error ? error.message : 'queue error',
      });
    }
  }

  private async resolveDisplayName(userId: string): Promise<string | null> {
    if (!this.pool) return null;
    try {
      const result = await this.pool.query<{ display_name: string }>(
        `SELECT display_name FROM acc.m_profiles WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
        [userId],
      );
      return result.rows[0]?.display_name?.trim() || null;
    } catch {
      return null;
    }
  }
}

function truncate(text: string | null | undefined, max = 100): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1) + '…';
}
