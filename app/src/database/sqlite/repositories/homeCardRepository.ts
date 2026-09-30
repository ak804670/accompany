import { getDatabase } from '@/database/sqlite/database';
import { peekHome, rememberHome } from '@/database/sqlite/memory';
import { syncRepository } from '@/database/sqlite/repositories/syncRepository';
import { userRepository } from '@/database/sqlite/repositories/userRepository';
import type { OnlinePerson } from '@/features/home/people.service';

function now(): string {
  return new Date().toISOString();
}

function cursorKey(filterKey: string): string {
  return `home:${filterKey}:cursor`;
}

async function readCursor(filterKey: string): Promise<string | null> {
  const value = await syncRepository.get(cursorKey(filterKey));
  if (value === null || value === '') return null;
  return value;
}

export const homeCardRepository = {
  peek(filterKey: string) {
    return peekHome(filterKey);
  },

  async read(filterKey: string): Promise<{ people: OnlinePerson[]; cursor: string | null }> {
    const db = await getDatabase();
    const rows = await db.all<{ payload: string }>('SELECT payload FROM home_cards WHERE filter_key = ? ORDER BY position ASC', [filterKey]);
    const people = rows.map((row) => JSON.parse(row.payload) as OnlinePerson);
    const cursor = await readCursor(filterKey);
    const snapshot = { people, cursor };
    rememberHome(filterKey, snapshot);
    return snapshot;
  },

  async find(userId: string): Promise<OnlinePerson | null> {
    const db = await getDatabase();
    const row = await db.first<{ payload: string }>('SELECT payload FROM home_cards WHERE user_id = ? LIMIT 1', [userId]);
    return row ? JSON.parse(row.payload) as OnlinePerson : null;
  },

  async replace(filterKey: string, people: OnlinePerson[], cursor: string | null): Promise<void> {
    const db = await getDatabase();
    const stamped = now();
    await db.transaction(async () => {
      await db.run('DELETE FROM home_cards WHERE filter_key = ?', [filterKey]);
      for (const [position, person] of people.entries()) {
        await db.run(
          `INSERT INTO home_cards (user_id, filter_key, position, is_available, payload, cached_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [person.userId, filterKey, position, person.online ? 1 : 0, JSON.stringify(person), stamped, stamped],
        );
      }
    });
    for (const person of people) await userRepository.savePerson(person);
    await syncRepository.set(cursorKey(filterKey), cursor ?? '');
    rememberHome(filterKey, { people, cursor });
  },

  async append(filterKey: string, people: OnlinePerson[], cursor: string | null): Promise<OnlinePerson[]> {
    const current = await this.read(filterKey);
    const seen = new Set(current.people.map((person) => person.userId));
    const next = [...current.people];
    for (const person of people) {
      if (seen.has(person.userId)) continue;
      seen.add(person.userId);
      next.push(person);
    }
    await this.replace(filterKey, next, cursor);
    return next;
  },

  async patch(filterKey: string, people: OnlinePerson[]): Promise<OnlinePerson[]> {
    const current = await this.read(filterKey);
    const incoming = new Map(people.map((person) => [person.userId, person]));
    const seen = new Set(current.people.map((person) => person.userId));
    const next = current.people.map((person) => incoming.get(person.userId) ?? person);
    for (const person of people) {
      if (seen.has(person.userId)) continue;
      next.push(person);
    }
    await this.replace(filterKey, next, current.cursor);
    return next;
  },
};
