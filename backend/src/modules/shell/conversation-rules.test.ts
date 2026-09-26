import assert from 'node:assert/strict';
import test from 'node:test';

import { authoritativeRate, ratesSchema } from '../profile/profile.validation.js';
import { canCreateChatRequest, canRespondToRequest, canSendMessage } from './conversation-rules.js';
import { distanceLabel, parseDiscoveryLimit, relationshipFrom, roundDistanceKm, toPublicPerson } from './discovery.js';
import { interestSlug, normalizeInterestName } from './interest-names.js';

test('discovery limit defaults to 10 and never exceeds 20', () => {
  assert.equal(parseDiscoveryLimit(undefined), 10);
  assert.equal(parseDiscoveryLimit('10'), 10);
  assert.equal(parseDiscoveryLimit('3'), 3);
  assert.equal(parseDiscoveryLimit('100000'), 20);
  assert.equal(parseDiscoveryLimit('0'), 10);
});

test('a pending conversation cannot accept another message', () => {
  const decision = canSendMessage({ member: true, blocked: false, status: 'pending' });
  assert.equal(decision.allow, false);
});

test('an accepted conversation can receive a message', () => {
  assert.equal(canSendMessage({ member: true, blocked: false, status: 'active' }).allow, true);
});

test('a block stops a new request and a message', () => {
  assert.equal(canCreateChatRequest({ sameUser: false, blocked: true, existingStatus: null }).allow, false);
  assert.equal(canSendMessage({ member: true, blocked: true, status: 'active' }).allow, false);
});

test('only the recipient can accept a pending request', () => {
  assert.equal(canRespondToRequest({ member: true, isRecipient: false, blocked: false, status: 'pending' }).allow, false);
  assert.equal(canRespondToRequest({ member: true, isRecipient: true, blocked: false, status: 'pending' }).allow, true);
  assert.equal(canRespondToRequest({ member: true, isRecipient: true, blocked: false, status: 'active' }).allow, false);
});

test('public people never include coordinates', () => {
  const person = toPublicPerson(
    { user_id: 'u', display_name: 'Ananya', bio: null, media_id: null, online: true, latitude: 26.1, longitude: 73.1 },
    {
      age: 24,
      interests: ['Music'],
      sharedInterests: ['Music'],
      rates: { chat: 5, audio: 10, video: 20 },
      distanceKm: 3.4,
      relationship: 'none',
      conversationId: null,
    },
  );
  assert.equal('latitude' in person, false);
  assert.equal(person.distanceKm, 3.4);
  assert.equal(person.rates.audio, 10);
  assert.notEqual(person.rates.audio, person.rates.video);
});

test('distance is rounded and labeled without extra precision', () => {
  assert.equal(roundDistanceKm(2347.829), 2.3);
  assert.equal(distanceLabel(2.3), '2.3 km away');
  assert.equal(distanceLabel(0.4), 'Nearby');
});

test('a block hides communication without describing the other person block', () => {
  assert.equal(relationshipFrom({ viewerId: 'a', blockedByViewer: false, blockedViewer: true, status: 'active', createdBy: 'a' }), 'unavailable');
  assert.equal(relationshipFrom({ viewerId: 'a', blockedByViewer: true, blockedViewer: false, status: 'pending', createdBy: 'a' }), 'blocked');
});

test('communication rates are independent and ignore a client-supplied price', () => {
  assert.equal(ratesSchema.safeParse({ chat: 5, audio: 10, video: 20 }).success, true);
  assert.equal(ratesSchema.safeParse({ chat: -1 }).success, false);
  assert.equal(ratesSchema.safeParse({ audio: 10.5 }).success, false);
  assert.equal(authoritativeRate(20, 1), 20);
  assert.notEqual(authoritativeRate(10, 10), authoritativeRate(20, 10));
});

test('custom interest names are validated and slugged', () => {
  assert.equal(normalizeInterestName('  Classical Guitar '), 'Classical Guitar');
  assert.equal(normalizeInterestName(''), null);
  assert.equal(normalizeInterestName('<script>'), null);
  assert.equal(interestSlug('Classical Guitar'), 'classical-guitar');
});
