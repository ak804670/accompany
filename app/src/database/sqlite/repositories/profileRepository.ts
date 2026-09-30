import { getDatabase } from '@/database/sqlite/database';
import { rememberProfile, rememberRates, peekProfile, peekRates, type RateSnapshot } from '@/database/sqlite/memory';
import type { UserProfile } from '@/features/profile/types';

function now(): string {
  return new Date().toISOString();
}

export const profileRepository = {
  peek(): UserProfile | null {
    return peekProfile();
  },

  peekRates(): RateSnapshot | null {
    return peekRates();
  },

  async getCurrent(): Promise<UserProfile | null> {
    const db = await getDatabase();
    const row = await db.first<{ payload: string }>('SELECT payload FROM current_profile WHERE id = 1');
    if (!row) return null;
    const profile = JSON.parse(row.payload) as UserProfile;
    rememberProfile(profile);
    return profile;
  },

  async saveCurrent(profile: UserProfile): Promise<void> {
    const db = await getDatabase();
    const stamped = now();
    await db.run(
      `INSERT INTO current_profile (id, payload, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      [JSON.stringify(profile), stamped],
    );
    if (profile.id) {
      await db.run(
        `INSERT INTO users (id, name, avatar, is_online, last_seen, updated_at) VALUES (?, ?, ?, 0, NULL, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, updated_at = excluded.updated_at`,
        [profile.id, profile.displayName ?? '', profile.media.find((item) => item.isPrimary)?.id ?? profile.media[0]?.id ?? null, stamped],
      );
    }
    rememberProfile(profile);
  },

  async getRates(): Promise<RateSnapshot | null> {
    const db = await getDatabase();
    const row = await db.first<{ chat: number | null; audio: number | null; video: number | null }>('SELECT chat, audio, video FROM profile_rates WHERE id = 1');
    if (!row) return null;
    const rates = { chat: row.chat, audio: row.audio, video: row.video };
    rememberRates(rates);
    return rates;
  },

  async saveRates(rates: RateSnapshot): Promise<void> {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO profile_rates (id, chat, audio, video, updated_at) VALUES (1, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET chat = excluded.chat, audio = excluded.audio, video = excluded.video, updated_at = excluded.updated_at`,
      [rates.chat, rates.audio, rates.video, now()],
    );
    rememberRates(rates);
  },
};
