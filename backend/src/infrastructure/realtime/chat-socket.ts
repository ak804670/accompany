import type { Server as HttpServer } from 'node:http';
import type { Pool } from 'pg';
import { Server, type Socket } from 'socket.io';

import type { RateLimiter } from '../redis/rate-limit.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import { canSendMessage, type ConversationStatus } from '../../modules/shell/conversation-rules.js';
import { logger } from '../../utils/logger.js';
import type { PushMessage } from '../../modules/calls/notification-types.js';
import { ChatEvents, failureForDecision, nextPresence, validateMessageContent, type LiveMessage, type SocketFailure } from './chat-events.js';

type ConversationRow = {
  status: ConversationStatus;
  personId: string;
};

type ChatSocketDeps = {
  auth: AuthService;
  pool: Pool;
  limiter: RateLimiter;
  notify?: (message: PushMessage) => Promise<void>;
};

const socketsByUser = new Map<string, Set<string>>();
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

let io: Server | null = null;

function userRoom(userId: string): string {
  return `user:${userId}`;
}

function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

function track(userId: string, socketId: string): 'ONLINE' | 'OFFLINE' | null {
  const current = socketsByUser.get(userId) ?? new Set<string>();
  const wasEmpty = current.size === 0;
  current.add(socketId);
  socketsByUser.set(userId, current);
  return wasEmpty ? 'ONLINE' : null;
}

function untrack(userId: string, socketId: string): 'OFFLINE' | null {
  const current = socketsByUser.get(userId);
  current?.delete(socketId);
  if (!current || current.size === 0) {
    socketsByUser.delete(userId);
    return nextPresence(0) === 'OFFLINE' ? 'OFFLINE' : null;
  }
  return null;
}

export function isUserOnline(userId: string): boolean {
  return (socketsByUser.get(userId)?.size ?? 0) > 0;
}

export function publishToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

async function loadConversation(pool: Pool, conversationId: string, userId: string): Promise<ConversationRow | null> {
  const result = await pool.query(
    `SELECT c.status, other_user.user_id AS person_id
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
  return { status: row.status as ConversationStatus, personId: String(row.person_id) };
}

async function blocked(pool: Pool, left: string, right: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM acc.blocks
     WHERE (user_id = $1 AND blocked_user_id = $2) OR (user_id = $2 AND blocked_user_id = $1)
     LIMIT 1`,
    [left, right],
  );
  return Boolean(result.rows[0]);
}

export async function saveTextMessage(pool: Pool, input: {
  conversationId: string;
  senderId: string;
  content: string;
  clientMessageId: string | null;
}): Promise<LiveMessage> {
  if (input.clientMessageId) {
    const existing = await pool.query(
      `SELECT id, client_message_id, conversation_id, sender_id, content, created_at
       FROM acc.messages
       WHERE conversation_id = $1 AND sender_id = $2 AND client_message_id = $3 AND deleted_at IS NULL`,
      [input.conversationId, input.senderId, input.clientMessageId],
    );
    if (existing.rows[0]) return toLive(existing.rows[0]);
  }
  const inserted = input.clientMessageId
    ? await pool.query(
      `INSERT INTO acc.messages (conversation_id, sender_id, message_type, content, billing_status, client_message_id)
       VALUES ($1, $2, 'text', $3, 'not_billable', $4)
       ON CONFLICT (conversation_id, sender_id, client_message_id) WHERE client_message_id IS NOT NULL DO NOTHING
       RETURNING id, client_message_id, conversation_id, sender_id, content, created_at`,
      [input.conversationId, input.senderId, input.content, input.clientMessageId],
    )
    : await pool.query(
      `INSERT INTO acc.messages (conversation_id, sender_id, message_type, content, billing_status)
       VALUES ($1, $2, 'text', $3, 'not_billable')
       RETURNING id, client_message_id, conversation_id, sender_id, content, created_at`,
      [input.conversationId, input.senderId, input.content],
    );
  if (inserted.rows[0]) return toLive(inserted.rows[0]);
  const again = await pool.query(
    `SELECT id, client_message_id, conversation_id, sender_id, content, created_at
     FROM acc.messages
     WHERE conversation_id = $1 AND sender_id = $2 AND client_message_id = $3`,
    [input.conversationId, input.senderId, input.clientMessageId],
  );
  return toLive(again.rows[0]);
}

function toLive(row: { id: string; client_message_id: string | null; conversation_id: string; sender_id: string; content: string; created_at: Date | string }): LiveMessage {
  return {
    messageId: row.id,
    clientMessageId: row.client_message_id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    messageType: 'text',
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function markDelivered(pool: Pool, messageId: string): Promise<string> {
  const result = await pool.query<{ delivered_at: Date }>(
    `UPDATE acc.messages SET delivered_at = COALESCE(delivered_at, NOW()) WHERE id = $1 RETURNING delivered_at`,
    [messageId],
  );
  return new Date(result.rows[0]?.delivered_at ?? new Date()).toISOString();
}

async function touchLastSeen(pool: Pool, userId: string): Promise<void> {
  await pool.query(
    `UPDATE acc.presence SET last_seen_at = NOW()
     WHERE user_id = $1 AND last_seen_at < NOW() - INTERVAL '30 seconds'`,
    [userId],
  );
}

function ackError(ack: unknown, error: SocketFailure): void {
  if (typeof ack === 'function') ack({ ok: false, error });
}

export function attachChatSocket(server: HttpServer, deps: ChatSocketDeps): Server {
  io = new Server(server, {
    path: '/socket.io',
    cors: { origin: true, credentials: true },
  });
  // Single process for now. Before running more than one API node, install
  // @socket.io/redis-adapter and call io.adapter(createAdapter(pub, sub)).
  logger.info('socket.io listening', { path: '/socket.io', nodes: 1 });

  io.use(async (socket, next) => {
    try {
      const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
      const session = await deps.auth.session(token);
      socket.data.userId = session.user.id;
      next();
    } catch {
      logger.info('socket authentication failed', { socketId: socket.id });
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.data.userId);
    socket.join(userRoom(userId));
    const became = track(userId, socket.id);
    logger.info('socket connected', { socketId: socket.id, userId });
    if (became) io?.emit(ChatEvents.presenceUpdate, { userId, status: became });

    socket.on('disconnect', () => {
      const offline = untrack(userId, socket.id);
      logger.info('socket disconnected', { socketId: socket.id, userId });
      if (offline) {
        io?.emit(ChatEvents.presenceUpdate, { userId, status: offline });
        void touchLastSeen(deps.pool, userId).catch(() => undefined);
      }
    });

    socket.on(ChatEvents.conversationJoin, async (payload: { conversationId?: string }, ack?: (body: unknown) => void) => {
      const conversationId = payload?.conversationId ?? '';
      const limit = await deps.limiter.consume(`socket:join:${userId}`, 20, 10);
      if (!limit.allowed) {
        ackError(ack, { code: 'RATE_LIMITED', message: 'Slow down a moment.' });
        return;
      }
      const conversation = await loadConversation(deps.pool, conversationId, userId);
      if (!conversation) {
        ackError(ack, { code: 'CONVERSATION_ACCESS_DENIED', message: 'You cannot access this conversation.' });
        logger.info('socket room denied', { socketId: socket.id, userId, conversationId });
        return;
      }
      await socket.join(conversationRoom(conversationId));
      logger.info('socket room joined', { socketId: socket.id, userId, conversationId });
      socket.emit(ChatEvents.conversationJoined, { conversationId });
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on(ChatEvents.conversationLeave, async (payload: { conversationId?: string }) => {
      const conversationId = payload?.conversationId ?? '';
      await socket.leave(conversationRoom(conversationId));
      socket.emit(ChatEvents.conversationLeft, { conversationId });
      logger.info('socket room left', { socketId: socket.id, userId, conversationId });
    });

    socket.on(ChatEvents.messageSend, async (payload: { conversationId?: string; clientMessageId?: string; content?: string }, ack?: (body: unknown) => void) => {
      try {
        const conversationId = payload?.conversationId ?? '';
        const limit = await deps.limiter.consume(`socket:message:${userId}`, 30, 10);
        if (!limit.allowed) {
          ackError(ack, { code: 'RATE_LIMITED', message: 'Slow down a moment.' });
          return;
        }
        const content = validateMessageContent(payload?.content);
        if (typeof content !== 'string') {
          ackError(ack, content);
          return;
        }
        const conversation = await loadConversation(deps.pool, conversationId, userId);
        const isBlocked = conversation ? await blocked(deps.pool, userId, conversation.personId) : false;
        const decision = canSendMessage({ member: Boolean(conversation), blocked: isBlocked, status: conversation?.status ?? null });
        if (!decision.allow || !conversation) {
          const error = failureForDecision(decision.allow ? 404 : decision.status, decision.allow ? "Couldn't load this conversation" : decision.message);
          ackError(ack, error);
          socket.emit(ChatEvents.messageFailed, { clientMessageId: payload?.clientMessageId ?? null, conversationId, error });
          logger.info('socket message rejected', { socketId: socket.id, userId, conversationId, code: error.code });
          return;
        }
        const clientMessageId = typeof payload?.clientMessageId === 'string' ? payload.clientMessageId.slice(0, 80) : null;
        const message = await saveTextMessage(deps.pool, { conversationId, senderId: userId, content, clientMessageId });
        io?.to(conversationRoom(conversationId)).except(socket.id).emit(ChatEvents.messageNew, message);
        io?.to(userRoom(conversation.personId)).emit(ChatEvents.messageNew, message);
        io?.to(userRoom(conversation.personId)).emit(ChatEvents.conversationUpdate, { conversationId });
        if (isUserOnline(conversation.personId)) {
          const deliveredAt = await markDelivered(deps.pool, message.messageId);
          io?.to(userRoom(userId)).emit(ChatEvents.messageDelivered, { messageId: message.messageId, conversationId, userId: conversation.personId, deliveredAt });
        } else if (deps.notify) {
          await deps.notify({
            userId: conversation.personId,
            type: 'MESSAGE_RECEIVED',
            title: 'New message',
            body: 'You have a new message.',
            data: { conversationId, messageId: message.messageId },
          });
        }
        logger.info('socket message sent', { socketId: socket.id, userId, conversationId, messageId: message.messageId });
        if (typeof ack === 'function') ack({ ok: true, message });
      } catch (error) {
        logger.error('socket message failed', { socketId: socket.id, userId, message: error instanceof Error ? error.message : 'failed' });
        ackError(ack, { code: 'MESSAGE_SEND_FAILED', message: "Couldn't send the message." });
      }
    });

    socket.on(ChatEvents.messageRead, async (payload: { conversationId?: string; messageIds?: string[] }) => {
      const conversationId = payload?.conversationId ?? '';
      const conversation = await loadConversation(deps.pool, conversationId, userId);
      if (!conversation || await blocked(deps.pool, userId, conversation.personId)) return;
      await deps.pool.query(
        `INSERT INTO acc.conversation_reads (user_id, conversation_id, last_read_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, conversation_id) DO UPDATE SET last_read_at = NOW()`,
        [userId, conversationId],
      );
      const readAt = new Date().toISOString();
      io?.to(userRoom(conversation.personId)).emit(ChatEvents.messageRead, {
        conversationId,
        messageIds: Array.isArray(payload?.messageIds) ? payload.messageIds.slice(0, 100) : [],
        readAt,
      });
    });

    socket.on(ChatEvents.typingStart, async (payload: { conversationId?: string }) => {
      const conversationId = payload?.conversationId ?? '';
      const limit = await deps.limiter.consume(`socket:typing:${userId}:${conversationId}`, 1, 2);
      if (!limit.allowed) return;
      const conversation = await loadConversation(deps.pool, conversationId, userId);
      if (!conversation || await blocked(deps.pool, userId, conversation.personId) || conversation.status !== 'active') return;
      socket.to(conversationRoom(conversationId)).emit(ChatEvents.typingStart, { conversationId, userId });
      const key = `${socket.id}:${conversationId}`;
      const existing = typingTimers.get(key);
      if (existing) clearTimeout(existing);
      typingTimers.set(key, setTimeout(() => {
        socket.to(conversationRoom(conversationId)).emit(ChatEvents.typingStop, { conversationId, userId });
        typingTimers.delete(key);
      }, 4000));
    });

    socket.on(ChatEvents.typingStop, async (payload: { conversationId?: string }) => {
      const conversationId = payload?.conversationId ?? '';
      const key = `${socket.id}:${conversationId}`;
      const existing = typingTimers.get(key);
      if (existing) clearTimeout(existing);
      typingTimers.delete(key);
      socket.to(conversationRoom(conversationId)).emit(ChatEvents.typingStop, { conversationId, userId });
    });
  });

  return io;
}

export function broadcastRead(receiverId: string, conversationId: string): void {
  io?.to(userRoom(receiverId)).emit(ChatEvents.messageRead, { conversationId, messageIds: [], readAt: new Date().toISOString() });
}

export function broadcastNewMessage(receiverId: string, conversationId: string, message: LiveMessage): void {
  io?.to(userRoom(receiverId)).emit(ChatEvents.messageNew, message);
  io?.to(conversationRoom(conversationId)).emit(ChatEvents.messageNew, message);
  io?.to(userRoom(receiverId)).emit(ChatEvents.conversationUpdate, { conversationId });
}

export type { Socket };
