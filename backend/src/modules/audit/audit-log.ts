import { randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
};

function uuidOrNull(value: unknown): string | null {
  return typeof value === 'string' && uuidPattern.test(value) ? value : null;
}

export function createAuditLog(pool: Pool) {
  return function record(entry: AuditEntry): void {
    const entityId = uuidOrNull(entry.entityId) ?? randomUUID();
    const actorUserId = uuidOrNull(entry.actorUserId);
    const metadata = entry.metadata ?? {};
    void insert(pool, actorUserId, entry.action.slice(0, 200), entry.entityType.slice(0, 80), entityId, metadata);
  };
}

async function insert(
  pool: Pool,
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const sql = `INSERT INTO acc.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`;
  const params = [actorUserId, action, entityType, entityId, JSON.stringify(metadata)];
  try {
    await pool.query(sql, params);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (actorUserId && code === '23503') {
      await pool.query(sql, [null, action, entityType, entityId, JSON.stringify(metadata)]).catch((retryError: unknown) => {
        console.error(JSON.stringify({ level: 'error', event: 'audit log failed', message: retryError instanceof Error ? retryError.message : 'failed' }));
      });
      return;
    }
    console.error(JSON.stringify({ level: 'error', event: 'audit log failed', message: error instanceof Error ? error.message : 'failed' }));
  }
}
