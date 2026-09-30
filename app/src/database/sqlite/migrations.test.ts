import { applyMigrations, type Migration } from '@/database/sqlite/migrations';
import type { LocalDatabase } from '@/database/sqlite/database';
import { MIGRATION_001 } from '@/database/sqlite/schema';

function fakeDatabase() {
  const versions: number[] = [];
  let sql = '';
  const db = {
    exec: async (statement: string) => {
      sql += statement;
    },
    run: async (statement: string, params: Array<string | number | null> = []) => {
      if (statement.startsWith('INSERT INTO schema_migrations')) versions.push(Number(params[0]));
    },
    all: async () => [],
    first: async (statement: string) => {
      if (!statement.includes('MAX(version)')) return null;
      const version = versions.length === 0 ? null : Math.max(...versions);
      return { version };
    },
    transaction: async (task: () => Promise<void>) => {
      await task();
    },
  };
  return { db: db as LocalDatabase, versions, appliedSql: () => sql };
}

describe('sqlite migrations', () => {
  it('creates the local tables from versioned migrations', async () => {
    const { db, versions, appliedSql } = fakeDatabase();
    await applyMigrations(db, [{ version: 1, sql: MIGRATION_001 }]);
    expect(versions).toEqual([1]);
    const schema = appliedSql();
    for (const table of ['users', 'profiles', 'conversations', 'messages', 'chat_requests', 'calls', 'blocked_users', 'home_cards', 'sync_metadata']) {
      expect(schema).toContain(`CREATE TABLE ${table}`);
    }
    expect(schema).not.toContain('access_token');
    expect(schema).not.toContain('refresh_token');
  });

  it('skips migrations that are already applied', async () => {
    const { db, versions } = fakeDatabase();
    const migrations: Migration[] = [
      { version: 1, sql: 'CREATE TABLE example (id TEXT);' },
      { version: 2, sql: 'ALTER TABLE example ADD COLUMN name TEXT;' },
    ];
    await applyMigrations(db, migrations);
    await applyMigrations(db, migrations);
    expect(versions).toEqual([1, 2]);
  });
});
