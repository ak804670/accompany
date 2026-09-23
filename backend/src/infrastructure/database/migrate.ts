import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { readConfig } from '../../config/env.js';
import { createPool } from './pool.js';

const migrationsDir = path.resolve(import.meta.dirname, '../../../migrations');

export async function migrate(databaseUrl = readConfig().databaseUrl): Promise<void> {
  const pool = createPool(databaseUrl);

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const applied = await pool.query<{ id: string }>('SELECT id FROM schema_migrations');
    const appliedIds = new Set(applied.rows.map((row) => row.id));
    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

    for (const file of files) {
      if (appliedIds.has(file)) {
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  migrate().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Migration failed');
    process.exit(1);
  });
}
