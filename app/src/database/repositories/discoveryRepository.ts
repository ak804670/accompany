import { openDatabase } from '@/database/db';
import type { OnlinePerson } from '@/features/home/people.service';

type CardRow = { person_id: string; position: number; card_json: string };
type CursorRow = { next_cursor: string | null };

export function discoveryFilterKey(distanceKm: number | null, interestIds: string[]): string {
  return `${distanceKm ?? ''}|${[...interestIds].sort().join(',')}`;
}

export const discoveryRepository = {
  async read(ownerUserId: string, filterKey: string): Promise<{ people: OnlinePerson[]; cursor: string | null }> {
    try {
      const db = await openDatabase();
      const rows = await db.all<CardRow>(
        `SELECT person_id, position, card_json FROM discovery_cards
         WHERE owner_user_id = ? AND filter_key = ? ORDER BY position ASC`,
        [ownerUserId, filterKey],
      );
      const cursor = await db.first<CursorRow>(
        'SELECT next_cursor FROM discovery_cursors WHERE owner_user_id = ? AND filter_key = ?',
        [ownerUserId, filterKey],
      );
      return {
        people: rows.map((row) => JSON.parse(row.card_json) as OnlinePerson),
        cursor: cursor?.next_cursor ?? null,
      };
    } catch {
      return { people: [], cursor: null };
    }
  },

  async replace(ownerUserId: string, filterKey: string, people: OnlinePerson[], cursor: string | null): Promise<void> {
    const db = await openDatabase();
    await db.exec('BEGIN');
    try {
      await db.run('DELETE FROM discovery_cards WHERE owner_user_id = ? AND filter_key = ?', [ownerUserId, filterKey]);
      for (const [position, person] of people.entries()) {
        await db.run(
          `INSERT INTO discovery_cards (owner_user_id, filter_key, person_id, position, card_json)
           VALUES (?, ?, ?, ?, ?)`,
          [ownerUserId, filterKey, person.userId, position, JSON.stringify(person)],
        );
      }
      await db.run(
        `INSERT INTO discovery_cursors (owner_user_id, filter_key, next_cursor) VALUES (?, ?, ?)
         ON CONFLICT(owner_user_id, filter_key) DO UPDATE SET next_cursor = excluded.next_cursor`,
        [ownerUserId, filterKey, cursor],
      );
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  },

  async saveCursor(ownerUserId: string, filterKey: string, cursor: string | null): Promise<void> {
    const db = await openDatabase();
    await db.run(
      `INSERT INTO discovery_cursors (owner_user_id, filter_key, next_cursor) VALUES (?, ?, ?)
       ON CONFLICT(owner_user_id, filter_key) DO UPDATE SET next_cursor = excluded.next_cursor`,
      [ownerUserId, filterKey, cursor],
    );
  },

  async findPerson(ownerUserId: string, personId: string): Promise<OnlinePerson | null> {
    try {
      const db = await openDatabase();
      const row = await db.first<{ card_json: string }>(
        'SELECT card_json FROM discovery_cards WHERE owner_user_id = ? AND person_id = ? LIMIT 1',
        [ownerUserId, personId],
      );
      return row ? (JSON.parse(row.card_json) as OnlinePerson) : null;
    } catch {
      return null;
    }
  },
};
