import assert from 'node:assert/strict';
import test from 'node:test';

import { createNotificationProvider, FirebaseNotificationProvider } from './firebase-provider.js';
import { LogNotificationProvider } from '../calls/notifications.js';
import type { PushMessage } from '../calls/notification-types.js';

test('createNotificationProvider returns LogNotificationProvider when credentials are not configured', () => {
  const provider = createNotificationProvider({});
  assert.ok(provider instanceof LogNotificationProvider);
});

test('FirebaseNotificationProvider formats payload and returns sent on success', async () => {
  const sentPayloads: unknown[] = [];
  const fakeMessaging = {
    send: async (payload: unknown) => {
      sentPayloads.push(payload);
      return 'projects/test-project/messages/msg-123';
    },
  };

  const provider = new FirebaseNotificationProvider(
    {},
    'test-app-1',
    undefined,
    fakeMessaging as unknown as { send: (msg: unknown) => Promise<string> },
  );

  const message: PushMessage = {
    userId: 'user-123',
    type: 'MESSAGE_RECEIVED',
    title: 'Alex',
    body: 'Hello there!',
    data: {
      conversationId: 'conv-456',
      messageId: 'msg-789',
    },
  };

  const result = await provider.send('device-token-abc-123', message);
  assert.equal(result, 'sent');
  assert.equal(sentPayloads.length, 1);

  const payload = sentPayloads[0] as {
    token: string;
    notification: { title: string; body: string };
    data: Record<string, string>;
    android: { priority: string; notification: { channelId: string } };
  };

  assert.equal(payload.token, 'device-token-abc-123');
  assert.equal(payload.notification.title, 'Alex');
  assert.equal(payload.notification.body, 'Hello there!');
  assert.equal(payload.data.type, 'MESSAGE_RECEIVED');
  assert.equal(payload.data.conversationId, 'conv-456');
  assert.equal(payload.data.messageId, 'msg-789');
  assert.equal(payload.android.notification.channelId, 'chat');
});

test('FirebaseNotificationProvider returns invalid when token is unregistered', async () => {
  const fakeMessaging = {
    send: async () => {
      const err = new Error('Requested entity was not found.') as Error & { code: string };
      err.code = 'messaging/registration-token-not-registered';
      throw err;
    },
  };

  const provider = new FirebaseNotificationProvider(
    {},
    'test-app-2',
    undefined,
    fakeMessaging as unknown as { send: (msg: unknown) => Promise<string> },
  );

  const message: PushMessage = {
    userId: 'user-123',
    type: 'MESSAGE_RECEIVED',
    title: 'Alex',
    body: 'Hello',
    data: { conversationId: 'c1' },
  };

  const result = await provider.send('stale-token', message);
  assert.equal(result, 'invalid');
});

test('FirebaseNotificationProvider returns failed when network or internal error occurs', async () => {
  const fakeMessaging = {
    send: async () => {
      const err = new Error('Internal error') as Error & { code: string };
      err.code = 'messaging/internal-error';
      throw err;
    },
  };

  const provider = new FirebaseNotificationProvider(
    {},
    'test-app-3',
    undefined,
    fakeMessaging as unknown as { send: (msg: unknown) => Promise<string> },
  );

  const message: PushMessage = {
    userId: 'user-123',
    type: 'MESSAGE_RECEIVED',
    title: 'Alex',
    body: 'Hello',
    data: { conversationId: 'c1' },
  };

  const result = await provider.send('some-token', message);
  assert.equal(result, 'failed');
});
