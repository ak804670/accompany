import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';

import { AppNotificationService } from './notification.service.js';
import type { PushMessage } from '../calls/notification-types.js';

describe('AppNotificationService', () => {
  it('enqueues chat messages with deterministic jobId and formatted preview', async () => {
    const enqueued: Array<{ message: PushMessage; jobId?: string }> = [];
    const mockQueue = {
      enqueue: async (message: PushMessage, jobId?: string) => {
        enqueued.push({ message, jobId });
      },
      close: async () => {},
    };

    const service = new AppNotificationService(mockQueue);

    await service.notifyNewMessage({
      recipientId: 'user-rec',
      senderId: 'user-send',
      senderName: 'Sarah',
      conversationId: 'conv-123',
      messageId: '456',
      content: 'Hey, are you free this weekend for coffee?',
    });

    assert.equal(enqueued.length, 1);
    const item = enqueued[0]!;
    assert.equal(item.jobId, 'msg-456');
    assert.equal(item.message.userId, 'user-rec');
    assert.equal(item.message.type, 'MESSAGE_RECEIVED');
    assert.equal(item.message.title, 'Sarah');
    assert.equal(item.message.body, 'Hey, are you free this weekend for coffee?');
    assert.equal(item.message.data.conversationId, 'conv-123');
    assert.equal(item.message.data.messageId, '456');
    assert.equal(item.message.data.senderId, 'user-send');

    // Duplicate invocation for the same message creates the exact same jobId
    await service.notifyNewMessage({
      recipientId: 'user-rec',
      senderId: 'user-send',
      senderName: 'Sarah',
      conversationId: 'conv-123',
      messageId: '456',
      content: 'Hey, are you free this weekend for coffee?',
    });

    assert.equal(enqueued.length, 2);
    assert.equal(enqueued[1]!.jobId, 'msg-456'); // Identical jobId ensures BullMQ drops duplicate
  });

  it('truncates long message previews cleanly', async () => {
    const enqueued: Array<{ message: PushMessage; jobId?: string }> = [];
    const mockQueue = {
      enqueue: async (message: PushMessage, jobId?: string) => {
        enqueued.push({ message, jobId });
      },
      close: async () => {},
    };

    const service = new AppNotificationService(mockQueue);

    const longText = 'A'.repeat(150);
    await service.notifyNewMessage({
      recipientId: 'user-rec',
      senderId: 'user-send',
      conversationId: 'c1',
      messageId: 'm1',
      content: longText,
    });

    assert.equal(enqueued.length, 1);
    assert.equal(enqueued[0]!.message.body.length, 100);
    assert.ok(enqueued[0]!.message.body.endsWith('…'));
  });

  it('enqueues chat request and accepted events with deterministic jobIds', async () => {
    const enqueued: Array<{ message: PushMessage; jobId?: string }> = [];
    const mockQueue = {
      enqueue: async (message: PushMessage, jobId?: string) => {
        enqueued.push({ message, jobId });
      },
      close: async () => {},
    };

    const service = new AppNotificationService(mockQueue);

    await service.notifyChatRequest({
      recipientId: 'user-rec',
      senderId: 'user-send',
      senderName: 'Elena',
      conversationId: 'conv-req-1',
      message: 'Hi!',
    });

    assert.equal(enqueued.length, 1);
    assert.equal(enqueued[0]!.jobId, 'chat-req-conv-req-1');
    assert.equal(enqueued[0]!.message.type, 'REQUEST_RECEIVED');

    await service.notifyChatAccepted({
      recipientId: 'user-send',
      acceptorName: 'Elena',
      conversationId: 'conv-req-1',
    });

    assert.equal(enqueued.length, 2);
    assert.equal(enqueued[1]!.jobId, 'chat-acc-conv-req-1');
    assert.equal(enqueued[1]!.message.type, 'REQUEST_ACCEPTED');
  });
});
