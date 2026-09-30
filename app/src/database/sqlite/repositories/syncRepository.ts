import { getDatabase } from '@/database/sqlite/database';

export const syncRepository = {
  async get(key: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.first<{ synced_at: string }>('SELECT synced_at FROM sync_metadata WHERE key = ?', [key]);
    return row?.synced_at ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO sync_metadata (key, synced_at) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET synced_at = excluded.synced_at`,
      [key, value],
    );
  },
};
