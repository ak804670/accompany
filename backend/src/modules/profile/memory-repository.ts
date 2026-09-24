import { randomUUID } from 'node:crypto';

import type { Interest, ProfileRecord, StoredMedia } from './profile.types.js';
import type { ProfileRepository, ProfileWrite } from './profile.repository.js';

export class MemoryProfileRepository implements ProfileRepository {
  users = new Set<string>();
  profiles = new Map<string, ProfileRecord>();
  media = new Map<string, StoredMedia & { deleted: boolean }>();
  interests: Interest[] = [
    { id: '10000000-0000-4000-8000-000000000001', name: 'Music', slug: 'music' },
    { id: '10000000-0000-4000-8000-000000000006', name: 'Technology', slug: 'technology' },
  ];
  accountStatus = new Map<string, string>();

  async accountStatusOf(userId: string): Promise<string | null> {
    return this.accountStatus.get(userId) ?? 'active';
  }

  async ensureUser(userId: string): Promise<void> {
    this.users.add(userId);
  }

  async getProfile(userId: string): Promise<ProfileRecord | null> {
    return this.profiles.get(userId) ?? null;
  }

  async saveProfile(userId: string, write: ProfileWrite): Promise<ProfileRecord> {
    const current = this.profiles.get(userId);
    const next: ProfileRecord = {
      id: current?.id ?? randomUUID(),
      userId,
      displayName: write.displayName === undefined ? current?.displayName ?? null : write.displayName,
      dateOfBirth: write.dateOfBirth === undefined ? current?.dateOfBirth ?? null : write.dateOfBirth,
      bio: write.bio === undefined ? current?.bio ?? null : write.bio,
      languagePreferences: write.languagePreferences ?? current?.languagePreferences ?? [],
      profileStatus: write.profileStatus ?? current?.profileStatus ?? 'incomplete',
      step: write.step ?? current?.step ?? 'basics',
      interests: current?.interests ?? [],
      media: current?.media ?? [],
      complete: false,
    };
    this.profiles.set(userId, next);
    return next;
  }

  async listInterests(search?: string): Promise<Interest[]> {
    const query = search?.trim().toLowerCase();
    return this.interests.filter((item) => !query || item.name.toLowerCase().includes(query) || item.slug.includes(query));
  }

  async replaceInterests(userId: string, interestIds: string[]): Promise<Interest[]> {
    const selected = this.interests.filter((item) => interestIds.includes(item.id));
    if (selected.length !== interestIds.length) {
      throw new Error('unknown-interest');
    }
    const profile = this.profiles.get(userId);
    if (profile) {
      profile.interests = selected;
    }
    return selected;
  }

  async addMedia(media: StoredMedia): Promise<void> {
    const existing = [...this.media.values()].filter((item) => item.userId === media.userId && !item.deleted);
    const isPrimary = existing.length === 0;
    this.media.set(media.id, { ...media, isPrimary, deleted: false });
    const profile = this.profiles.get(media.userId);
    if (profile) {
      profile.media = [...profile.media.filter((item) => item.id !== media.id), { id: media.id, isPrimary, contentType: media.contentType }];
    }
  }

  async getMedia(userId: string, mediaId: string): Promise<StoredMedia | null> {
    const media = this.media.get(mediaId);
    if (!media || media.deleted || media.userId !== userId) {
      return null;
    }
    return media;
  }

  async deleteMedia(userId: string, mediaId: string): Promise<StoredMedia | null> {
    const media = await this.getMedia(userId, mediaId);
    if (!media) {
      return null;
    }
    this.media.get(mediaId)!.deleted = true;
    const profile = this.profiles.get(userId);
    if (profile) {
      profile.media = profile.media.filter((item) => item.id !== mediaId);
      if (media.isPrimary && profile.media[0]) {
        profile.media[0] = { ...profile.media[0], isPrimary: true };
        const stored = this.media.get(profile.media[0].id);
        if (stored) {
          stored.isPrimary = true;
        }
      }
    }
    return media;
  }
}
