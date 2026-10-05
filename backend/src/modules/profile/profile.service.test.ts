import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AuthError } from '../auth/auth.errors.js';
import type { AuthService } from '../auth/auth.service.js';
import { MemoryMediaStorage } from './memory-storage.js';
import { MemoryProfileRepository } from './memory-repository.js';
import { ProfileError } from './profile.errors.js';
import { ProfileService } from './profile.service.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02]);

function service() {
  const repository = new MemoryProfileRepository();
  const storage = new MemoryMediaStorage();
  const auth = {
    async session() {
      return { user: { id: 'user-1' } };
    },
  } as unknown as AuthService;
  return { repository, storage, profile: new ProfileService(auth, repository, storage) };
}

describe('profile service', () => {
  it('creates, updates, and completes a profile only when a photo exists', async () => {
    const { profile } = service();
    const created = await profile.saveBasics('user-1', { displayName: '  Anish ', dateOfBirth: '1998-04-02' });
    assert.equal(created.displayName, 'Anish');
    assert.equal(created.complete, false);
    assert.equal(created.step, 'gender');

    await assert.rejects(() => profile.complete('user-1'), (error: unknown) => {
      assert.ok(error instanceof ProfileError);
      assert.equal(error.code, 'PROFILE_INCOMPLETE');
      return true;
    });

    const withPhoto = await profile.addMedia('user-1', jpeg, 'image/jpeg');
    assert.equal(withPhoto.media[0]?.isPrimary, true);
    const about = await profile.update('user-1', { bio: 'I like long conversations.' });
    assert.equal(about.bio, 'I like long conversations.');
    const interests = await profile.replaceInterests('user-1', { interestIds: ['10000000-0000-4000-8000-000000000006'] });
    assert.equal(interests.interests[0]?.slug, 'technology');
    const languages = await profile.update('user-1', { languagePreferences: ['en'] });
    assert.deepEqual(languages.languagePreferences, ['en']);
    await profile.saveRates('user-1', { chat: 10 });
    const done = await profile.complete('user-1');
    assert.equal(done.complete, true);
    assert.equal(done.step, 'complete');
  });

  it('rejects a future or underage date of birth and another user cannot delete media', async () => {
    const { profile } = service();
    await assert.rejects(() => profile.saveBasics('user-1', { displayName: 'Anish', dateOfBirth: '2020-01-01' }), (error: unknown) => {
      assert.ok(error instanceof ProfileError);
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    });

    await profile.saveBasics('user-1', { displayName: 'Anish', dateOfBirth: '1990-01-01' });
    const saved = await profile.addMedia('user-1', jpeg, 'image/jpeg');
    const mediaId = saved.media[0]?.id ?? '';
    await assert.rejects(() => profile.removeMedia('user-2', mediaId), (error: unknown) => {
      assert.ok(error instanceof ProfileError);
      assert.equal(error.code, 'MEDIA_NOT_FOUND');
      return true;
    });
    const removed = await profile.removeMedia('user-1', mediaId);
    assert.equal(removed.media.length, 0);
  });

  it('blocks a suspended account', async () => {
    const { profile, repository } = service();
    repository.accountStatus.set('user-1', 'suspended');
    await assert.rejects(() => profile.viewer('token'), (error: unknown) => {
      assert.ok(error instanceof ProfileError);
      assert.equal(error.status, 403);
      return true;
    });
  });

  it('assigns a readable private alias before anonymous basics and completes only after review', async () => {
    const { profile, repository } = service();
    const started = await profile.setIntent('user-1', { intent: 'anonymous' });
    assert.match(started.displayName ?? '', /^(Calm|Kind|Bright|Gentle|Quiet|Sunny|Brave|Clever)(Fox|Owl|River|Maple|Robin|Willow|Panda|Dove)\d{4}$/);
    assert.equal(started.profileStatus, 'hidden');
    assert.equal(started.step, 'basics');
    assert.equal(started.complete, false);
    assert.equal(repository.profiles.get('user-1')?.displayName, started.displayName);

    const basics = await profile.saveBasics('user-1', { displayName: 'QuietOwl1234', dateOfBirth: '1998-04-02' });
    assert.equal(basics.displayName, 'QuietOwl1234');
    assert.equal(basics.step, 'preferences');
    const languages = await profile.update('user-1', { languagePreferences: ['en'] });
    assert.equal(languages.step, 'review');
    assert.equal(languages.complete, false);

    const done = await profile.complete('user-1');
    assert.equal(done.profileStatus, 'hidden');
    assert.equal(done.step, 'complete');
    assert.equal(done.complete, true);
  });

  it('does not retain a listed name when switching an account to anonymous', async () => {
    const { profile } = service();
    await profile.saveBasics('user-1', { displayName: 'Real Listed Name', dateOfBirth: '1998-04-02' });
    const anonymous = await profile.setIntent('user-1', { intent: 'anonymous' });
    assert.notEqual(anonymous.displayName, 'Real Listed Name');
    assert.match(anonymous.displayName ?? '', /\d{4}$/);
    assert.equal(anonymous.profileStatus, 'hidden');
  });

  it('requires a non-empty name before provider intent or role can be persisted', async () => {
    const { profile, repository } = service();
    await assert.rejects(() => profile.setIntent('user-1', { intent: 'provider' }), (error: unknown) => {
      assert.ok(error instanceof ProfileError);
      assert.equal(error.code, 'PROFILE_INCOMPLETE');
      return true;
    });
    await assert.rejects(() => profile.setRole('user-1', { role: 'friendly' }), (error: unknown) => {
      assert.ok(error instanceof ProfileError);
      assert.equal(error.code, 'PROFILE_INCOMPLETE');
      return true;
    });
    assert.equal(repository.profiles.has('user-1'), false);
  });

  it('requires a session', async () => {
    const { profile } = service();
    const auth = {
      async session() {
        throw new AuthError('SESSION_EXPIRED', 401);
      },
    } as unknown as AuthService;
    const gated = new ProfileService(auth, new MemoryProfileRepository(), new MemoryMediaStorage());
    await assert.rejects(() => gated.viewer('token'), (error: unknown) => error instanceof AuthError);
    void profile;
  });
});
