import * as SQLite from 'expo-sqlite';

import { migrate } from '@/database/migrations';

export type SqlBind = string | number | null;

export type AppDatabase = {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlBind[]): Promise<void>;
  all<T>(sql: string, params?: SqlBind[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlBind[]): Promise<T | null>;
};

const USER_TABLES = [
  'profiles',
  'profile_rates',
  'conversations',
  'messages',
  'wallet_snapshots',
  'wallet_transactions',
  'discovery_cards',
  'discovery_cursors',
  'cache_meta',
] as const;

let opening: Promise<AppDatabase> | null = null;

function wrap(sqlite: SQLite.SQLiteDatabase): AppDatabase {
  return {
    exec: (sql) => sqlite.execAsync(sql),
    run: async (sql, params = []) => {
      await sqlite.runAsync(sql, ...params);
    },
    all: (sql, params = []) => sqlite.getAllAsync(sql, ...params),
    first: async (sql, params = []) => (await sqlite.getFirstAsync(sql, ...params)) ?? null,
  };
}

export function openDatabase(): Promise<AppDatabase> {
  if (!opening) {
    opening = SQLite.openDatabaseAsync('accompany.db')
      .then(async (sqlite) => {
        const db = wrap(sqlite);
        await migrate(db);
        return db;
      })
      .catch((error: unknown) => {
        opening = null;
        throw error;
      });
  }
  return opening;
}

/** Test seam. Production code opens Expo SQLite through openDatabase. */
export function bindDatabase(db: AppDatabase): void {
  opening = Promise.resolve(db);
}

export function resetDatabaseBinding(): void {
  opening = null;
}

export async function clearUserCache(ownerUserId: string): Promise<void> {
  const db = await openDatabase();
  await db.exec('BEGIN');
  try {
    for (const table of USER_TABLES) {
      await db.run(`DELETE FROM ${table} WHERE owner_user_id = ?`, [ownerUserId]);
    }
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}
