import assert from 'node:assert/strict';
import test from 'node:test';

import { billableCoins, billingPeriod, canTransition, chargeKey, outstandingCoins, roomName } from './call-rules.js';

test('a ringing call can be accepted, declined, missed, or cancelled once', () => {
  assert.equal(canTransition('RINGING', 'ACCEPTED'), true);
  assert.equal(canTransition('RINGING', 'CONNECTED'), false);
  assert.equal(canTransition('DECLINED', 'ACCEPTED'), false);
  assert.equal(canTransition('CONNECTED', 'ENDED'), true);
});

test('billing uses the snapshotted per-minute rate and is safe to repeat', () => {
  assert.equal(billableCoins(10, 125), 30);
  assert.equal(billableCoins(10, 0), 0);
  assert.equal(outstandingCoins(30, 20), 10);
  assert.equal(outstandingCoins(20, 20), 0);
  assert.equal(chargeKey('call-1', 2), 'call-1:2');
  assert.equal(billingPeriod(60, 60), 0);
  assert.equal(billingPeriod(61, 60), 1);
});

test('room names are not treated as secrets', () => {
  assert.equal(roomName('abc'), 'accompany_call_abc');
});
