import type { LocalDatabase } from '@/database/sqlite/database';
import { MIGRATION_001 } from '@/database/sqlite/schema';

export type Migration = {
  version: number;
  sql: string;
};

export const MIGRATIONS: Migration[] = [
  { version: 1, sql: MIGRATION_001 },
];

export async function applyMigrations(db: LocalDatabase, migrations: Migration[] = MIGRATIONS): Promise<void> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
  );`);
  const row = await db.first<{ version: number | null }>('SELECT MAX(version) AS version FROM schema_migrations');
  const current = row?.version ?? 0;
  for (const migration of migrations) {
    if (migration.version <= current) continue;
    await db.transaction(async () => {
      await db.exec(migration.sql);
      await db.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        migration.version,
        new Date().toISOString(),
      ]);
    });
  }
}
