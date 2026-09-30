import * as SQLite from 'expo-sqlite';

import { applyMigrations } from '@/database/sqlite/migrations';

export type SqlValue = string | number | null;

export type LocalDatabase = {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  transaction(task: () => Promise<void>): Promise<void>;
};

let database: LocalDatabase | null = null;
let opening: Promise<LocalDatabase> | null = null;

export function setDatabaseForTests(next: LocalDatabase | null): void {
  database = next;
  opening = next ? Promise.resolve(next) : null;
}

async function openSqlite(): Promise<LocalDatabase> {
  const db = await SQLite.openDatabaseAsync('accompany.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      await db.runAsync(sql, params);
    },
    all: (sql, params = []) => db.getAllAsync(sql, params),
    first: (sql, params = []) => db.getFirstAsync(sql, params),
    transaction: (task) => db.withTransactionAsync(task),
  };
}

export function getDatabase(): Promise<LocalDatabase> {
  if (database) return Promise.resolve(database);
  if (!opening) {
    opening = openSqlite()
      .then(async (db) => {
        await applyMigrations(db);
        database = db;
        return db;
      })
      .catch((error: unknown) => {
        opening = null;
        throw error;
      });
  }
  return opening;
}

export function initDatabase(): Promise<void> {
  return getDatabase().then(() => undefined);
}
