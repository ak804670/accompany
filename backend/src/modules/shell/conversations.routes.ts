import { randomUUID } from 'node:crypto';

import { Router } from 'express';
import type { Pool } from 'pg';

import { AuthError } from '../auth/auth.errors.js';
import type { AuthService } from '../auth/auth.service.js';

const pageSize = 30;

function bearer(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) {
    throw new AuthError('SESSION_EXPIRED', 401);
  }
  return header.slice('Bearer '.length).trim();
}

export function createConversationRouter(auth: AuthService, pool: Pool) {
  const router = Router();

  async function userId(header: string | undefined): Promise<string> {
    const session = await auth.session(bearer(header));
    return session.user.id;
  }

  router.get('/', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const cursor = typeof request.query.cursor === 'string' ? request.query.cursor : null;
      const result = await pool.query(
        `SELECT c.id, other_user.user_id AS person_id, pr.display_name, last_message.content, last_message.created_at,
                COALESCE(unread.count, 0) AS unread_count,
                (presence.last_seen_at > NOW() - INTERVAL '45 seconds') AS online
         FROM acc.p_conversation_participants mine
         JOIN acc.conversations c ON c.id = mine.conversation_id AND c.status = 'active'
         JOIN acc.p_conversation_participants other_user
           ON other_user.conversation_id = c.id AND other_user.user_id <> $1 AND other_user.left_at IS NULL
         JOIN acc.m_profiles pr ON pr.user_id = other_user.user_id
         LEFT JOIN LATERAL (
           SELECT content, created_at FROM acc.messages
           WHERE conversation_id = c.id AND deleted_at IS NULL
           ORDER BY created_at DESC
           LIMIT 1
         ) last_message ON TRUE
         LEFT JOIN acc.conversation_reads reads ON reads.conversation_id = c.id AND reads.user_id = $1
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS count FROM acc.messages
           WHERE conversation_id = c.id AND deleted_at IS NULL AND sender_id <> $1
             AND created_at > COALESCE(reads.last_read_at, 'epoch')
         ) unread ON TRUE
         LEFT JOIN acc.presence presence ON presence.user_id = other_user.user_id
         WHERE mine.user_id = $1 AND mine.left_at IS NULL
           AND ($2::timestamptz IS NULL OR last_message.created_at < $2::timestamptz OR last_message.created_at IS NULL)
         ORDER BY last_message.created_at DESC NULLS LAST
         LIMIT $3`,
        [id, cursor, pageSize + 1],
      );
      const rows = result.rows.slice(0, pageSize);
      const unread = await pool.query(
        `SELECT COUNT(*)::int AS unread
         FROM acc.messages m
         JOIN acc.p_conversation_participants mine
           ON mine.conversation_id = m.conversation_id AND mine.user_id = $1 AND mine.left_at IS NULL
         LEFT JOIN acc.conversation_reads reads
           ON reads.conversation_id = m.conversation_id AND reads.user_id = $1
         WHERE m.deleted_at IS NULL AND m.sender_id <> $1
           AND m.created_at > COALESCE(reads.last_read_at, 'epoch')`,
        [id],
      );
      response.json({
        conversations: rows.map(mapConversation),
        nextCursor: result.rows.length > pageSize ? rows.at(-1)?.created_at?.toISOString?.() ?? null : null,
        unread: Number(unread.rows[0]?.unread ?? 0),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const personId = typeof request.body?.personId === 'string' ? request.body.personId : '';
      if (!personId || personId === id) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose someone to talk with.' } });
        return;
      }
      const existing = await pool.query(
        `SELECT c.id
         FROM acc.conversations c
         JOIN acc.p_conversation_participants a ON a.conversation_id = c.id AND a.user_id = $1
         JOIN acc.p_conversation_participants b ON b.conversation_id = c.id AND b.user_id = $2
         WHERE c.conversation_type = 'direct' AND c.status = 'active'
         LIMIT 1`,
        [id, personId],
      );
      if (existing.rows[0]) {
        response.json({ conversationId: existing.rows[0].id });
        return;
      }
      const conversationId = randomUUID();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO acc.conversations (id, created_by, status, conversation_type, started_at)
           VALUES ($1, $2, 'active', 'direct', NOW())`,
          [conversationId, id],
        );
        await client.query(
          `INSERT INTO acc.p_conversation_participants (conversation_id, user_id, role)
           VALUES ($1, $2, 'owner'), ($1, $3, 'member')`,
          [conversationId, id, personId],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      response.status(201).json({ conversationId });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const result = await pool.query(
        `SELECT c.id, other_user.user_id AS person_id, pr.display_name,
                (presence.last_seen_at > NOW() - INTERVAL '45 seconds') AS online
         FROM acc.conversations c
         JOIN acc.p_conversation_participants mine
           ON mine.conversation_id = c.id AND mine.user_id = $1 AND mine.left_at IS NULL
         JOIN acc.p_conversation_participants other_user
           ON other_user.conversation_id = c.id AND other_user.user_id <> $1 AND other_user.left_at IS NULL
         JOIN acc.m_profiles pr ON pr.user_id = other_user.user_id
         LEFT JOIN acc.presence presence ON presence.user_id = other_user.user_id
         WHERE c.id = $2 AND c.status = 'active'`,
        [id, request.params.id],
      );
      const row = result.rows[0];
      if (!row) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: "Couldn't load this conversation" } });
        return;
      }
      response.json({
        conversation: {
          id: row.id,
          personId: row.person_id,
          name: String(row.display_name).trim(),
          online: Boolean(row.online),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/messages', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      if (!(await isMember(pool, request.params.id, id))) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: "Couldn't load this conversation" } });
        return;
      }
      const cursor = typeof request.query.cursor === 'string' ? request.query.cursor : null;
      const result = await pool.query(
        `SELECT id, sender_id, content, created_at
         FROM acc.messages
         WHERE conversation_id = $1 AND deleted_at IS NULL AND message_type = 'text'
           AND ($2::timestamptz IS NULL OR created_at < $2::timestamptz)
         ORDER BY created_at DESC
         LIMIT $3`,
        [request.params.id, cursor, pageSize + 1],
      );
      const rows = result.rows.slice(0, pageSize).reverse();
      response.json({
        messages: rows.map((row) => ({
          id: row.id,
          senderId: row.sender_id,
          body: row.content,
          createdAt: row.created_at,
          mine: row.sender_id === id,
        })),
        nextCursor: result.rows.length > pageSize ? result.rows[pageSize - 1]?.created_at?.toISOString?.() ?? null : null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/messages', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      if (!(await isMember(pool, request.params.id, id))) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: "Couldn't load this conversation" } });
        return;
      }
      const body = typeof request.body?.body === 'string' ? request.body.body.trim() : '';
      if (!body || body.length > 2000) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Write a message first.' } });
        return;
      }
      const inserted = await pool.query(
        `INSERT INTO acc.messages (conversation_id, sender_id, message_type, content, billing_status)
         VALUES ($1, $2, 'text', $3, 'not_billable')
         RETURNING id, sender_id, content, created_at`,
        [request.params.id, id, body],
      );
      const row = inserted.rows[0];
      response.status(201).json({
        message: { id: row.id, senderId: row.sender_id, body: row.content, createdAt: row.created_at, mine: true },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/read', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      if (!(await isMember(pool, request.params.id, id))) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: "Couldn't load this conversation" } });
        return;
      }
      await pool.query(
        `INSERT INTO acc.conversation_reads (user_id, conversation_id, last_read_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, conversation_id) DO UPDATE SET last_read_at = NOW()`,
        [id, request.params.id],
      );
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function isMember(pool: Pool, conversationId: string, userId: string) {
  const result = await pool.query(
    `SELECT 1 FROM acc.p_conversation_participants
     WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
    [conversationId, userId],
  );
  return Boolean(result.rows[0]);
}

function mapConversation(row: {
  id: string;
  person_id: string;
  display_name: string;
  content: string | null;
  created_at: Date | null;
  unread_count: number;
  online: boolean;
}) {
  return {
    id: row.id,
    personId: row.person_id,
    name: String(row.display_name).trim(),
    preview: row.content,
    updatedAt: row.created_at,
    unreadCount: Number(row.unread_count),
    online: Boolean(row.online),
  };
}
