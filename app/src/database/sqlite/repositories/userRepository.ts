import { getDatabase, type SqlValue } from '@/database/sqlite/database';
import type { OnlinePerson } from '@/features/home/people.service';

function now(): string {
  return new Date().toISOString();
}

export const userRepository = {
  async savePerson(person: OnlinePerson): Promise<void> {
    const db = await getDatabase();
    const stamped = now();
    await db.run(
      `INSERT INTO users (id, name, avatar, is_online, last_seen, updated_at) VALUES (?, ?, ?, ?, NULL, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, is_online = excluded.is_online, updated_at = excluded.updated_at`,
      [person.userId, person.name, person.mediaId, person.online ? 1 : 0, stamped],
    );
    await db.run(
      `INSERT INTO profiles (user_id, bio, location, latitude, longitude, interests, audio_rate, video_rate, chat_rate, payload, updated_at)
       VALUES (?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         bio = excluded.bio,
         interests = excluded.interests,
         audio_rate = excluded.audio_rate,
         video_rate = excluded.video_rate,
         chat_rate = excluded.chat_rate,
         payload = excluded.payload,
         updated_at = excluded.updated_at`,
      [
        person.userId,
        person.bio,
        JSON.stringify(person.interests),
        person.rates.audio,
        person.rates.video,
        person.rates.chat,
        JSON.stringify(person),
        stamped,
      ] as SqlValue[],
    );
  },

  async getPerson(userId: string): Promise<OnlinePerson | null> {
    const db = await getDatabase();
    const row = await db.first<{ payload: string | null }>('SELECT payload FROM profiles WHERE user_id = ?', [userId]);
    if (!row?.payload) return null;
    return JSON.parse(row.payload) as OnlinePerson;
  },
};
