import { openDatabase, type SqlBind } from '@/database/db';
import type { ChatMessage } from '@/features/chat/chat.service';

export const MESSAGE_PAGE_SIZE = 50;

type MessageStatus = 'pending' | 'sent';
type MessageRow = {
  id: string;
  client_message_id: string | null;
  sender_id: string;
  body: string;
  created_at: string;
  mine: number;
};

const threads = new Map<string, ChatMessage[]>();

function threadKey(ownerUserId: string, conversationId: string): string {
  return `${ownerUserId}:${conversationId}`;
}

export function clearMessageMemory(): void {
  threads.clear();
}

function fromRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    mine: row.mine === 1,
    clientMessageId: row.client_message_id,
  };
}

function remember(ownerUserId: string, conversationId: string, messages: ChatMessage[]): void {
  const sorted = [...messages].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
  threads.set(threadKey(ownerUserId, conversationId), sorted.slice(-MESSAGE_PAGE_SIZE));
}

async function writeMessage(
  ownerUserId: string,
  conversationId: string,
  message: ChatMessage,
  status: MessageStatus,
): Promise<void> {
  const db = await openDatabase();
  const clientId = message.clientMessageId ?? null;
  if (clientId) {
    await db.run(
      `DELETE FROM messages
       WHERE owner_user_id = ? AND conversation_id = ? AND (client_message_id = ? OR id = ?) AND id <> ?`,
      [ownerUserId, conversationId, clientId, clientId, message.id],
    );
  }
  const params: SqlBind[] = [
    ownerUserId,
    message.id,
    clientId,
    conversationId,
    message.senderId,
    message.body,
    message.createdAt,
    message.mine ? 1 : 0,
    status,
  ];
  await db.run(
    `INSERT INTO messages (
      owner_user_id, id, client_message_id, conversation_id, sender_id, body, created_at, mine, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_user_id, id) DO UPDATE SET
      client_message_id = excluded.client_message_id,
      sender_id = excluded.sender_id,
      body = excluded.body,
      created_at = excluded.created_at,
      mine = excluded.mine,
      status = excluded.status`,
    params,
  );
}

export const messageRepository = {
  peek(ownerUserId: string, conversationId: string): ChatMessage[] | null {
    return threads.get(threadKey(ownerUserId, conversationId)) ?? null;
  },

  async latest(ownerUserId: string, conversationId: string, limit = MESSAGE_PAGE_SIZE): Promise<ChatMessage[]> {
    try {
      const db = await openDatabase();
      const rows = await db.all<MessageRow>(
        `SELECT id, client_message_id, sender_id, body, created_at, mine
         FROM messages
         WHERE owner_user_id = ? AND conversation_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
        [ownerUserId, conversationId, limit],
      );
      const messages = rows.map(fromRow).reverse();
      remember(ownerUserId, conversationId, messages);
      return messages;
    } catch {
      return [];
    }
  },

  async olderThan(ownerUserId: string, conversationId: string, createdAt: string, limit = MESSAGE_PAGE_SIZE): Promise<ChatMessage[]> {
    try {
      const db = await openDatabase();
      const rows = await db.all<MessageRow>(
        `SELECT id, client_message_id, sender_id, body, created_at, mine
         FROM messages
         WHERE owner_user_id = ? AND conversation_id = ? AND created_at < ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
        [ownerUserId, conversationId, createdAt, limit],
      );
      return rows.map(fromRow).reverse();
    } catch {
      return [];
    }
  },

  async saveMany(ownerUserId: string, conversationId: string, messages: ChatMessage[], status: MessageStatus = 'sent'): Promise<void> {
    for (const message of messages) await writeMessage(ownerUserId, conversationId, message, status);
    const current = threads.get(threadKey(ownerUserId, conversationId));
    if (!current) return;
    const byId = new Map(current.map((message) => [message.id, message]));
    for (const message of messages) {
      if (message.clientMessageId) {
        for (const [id, existing] of byId) {
          if (id !== message.id && (existing.clientMessageId === message.clientMessageId || id === message.clientMessageId)) {
            byId.delete(id);
          }
        }
      }
      byId.set(message.id, message);
    }
    remember(ownerUserId, conversationId, [...byId.values()]);
  },

  async savePending(ownerUserId: string, conversationId: string, message: ChatMessage): Promise<void> {
    await messageRepository.saveMany(ownerUserId, conversationId, [message], 'pending');
  },

  async confirm(ownerUserId: string, conversationId: string, pendingId: string, message: ChatMessage): Promise<void> {
    await messageRepository.remove(ownerUserId, conversationId, pendingId);
    await messageRepository.saveMany(ownerUserId, conversationId, [message], 'sent');
  },

  async remove(ownerUserId: string, conversationId: string, messageId: string): Promise<void> {
    const db = await openDatabase();
    await db.run(
      `DELETE FROM messages
       WHERE owner_user_id = ? AND conversation_id = ? AND (id = ? OR client_message_id = ?)`,
      [ownerUserId, conversationId, messageId, messageId],
    );
    const current = threads.get(threadKey(ownerUserId, conversationId));
    if (current) {
      remember(
        ownerUserId,
        conversationId,
        current.filter((message) => message.id !== messageId && message.clientMessageId !== messageId),
      );
    }
  },
};
