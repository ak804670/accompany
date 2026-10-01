import { openDatabase, type SqlBind } from '@/database/db';
import type { UserProfile } from '@/features/profile/types';

export type ProfileRates = {
  chat: number | null;
  audio: number | null;
  video: number | null;
};

type ProfileRow = { profile_json: string };
type RatesRow = { chat: number | null; audio: number | null; video: number | null };

const profiles = new Map<string, UserProfile>();
const rates = new Map<string, ProfileRates>();

function memoryKey(ownerUserId: string): string {
  return ownerUserId;
}

export function clearProfileMemory(): void {
  profiles.clear();
  rates.clear();
}

export const profileRepository = {
  peek(ownerUserId: string): UserProfile | null {
    return profiles.get(memoryKey(ownerUserId)) ?? null;
  },

  async get(ownerUserId: string): Promise<UserProfile | null> {
    const remembered = profiles.get(memoryKey(ownerUserId));
    if (remembered) return remembered;
    try {
      const db = await openDatabase();
      const row = await db.first<ProfileRow>('SELECT profile_json FROM profiles WHERE owner_user_id = ?', [ownerUserId]);
      if (!row) return null;
      const profile = JSON.parse(row.profile_json) as UserProfile;
      profiles.set(memoryKey(ownerUserId), profile);
      return profile;
    } catch {
      return null;
    }
  },

  async save(ownerUserId: string, profile: UserProfile): Promise<void> {
    profiles.set(memoryKey(ownerUserId), profile);
    const db = await openDatabase();
    await db.run(
      `INSERT INTO profiles (owner_user_id, profile_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(owner_user_id) DO UPDATE SET
         profile_json = excluded.profile_json,
         updated_at = excluded.updated_at`,
      [ownerUserId, JSON.stringify(profile), new Date().toISOString()],
    );
  },

  peekRates(ownerUserId: string): ProfileRates | null {
    return rates.get(memoryKey(ownerUserId)) ?? null;
  },

  async getRates(ownerUserId: string): Promise<ProfileRates | null> {
    const remembered = rates.get(memoryKey(ownerUserId));
    if (remembered) return remembered;
    try {
      const db = await openDatabase();
      const row = await db.first<RatesRow>(
        'SELECT chat, audio, video FROM profile_rates WHERE owner_user_id = ?',
        [ownerUserId],
      );
      if (!row) return null;
      const next = { chat: row.chat, audio: row.audio, video: row.video };
      rates.set(memoryKey(ownerUserId), next);
      return next;
    } catch {
      return null;
    }
  },

  async saveRates(ownerUserId: string, next: ProfileRates): Promise<void> {
    rates.set(memoryKey(ownerUserId), next);
    const db = await openDatabase();
    const params: SqlBind[] = [ownerUserId, next.chat, next.audio, next.video, new Date().toISOString()];
    await db.run(
      `INSERT INTO profile_rates (owner_user_id, chat, audio, video, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(owner_user_id) DO UPDATE SET
         chat = excluded.chat,
         audio = excluded.audio,
         video = excluded.video,
         updated_at = excluded.updated_at`,
      params,
    );
  },
};
