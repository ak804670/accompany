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

  async replaceInterests(userId: string, interestIds: string[], names: string[] = []): Promise<Interest[]> {
    const created = names.map((name) => {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const existing = this.interests.find((item) => item.slug === slug || item.name.toLowerCase() === name.trim().toLowerCase());
      if (existing) return existing;
      const interest = { id: randomUUID(), name: name.trim(), slug };
      this.interests.push(interest);
      return interest;
    });
    const selected = [
      ...this.interests.filter((item) => interestIds.includes(item.id)),
      ...created.filter((item) => !interestIds.includes(item.id)),
    ];
    const unique = [...new Map(selected.map((item) => [item.id, item])).values()];
    if (unique.filter((item) => interestIds.includes(item.id)).length !== interestIds.length) {
      throw new Error('unknown-interest');
    }
    const profile = this.profiles.get(userId);
    if (profile) {
      profile.interests = unique;
    }
    return unique;
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

  rates = new Map<string, { chat: number | null; audio: number | null; video: number | null }>();

  async reorderMedia(userId: string, mediaIds: string[]): Promise<boolean> {
    const profile = this.profiles.get(userId);
    if (!profile || profile.media.length !== mediaIds.length || profile.media.some((item) => !mediaIds.includes(item.id))) {
      return false;
    }
    profile.media = mediaIds.map((id, index) => {
      const media = profile.media.find((item) => item.id === id)!;
      const stored = this.media.get(id);
      if (stored) stored.isPrimary = index === 0;
      return { ...media, isPrimary: index === 0 };
    });
    return true;
  }

  async getRates(userId: string) {
    return this.rates.get(userId) ?? { chat: null, audio: null, video: null };
  }

  async saveRates(userId: string, rates: { chat?: number; audio?: number; video?: number }) {
    const current = await this.getRates(userId);
    const next = {
      chat: rates.chat ?? current.chat,
      audio: rates.audio ?? current.audio,
      video: rates.video ?? current.video,
    };
    this.rates.set(userId, next);
    return next;
  }
}
