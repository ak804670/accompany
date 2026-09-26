import { randomUUID } from 'node:crypto';

import type { AuthService } from '../auth/auth.service.js';
import { advanceStep, isComplete } from './profile.completion.js';
import { ProfileError } from './profile.errors.js';
import type { MediaStorage } from './media-storage.js';
import { detectImage } from './media-storage.js';
import type { ProfileRepository } from './profile.repository.js';
import type { OnboardingStep, ProfileRecord } from './profile.types.js';
import { assertAdultDateOfBirth, basicsSchema, interestsSchema, mediaOrderSchema, profilePatchSchema, ratesSchema } from './profile.validation.js';
import { logger } from '../../utils/logger.js';

const defaultMediaLimits = { maxBytes: 4_000_000, maxPhotos: 10 };

function withComplete(profile: ProfileRecord): ProfileRecord {
  return { ...profile, complete: profile.profileStatus === 'active' && isComplete(profile) };
}

export class ProfileService {
  constructor(
    private readonly auth: AuthService,
    private readonly repository: ProfileRepository,
    private readonly storage: MediaStorage,
    private readonly limits = defaultMediaLimits,
  ) {}

  async viewer(accessToken: string): Promise<string> {
    const session = await this.auth.session(accessToken);
    const status = await this.repository.accountStatusOf(session.user.id);
    if (status !== 'active') {
      throw new ProfileError('FORBIDDEN', 403, 'This account cannot edit a profile.');
    }
    return session.user.id;
  }

  async get(userId: string): Promise<ProfileRecord> {
    const profile = await this.repository.getProfile(userId);
    if (!profile) {
      return {
        id: null,
        userId,
        displayName: null,
        dateOfBirth: null,
        bio: null,
        languagePreferences: [],
        profileStatus: 'incomplete',
        step: 'basics',
        interests: [],
        media: [],
        complete: false,
      };
    }
    return withComplete(profile);
  }

  async saveBasics(userId: string, body: unknown): Promise<ProfileRecord> {
    const parsed = basicsSchema.parse(body);
    this.assertDob(parsed.dateOfBirth);
    await this.repository.ensureUser(userId);
    const current = await this.repository.getProfile(userId);
    const saved = await this.repository.saveProfile(userId, {
      displayName: parsed.displayName,
      dateOfBirth: parsed.dateOfBirth,
      step: advanceStep(current?.step ?? 'basics', 'basics'),
    });
    return withComplete(saved);
  }

  async update(userId: string, body: unknown): Promise<ProfileRecord> {
    const parsed = profilePatchSchema.parse(body);
    if (parsed.dateOfBirth) {
      this.assertDob(parsed.dateOfBirth);
    }
    await this.repository.ensureUser(userId);
    const current = await this.repository.getProfile(userId);
    if (!current) {
      throw new ProfileError('PROFILE_NOT_FOUND', 404, 'Create your profile first.');
    }
    let step: OnboardingStep | undefined;
    if (parsed.bio !== undefined) {
      step = advanceStep(current.step, 'about');
    }
    if (parsed.languagePreferences !== undefined) {
      step = advanceStep(step ?? current.step, 'preferences');
    }
    const saved = await this.repository.saveProfile(userId, { ...parsed, step });
    return withComplete(saved);
  }

  async interests(search?: string) {
    return this.repository.listInterests(search);
  }

  async replaceInterests(userId: string, body: unknown): Promise<ProfileRecord> {
    const parsed = interestsSchema.parse(body);
    const current = await this.repository.getProfile(userId);
    if (!current) {
      throw new ProfileError('PROFILE_NOT_FOUND', 404, 'Create your profile first.');
    }
    try {
      await this.repository.replaceInterests(userId, parsed.interestIds, parsed.names ?? []);
    } catch (error) {
      if (error instanceof Error && error.message === 'unknown-interest') {
        throw new ProfileError('VALIDATION_ERROR', 400, 'Choose interests from the list.');
      }
      if (error instanceof Error && error.message === 'invalid-interest') {
        throw new ProfileError('VALIDATION_ERROR', 400, 'Use a shorter interest name without symbols.');
      }
      throw error;
    }
    const saved = await this.repository.saveProfile(userId, { step: advanceStep(current.step, 'interests') });
    return withComplete(saved);
  }

  async rates(userId: string) {
    return this.repository.getRates(userId);
  }

  async saveRates(userId: string, body: unknown) {
    const parsed = ratesSchema.parse(body);
    const current = await this.repository.getProfile(userId);
    if (!current) {
      throw new ProfileError('PROFILE_NOT_FOUND', 404, 'Create your profile first.');
    }
    return this.repository.saveRates(userId, parsed);
  }

  async reorderMedia(userId: string, body: unknown): Promise<ProfileRecord> {
    const parsed = mediaOrderSchema.parse(body);
    const moved = await this.repository.reorderMedia(userId, parsed.mediaIds);
    if (!moved) {
      throw new ProfileError('VALIDATION_ERROR', 400, 'Choose photos from your profile.');
    }
    return this.get(userId);
  }

  async addMedia(userId: string, bytes: Buffer, _declaredType: string | undefined): Promise<ProfileRecord> {
    if (!bytes.length || bytes.length > this.limits.maxBytes || !detectImage(bytes)) {
      logger.error('Photo rejected', {
        bytes: bytes.length,
        head: bytes.subarray(0, 8).toString('hex'),
        limit: this.limits.maxBytes,
      });
      throw new ProfileError('VALIDATION_ERROR', 400, 'We couldn\'t add that photo. Try another one.');
    }
    const current = await this.repository.getProfile(userId);
    if (!current) {
      throw new ProfileError('PROFILE_NOT_FOUND', 404, 'Create your profile first.');
    }
    if (current.media.length >= this.limits.maxPhotos) {
      throw new ProfileError('VALIDATION_ERROR', 400, 'We couldn\'t add that photo. Try another one.');
    }
    const id = randomUUID();
    const stored = await this.storage.save(userId, id, bytes);
    await this.repository.addMedia({
      id,
      userId,
      storageKey: stored.storageKey,
      contentType: stored.contentType,
      isPrimary: current.media.length === 0,
    });
    return withComplete(await this.repository.saveProfile(userId, { step: advanceStep(current.step, 'photo') }));
  }

  async removeMedia(userId: string, mediaId: string): Promise<ProfileRecord> {
    const removed = await this.repository.deleteMedia(userId, mediaId);
    if (!removed) {
      throw new ProfileError('MEDIA_NOT_FOUND', 404, 'That photo was not found.');
    }
    await this.storage.remove(removed.storageKey);
    return this.get(userId);
  }

  async readMedia(userId: string, mediaId: string): Promise<{ bytes: Buffer; contentType: string }> {
    const media = await this.repository.getMedia(userId, mediaId);
    if (!media) {
      throw new ProfileError('MEDIA_NOT_FOUND', 404, 'That photo was not found.');
    }
    const bytes = await this.storage.read(media.storageKey);
    return { bytes, contentType: media.contentType };
  }

  async complete(userId: string): Promise<ProfileRecord> {
    const current = await this.get(userId);
    if (!isComplete(current)) {
      throw new ProfileError('PROFILE_INCOMPLETE', 400, 'Add your name, date of birth, and a profile photo first.');
    }
    const saved = await this.repository.saveProfile(userId, { profileStatus: 'active', step: 'complete' });
    return withComplete(saved);
  }

  private assertDob(value: string) {
    try {
      assertAdultDateOfBirth(value);
    } catch (error) {
      const age = error instanceof Error && error.message === 'age';
      throw new ProfileError(
        'VALIDATION_ERROR',
        400,
        age ? 'You need to be 18 or older.' : 'Enter a valid date of birth.',
      );
    }
  }
}
