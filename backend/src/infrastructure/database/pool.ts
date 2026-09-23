import pg from 'pg';

export type SqlClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>;
};

export function createPool(databaseUrl: string) {
  return new pg.Pool({ connectionString: databaseUrl });
}
