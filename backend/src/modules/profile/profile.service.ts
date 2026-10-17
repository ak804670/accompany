import { randomInt, randomUUID } from 'node:crypto';

import type { AuthService } from '../auth/auth.service.js';
import { advanceStep, isComplete } from './profile.completion.js';
import { ProfileError } from './profile.errors.js';
import type { MediaStorage } from './media-storage.js';
import { detectImage } from './media-storage.js';
import type { ProfileRepository } from './profile.repository.js';
import type { OnboardingStep, ProfessionalRole, ProfileRecord } from './profile.types.js';
import { assertAdultDateOfBirth, basicsSchema, interestsSchema, mediaOrderSchema, profilePatchSchema, ratesSchema } from './profile.validation.js';
import { logger } from '../../utils/logger.js';

const defaultMediaLimits = { maxBytes: 4_000_000, maxPhotos: 10 };

function withComplete(profile: ProfileRecord): ProfileRecord {
  const anonymousComplete = profile.accountIntent === 'anonymous' && profile.profileStatus === 'hidden' && profile.step === 'complete' && Boolean(profile.displayName && profile.dateOfBirth);
  return { ...profile, complete: anonymousComplete || (profile.profileStatus === 'active' && isComplete(profile)) };
}

const aliasFirstWords = ['Calm', 'Kind', 'Bright', 'Gentle', 'Quiet', 'Sunny', 'Brave', 'Clever'];
const aliasSecondWords = ['Fox', 'Owl', 'River', 'Maple', 'Robin', 'Willow', 'Panda', 'Dove'];

function randomAnonymousAlias(): string {
  const first = aliasFirstWords[randomInt(aliasFirstWords.length)]!;
  const second = aliasSecondWords[randomInt(aliasSecondWords.length)]!;
  return `${first}${second}${String(randomInt(10_000)).padStart(4, '0')}`;
}

function isProfessional(role: ProfileRecord['supportRole']): role is ProfessionalRole {
  return role === 'astrologer' || role === 'counselor' || role === 'expert';
}

function hasRate(rates: { chat: number | null; audio: number | null; video: number | null }): boolean {
  return Boolean(rates.chat || rates.audio || rates.video);
}

function nextListingStep(profile: ProfileRecord, rates: { chat: number | null; audio: number | null; video: number | null }): { step: OnboardingStep; profileStatus: ProfileRecord['profileStatus'] } {
  if (isComplete(profile) && hasRate(rates)) return { step: 'complete', profileStatus: 'active' };
  if (isComplete(profile)) return { step: 'rates', profileStatus: 'incomplete' };
  const startedPublicProfile = Boolean(profile.bio?.trim()) || profile.interests.length > 0 || profile.languagePreferences.length > 0;
  if (startedPublicProfile) return { step: 'photo', profileStatus: 'incomplete' };
  return { step: 'gender', profileStatus: 'incomplete' };
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
        step: 'intent',
        interests: [],
        media: [],
        complete: false,
        accountIntent: 'provider', supportRole: null, expertSubject: null, verificationStatus: 'none', verificationNote: null,
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
      step: current?.accountIntent === 'anonymous' ? 'preferences' : advanceStep(current?.step ?? 'basics', 'basics'),
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
    if (current.accountIntent === 'anonymous' && parsed.languagePreferences !== undefined) {
      step = current.step === 'complete' ? 'complete' : 'review';
    } else if (parsed.bio !== undefined) {
      step = advanceStep(current.step, 'about');
    } else if (parsed.languagePreferences !== undefined) {
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
    const saved = await this.repository.saveRates(userId, parsed);
    if (current.step !== 'complete') {
      await this.repository.saveProfile(userId, { step: 'review' });
    }
    return saved;
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
    const current = await this.repository.getMedia(userId, mediaId);
    if (!current) {
      throw new ProfileError('MEDIA_NOT_FOUND', 404, 'That photo was not found.');
    }
    if (current.isPrimary) {
      throw new ProfileError('VALIDATION_ERROR', 400, 'Set another photo as primary before removing this one.');
    }
    const removed = await this.repository.deleteMedia(userId, mediaId);
    if (!removed) {
      throw new ProfileError('VALIDATION_ERROR', 400, 'Set another photo as primary before removing this one.');
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
    if (current.accountIntent === 'anonymous') {
      if (!current.displayName || !current.dateOfBirth) {
        throw new ProfileError('PROFILE_INCOMPLETE', 400, 'Add your alias and date of birth first.');
      }
      return withComplete(await this.repository.saveProfile(userId, { profileStatus: 'hidden', step: 'complete' }));
    }
    const rates = await this.repository.getRates(userId);
    if (!current.supportRole) {
      throw new ProfileError('PROFILE_INCOMPLETE', 400, 'Choose a support role first.');
    }
    if (!hasRate(rates)) {
      throw new ProfileError('PROFILE_INCOMPLETE', 400, 'Add at least one rate before continuing.');
    }
    if (!isComplete(current)) {
      throw new ProfileError('PROFILE_INCOMPLETE', 400, 'Add your name, date of birth, and a profile photo first.');
    }
    const saved = await this.repository.saveProfile(userId, { profileStatus: 'active', step: 'complete' });
    return withComplete(saved);
  }

  async setIntent(userId: string, body: unknown): Promise<ProfileRecord> {
    const intent = (body as { intent?: unknown } | null)?.intent;
    if (intent !== 'anonymous' && intent !== 'provider') throw new ProfileError('VALIDATION_ERROR', 400, 'Choose how you want to use the app.');
    const current = await this.get(userId);
    await this.repository.ensureUser(userId);
    if (intent === 'anonymous') {
      const alreadyAnonymous = current.accountIntent === 'anonymous';
      const displayName = alreadyAnonymous && current.displayName?.trim() ? current.displayName : randomAnonymousAlias();
      const finished = current.complete && Boolean(current.dateOfBirth);
      const step: OnboardingStep = finished ? 'complete' : current.dateOfBirth ? 'preferences' : 'basics';
      const saved = await this.repository.saveProfile(userId, { displayName, accountIntent: intent, supportRole: null, expertSubject: null, verificationStatus: 'none', verificationNote: null, profileStatus: 'hidden', step });
      await this.repository.setCompanionOffline(userId);
      return withComplete(saved);
    }
    if (!current.id || !current.displayName?.trim() || !current.dateOfBirth) {
      throw new ProfileError('PROFILE_INCOMPLETE', 400, 'Add your name and date of birth before choosing a support role.');
    }
    const rates = await this.repository.getRates(userId);
    const listing = current.supportRole ? nextListingStep(current, rates) : { step: 'role' as const, profileStatus: 'incomplete' as const };
    return withComplete(await this.repository.saveProfile(userId, { accountIntent: intent, profileStatus: listing.profileStatus, step: listing.step }));
  }

  async setRole(userId: string, body: unknown): Promise<ProfileRecord> {
    const input = body as { role?: unknown; expertSubject?: unknown } | null;
    const roles = ['friendly', 'astrologer', 'counselor', 'expert'];
    if (!input || !roles.includes(String(input.role))) throw new ProfileError('VALIDATION_ERROR', 400, 'Choose a support role.');
    const role = input.role as ProfileRecord['supportRole'];
    const subject = role === 'expert' && typeof input.expertSubject === 'string' ? input.expertSubject.trim() : null;
    if (role === 'expert' && (!subject || subject.length < 2 || subject.length > 80)) throw new ProfileError('VALIDATION_ERROR', 400, 'Enter the expert subject.');
    const current = await this.get(userId);
    if (!current.id || !current.displayName?.trim() || !current.dateOfBirth) {
      throw new ProfileError('PROFILE_INCOMPLETE', 400, 'Add your name and date of birth before choosing a support role.');
    }
    const changed = current.supportRole !== role || (role === 'expert' && current.expertSubject !== subject);
    const approved = isProfessional(role) ? await this.repository.findApprovedCredential(userId, role, subject) : null;
    const professional = approved !== null || isProfessional(role);
    const needsCertificate = professional && !approved && changed;
    const rates = await this.repository.getRates(userId);
    const listing = needsCertificate ? { step: 'certificate' as const, profileStatus: 'incomplete' as const } : nextListingStep(current, rates);
    const saved = await this.repository.saveProfile(userId, {
      accountIntent: 'provider', supportRole: role, expertSubject: subject,
      verificationStatus: approved ? 'approved' : professional && !changed ? current.verificationStatus : 'none',
      verificationNote: approved || changed || !professional ? null : current.verificationNote,
      profileStatus: listing.profileStatus, step: listing.step,
    });
    return withComplete(saved);
  }

  async skipCredential(userId: string): Promise<ProfileRecord> {
    const current = await this.requireProfessional(userId);
    const rates = await this.repository.getRates(userId);
    const listing = nextListingStep(current, rates);
    return withComplete(await this.repository.saveProfile(userId, { verificationStatus: 'none', verificationNote: null, ...listing }));
  }

  async addCredential(userId: string, bytes: Buffer): Promise<ProfileRecord> {
    const current = await this.requireProfessional(userId);
    if (!bytes.length || bytes.length > this.limits.maxBytes || !detectImage(bytes)) {
      throw new ProfileError('VALIDATION_ERROR', 400, 'Upload a JPEG, PNG, or WebP certificate.');
    }
    const id = randomUUID();
    const stored = await this.storage.save(userId, id, bytes, { folder: 'credentials' });
    await this.repository.addCredential({
      id, userId, storageKey: stored.storageKey, contentType: stored.contentType,
      supportRole: current.supportRole as ProfessionalRole, expertSubject: current.expertSubject, status: 'pending',
    });
    const rates = await this.repository.getRates(userId);
    const listing = nextListingStep(current, rates);
    return withComplete(await this.repository.saveProfile(userId, { verificationStatus: 'pending', verificationNote: null, ...listing }));
  }

  async removeCredential(userId: string): Promise<ProfileRecord> {
    const removed = await this.repository.deleteLatestPendingCredential(userId);
    if (!removed) throw new ProfileError('MEDIA_NOT_FOUND', 404, 'There is no certificate to replace.');
    await this.storage.remove(removed.storageKey);
    const current = await this.get(userId);
    if (current.verificationStatus === 'pending' && current.supportRole === removed.supportRole && (current.expertSubject ?? null) === (removed.expertSubject ?? null)) {
      return withComplete(await this.repository.saveProfile(userId, { verificationStatus: 'none', verificationNote: null }));
    }
    return current;
  }

  async reviewCredential(userId: string, body: unknown): Promise<ProfileRecord> {
    const input = body as { status?: unknown; note?: unknown } | null;
    if (!input || (input.status !== 'approved' && input.status !== 'rejected')) {
      throw new ProfileError('VALIDATION_ERROR', 400, 'Choose whether to approve or reject the certificate.');
    }
    const note = input.status === 'rejected' && typeof input.note === 'string' ? input.note.trim().slice(0, 500) : null;
    const credential = await this.repository.reviewLatestCredential(userId, input.status);
    if (!credential) throw new ProfileError('MEDIA_NOT_FOUND', 404, 'Upload a certificate first.');
    const current = await this.get(userId);
    if (current.supportRole !== credential.supportRole || (current.expertSubject ?? null) !== (credential.expertSubject ?? null)) {
      return current;
    }
    return withComplete(await this.repository.saveProfile(userId, {
      verificationStatus: input.status,
      verificationNote: input.status === 'rejected' ? note : null,
    }));
  }

  async resumeCredential(userId: string): Promise<ProfileRecord> {
    await this.requireProfessional(userId);
    return withComplete(await this.repository.saveProfile(userId, { profileStatus: 'incomplete', step: 'certificate' }));
  }

  private async requireProfessional(userId: string): Promise<ProfileRecord> {
    const current = await this.get(userId);
    if (!isProfessional(current.supportRole)) {
      throw new ProfileError('VALIDATION_ERROR', 400, 'Choose a professional support role before adding a certificate.');
    }
    return current;
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
