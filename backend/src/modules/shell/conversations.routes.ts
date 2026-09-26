import { randomUUID } from 'node:crypto';

import { Router } from 'express';
import type { Pool } from 'pg';

import { broadcastNewMessage, broadcastRead, saveTextMessage } from '../../infrastructure/realtime/chat-socket.js';
import { AuthError } from '../auth/auth.errors.js';
import type { AuthService } from '../auth/auth.service.js';
import { canCreateChatRequest, canRespondToRequest, canSendMessage, type ConversationStatus } from './conversation-rules.js';

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
        `SELECT c.id, c.status, c.created_by, other_user.user_id AS person_id, pr.display_name,
                last_message.content, COALESCE(last_message.created_at, c.created_at) AS created_at,
                COALESCE(unread.count, 0) AS unread_count,
                (presence.last_seen_at > NOW() - INTERVAL '45 seconds') AS online,
                EXISTS (
                  SELECT 1 FROM acc.blocks b
                  WHERE b.user_id = $1 AND b.blocked_user_id = other_user.user_id
                ) AS blocked_by_viewer
         FROM acc.p_conversation_participants mine
         JOIN acc.conversations c ON c.id = mine.conversation_id AND c.status IN ('pending', 'active')
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
           AND ($2::timestamptz IS NULL OR COALESCE(last_message.created_at, c.created_at) < $2::timestamptz)
         ORDER BY COALESCE(last_message.created_at, c.created_at) DESC
         LIMIT $3`,
        [id, cursor, pageSize + 1],
      );
      const rows = result.rows.slice(0, pageSize);
      const unread = await pool.query(
        `SELECT COUNT(*)::int AS unread
         FROM acc.messages m
         JOIN acc.conversations c ON c.id = m.conversation_id AND c.status = 'active'
         JOIN acc.p_conversation_participants mine
           ON mine.conversation_id = m.conversation_id AND mine.user_id = $1 AND mine.left_at IS NULL
         LEFT JOIN acc.conversation_reads reads
           ON reads.conversation_id = m.conversation_id AND reads.user_id = $1
         WHERE m.deleted_at IS NULL AND m.sender_id <> $1
           AND m.created_at > COALESCE(reads.last_read_at, 'epoch')`,
        [id],
      );
      response.json({
        conversations: rows.map((row) => mapConversation(row, id)),
        nextCursor: result.rows.length > pageSize ? rows.at(-1)?.created_at?.toISOString?.() ?? rows.at(-1)?.updated_at ?? null : null,
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
      const message = typeof request.body?.message === 'string' ? request.body.message.trim() : '';
      const decision = canCreateChatRequest({
        sameUser: !personId || personId === id,
        blocked: false,
        existingStatus: null,
      });
      if (!decision.allow) {
        response.status(decision.status).json({ error: { code: 'VALIDATION_ERROR', message: decision.message } });
        return;
      }
      if (!message || message.length > 500) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Write one message to send your request.' } });
        return;
      }
      const blocked = await isBlocked(pool, id, personId);
      const existing = await pool.query(
        `SELECT c.id, c.status
         FROM acc.conversations c
         JOIN acc.p_conversation_participants a ON a.conversation_id = c.id AND a.user_id = $1 AND a.left_at IS NULL
         JOIN acc.p_conversation_participants b ON b.conversation_id = c.id AND b.user_id = $2 AND b.left_at IS NULL
         WHERE c.conversation_type = 'direct' AND c.status IN ('pending', 'active')
         LIMIT 1`,
        [id, personId],
      );
      const gate = canCreateChatRequest({
        sameUser: false,
        blocked,
        existingStatus: (existing.rows[0]?.status as ConversationStatus | undefined) ?? null,
      });
      if (!gate.allow) {
        if (existing.rows[0] && gate.status === 409) {
          response.json({ conversationId: existing.rows[0].id, status: existing.rows[0].status });
          return;
        }
        response.status(gate.status).json({ error: { code: 'FORBIDDEN', message: gate.message } });
        return;
      }
      const person = await pool.query(
        `SELECT 1 FROM acc.m_profiles WHERE user_id = $1 AND deleted_at IS NULL AND profile_status = 'active'`,
        [personId],
      );
      if (!person.rows[0]) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: 'This person is not available.' } });
        return;
      }
      const conversationId = randomUUID();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO acc.conversations (id, created_by, status, conversation_type)
           VALUES ($1, $2, 'pending', 'direct')`,
          [conversationId, id],
        );
        await client.query(
          `INSERT INTO acc.p_conversation_participants (conversation_id, user_id, role)
           VALUES ($1, $2, 'owner'), ($1, $3, 'member')`,
          [conversationId, id, personId],
        );
        await client.query(
          `INSERT INTO acc.messages (conversation_id, sender_id, message_type, content, billing_status)
           VALUES ($1, $2, 'text', $3, 'not_billable')`,
          [conversationId, id, message],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      response.status(201).json({ conversationId, status: 'pending' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/accept', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const outcome = await respond(pool, request.params.id, id, 'active');
      response.status(outcome.status).json(outcome.body);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/reject', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const outcome = await respond(pool, request.params.id, id, 'rejected');
      response.status(outcome.status).json(outcome.body);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (request, response, next) => {
    try {
      const id = await userId(request.header('authorization'));
      const result = await pool.query(
        `SELECT c.id, c.status, c.created_by, other_user.user_id AS person_id, pr.display_name,
                (presence.last_seen_at > NOW() - INTERVAL '45 seconds') AS online
         FROM acc.conversations c
         JOIN acc.p_conversation_participants mine
           ON mine.conversation_id = c.id AND mine.user_id = $1 AND mine.left_at IS NULL
         JOIN acc.p_conversation_participants other_user
           ON other_user.conversation_id = c.id AND other_user.user_id <> $1 AND other_user.left_at IS NULL
         JOIN acc.m_profiles pr ON pr.user_id = other_user.user_id
         LEFT JOIN acc.presence presence ON presence.user_id = other_user.user_id
         WHERE c.id = $2 AND c.status IN ('pending', 'active', 'rejected')`,
        [id, request.params.id],
      );
      const row = result.rows[0];
      if (!row) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: "Couldn't load this conversation" } });
        return;
      }
      const blocked = await isBlocked(pool, id, row.person_id);
      response.json({
        conversation: {
          ...mapConversation(row, id),
          canMessage: !blocked && row.status === 'active',
          canRespond: !blocked && row.status === 'pending' && row.created_by !== id,
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
      const conversation = await loadConversation(pool, request.params.id, id);
      const blocked = conversation ? await isBlocked(pool, id, conversation.personId) : false;
      const decision = canSendMessage({
        member: Boolean(conversation),
        blocked,
        status: conversation?.status ?? null,
      });
      if (!decision.allow) {
        response.status(decision.status).json({ error: { code: 'FORBIDDEN', message: decision.message } });
        return;
      }
      const body = typeof request.body?.body === 'string' ? request.body.body.trim() : '';
      if (!body || body.length > 2000) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Write a message first.' } });
        return;
      }
      const clientMessageId = typeof request.body?.clientMessageId === 'string' ? request.body.clientMessageId.slice(0, 80) : null;
      const saved = await saveTextMessage(pool, { conversationId: request.params.id, senderId: id, content: body, clientMessageId });
      if (conversation) broadcastNewMessage(conversation.personId, request.params.id, saved);
      response.status(201).json({
        message: { id: saved.messageId, senderId: saved.senderId, body: saved.content, createdAt: saved.createdAt, mine: true, clientMessageId: saved.clientMessageId },
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
      const conversation = await loadConversation(pool, request.params.id, id);
      if (conversation) broadcastRead(conversation.personId, request.params.id);
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function respond(pool: Pool, conversationId: string, userId: string, nextStatus: 'active' | 'rejected') {
  const conversation = await loadConversation(pool, conversationId, userId);
  const blocked = conversation ? await isBlocked(pool, userId, conversation.personId) : false;
  const decision = canRespondToRequest({
    member: Boolean(conversation),
    isRecipient: Boolean(conversation && conversation.createdBy !== userId),
    blocked,
    status: conversation?.status ?? null,
  });
  if (!decision.allow) {
    return { status: decision.status, body: { error: { code: 'FORBIDDEN', message: decision.message } } };
  }
  await pool.query(
    `UPDATE acc.conversations
     SET status = $2, started_at = CASE WHEN $2 = 'active' THEN NOW() ELSE started_at END
     WHERE id = $1 AND status = 'pending'`,
    [conversationId, nextStatus],
  );
  return { status: 200, body: { conversationId, status: nextStatus === 'active' ? 'accepted' : 'rejected' } };
}

async function loadConversation(pool: Pool, conversationId: string, userId: string) {
  const result = await pool.query(
    `SELECT c.status, c.created_by, other_user.user_id AS person_id
     FROM acc.conversations c
     JOIN acc.p_conversation_participants mine
       ON mine.conversation_id = c.id AND mine.user_id = $2 AND mine.left_at IS NULL
     JOIN acc.p_conversation_participants other_user
       ON other_user.conversation_id = c.id AND other_user.user_id <> $2 AND other_user.left_at IS NULL
     WHERE c.id = $1`,
    [conversationId, userId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    status: row.status as ConversationStatus,
    createdBy: String(row.created_by),
    personId: String(row.person_id),
  };
}

async function isMember(pool: Pool, conversationId: string, userId: string) {
  const result = await pool.query(
    `SELECT 1 FROM acc.p_conversation_participants
     WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
    [conversationId, userId],
  );
  return Boolean(result.rows[0]);
}

async function isBlocked(pool: Pool, leftUserId: string, rightUserId: string) {
  const result = await pool.query(
    `SELECT 1 FROM acc.blocks
     WHERE (user_id = $1 AND blocked_user_id = $2) OR (user_id = $2 AND blocked_user_id = $1)
     LIMIT 1`,
    [leftUserId, rightUserId],
  );
  return Boolean(result.rows[0]);
}

function mapConversation(row: {
  id: string;
  status: string;
  created_by: string;
  person_id: string;
  display_name: string;
  content?: string | null;
  created_at?: Date | null;
  unread_count?: number;
  online: boolean;
  blocked_by_viewer?: boolean;
}, viewerId: string) {
  const status = row.status === 'active' ? 'accepted' : row.status;
  return {
    id: row.id,
    personId: row.person_id,
    name: String(row.display_name).trim(),
    preview: row.content ?? null,
    updatedAt: row.created_at ?? null,
    unreadCount: Number(row.unread_count ?? 0),
    online: Boolean(row.online) && !row.blocked_by_viewer,
    blocked: Boolean(row.blocked_by_viewer),
    status,
    incoming: row.created_by !== viewerId && row.status === 'pending',
  };
}
