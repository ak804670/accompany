import { getDatabase } from '@/database/sqlite/database';
import { getViewerId, rememberBlocks, peekBlocks } from '@/database/sqlite/memory';

export type BlockedPerson = { userId: string; name: string };

function now(): string {
  return new Date().toISOString();
}

export const blockedUserRepository = {
  peek(): BlockedPerson[] | null {
    return peekBlocks();
  },

  async list(): Promise<BlockedPerson[]> {
    const db = await getDatabase();
    const rows = await db.all<{ blocked_user_id: string; name: string | null }>(
      'SELECT blocked_user_id, name FROM blocked_users WHERE user_id = ? ORDER BY created_at DESC',
      [getViewerId()],
    );
    const people = rows.map((row) => ({ userId: row.blocked_user_id, name: row.name ?? 'Someone' }));
    rememberBlocks(people);
    return people;
  },

  async replace(people: BlockedPerson[]): Promise<void> {
    const db = await getDatabase();
    const viewer = getViewerId();
    const stamped = now();
    await db.transaction(async () => {
      await db.run('DELETE FROM blocked_users WHERE user_id = ?', [viewer]);
      for (const person of people) {
        await db.run(
          'INSERT INTO blocked_users (user_id, blocked_user_id, name, created_at) VALUES (?, ?, ?, ?)',
          [viewer, person.userId, person.name, stamped],
        );
      }
    });
    rememberBlocks(people);
  },

  async add(person: BlockedPerson): Promise<void> {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO blocked_users (user_id, blocked_user_id, name, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, blocked_user_id) DO UPDATE SET name = excluded.name`,
      [getViewerId(), person.userId, person.name, now()],
    );
    const current = peekBlocks() ?? [];
    rememberBlocks([person, ...current.filter((item) => item.userId !== person.userId)]);
  },

  async remove(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM blocked_users WHERE user_id = ? AND blocked_user_id = ?', [getViewerId(), userId]);
    rememberBlocks((peekBlocks() ?? []).filter((item) => item.userId !== userId));
  },
};
