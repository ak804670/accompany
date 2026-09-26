import assert from 'node:assert/strict';
import test from 'node:test';

import { captureHold, earn, holdForWithdrawal, payoutMinor, publicLabel, releaseHold, spend } from './wallet-rules.js';

const wallet = { balance: 150, earned: 40, held: 0 };

test('spending uses purchased coins before earned coins', () => {
  assert.deepEqual(spend(wallet, 100), { balance: 50, earned: 40, held: 0 });
  assert.deepEqual(spend(wallet, 120), { balance: 30, earned: 30, held: 0 });
  assert.equal(spend(wallet, 151), null);
});

test('only one of two spends of 100 can fit in 150', () => {
  const first = spend(wallet, 100);
  assert.ok(first);
  assert.equal(spend(first, 100), null);
});

test('earnings increase the withdrawable balance', () => {
  assert.deepEqual(earn(wallet, 20), { balance: 170, earned: 60, held: 0 });
});

test('withdrawal holds earned coins and can be released or captured once', () => {
  const held = holdForWithdrawal(wallet, 40, 20);
  assert.deepEqual(held, { balance: 110, earned: 0, held: 40 });
  assert.equal(holdForWithdrawal(wallet, 10, 20), null);
  assert.equal(holdForWithdrawal({ balance: 500, earned: 0, held: 0 }, 100, 20), null);
  assert.deepEqual(releaseHold(held!, 40), wallet);
  assert.deepEqual(captureHold(held!, 40), { balance: 110, earned: 0, held: 0 });
  assert.equal(captureHold(held!, 40) && captureHold(captureHold(held!, 40)!, 40), null);
});

test('payout uses integer paise and history uses plain labels', () => {
  assert.equal(payoutMinor(100, 100), 10000);
  assert.equal(publicLabel('coin_purchase'), 'Added');
  assert.equal(publicLabel('video_call_debit'), 'Spent');
  assert.equal(publicLabel('voice_call_credit'), 'Earned');
  assert.equal(publicLabel('withdrawal'), 'Withdrawn');
});
