import assert from 'node:assert/strict';
import test from 'node:test';

import { failureForDecision, nextPresence, validateMessageContent } from './chat-events.js';

test('a user stays online until the last socket disconnects', () => {
  assert.equal(nextPresence(2), 'ONLINE');
  assert.equal(nextPresence(1), 'ONLINE');
  assert.equal(nextPresence(0), 'OFFLINE');
});

test('pending chat requests are not treated as a block', () => {
  assert.equal(failureForDecision(403, 'Waiting for them to accept.').code, 'CHAT_REQUEST_PENDING');
  assert.equal(failureForDecision(403, 'This conversation is not available.').code, 'USER_BLOCKED');
  assert.equal(failureForDecision(404, "Couldn't load this conversation").code, 'CONVERSATION_NOT_FOUND');
});

test('message content is trimmed and rejected when empty', () => {
  assert.equal(validateMessageContent('  hello  '), 'hello');
  assert.equal((validateMessageContent('   ') as { code: string }).code, 'MESSAGE_INVALID');
  assert.equal((validateMessageContent('x'.repeat(2001)) as { code: string }).code, 'MESSAGE_INVALID');
});
