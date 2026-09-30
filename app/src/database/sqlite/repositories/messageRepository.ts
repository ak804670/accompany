import { getDatabase } from '@/database/sqlite/database';
import { emitLocal, peekConversation, rememberMessages } from '@/database/sqlite/memory';
import type { ChatMessage } from '@/features/chat/chat.service';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type StoredMessage = ChatMessage & {
  conversationId: string;
  status: MessageStatus;
  receiverId?: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  status: MessageStatus;
  client_message_id: string | null;
  mine: number;
  created_at: string;
};

function now(): string {
  return new Date().toISOString();
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.content,
    createdAt: row.created_at,
    mine: row.mine === 1,
    clientMessageId: row.client_message_id,
  };
}

export const messageRepository = {
  async list(conversationId: string): Promise<ChatMessage[]> {
    const db = await getDatabase();
    const rows = await db.all<MessageRow>(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC',
      [conversationId],
    );
    const messages = rows.map(mapMessage);
    rememberMessages(conversationId, messages);
    return messages;
  },

  async insert(message: StoredMessage, notify = true): Promise<void> {
    const db = await getDatabase();
    const stamped = now();
    if (message.clientMessageId) {
      await db.run(
        'DELETE FROM messages WHERE conversation_id = ? AND id != ? AND (id = ? OR client_message_id = ?)',
        [message.conversationId, message.id, message.clientMessageId, message.clientMessageId],
      );
    }
    await db.run(
      `INSERT INTO messages (
         id, conversation_id, sender_id, receiver_id, message_type, content, status, client_message_id, mine, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'text', ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         content = excluded.content,
         status = excluded.status,
         client_message_id = excluded.client_message_id,
         sender_id = excluded.sender_id,
         mine = excluded.mine,
         updated_at = excluded.updated_at`,
      [
        message.id,
        message.conversationId,
        message.senderId,
        message.receiverId ?? null,
        message.body,
        message.status,
        message.clientMessageId ?? null,
        message.mine ? 1 : 0,
        message.createdAt,
        stamped,
      ],
    );
    const bundle = peekConversation(message.conversationId);
    if (bundle) {
      const without = bundle.messages.filter((item) => item.id !== message.id && item.clientMessageId !== message.clientMessageId && item.id !== message.clientMessageId);
      rememberMessages(message.conversationId, [...without, message]);
    }
    if (!notify) return;
    const row = await db.first<{ payload: string }>('SELECT payload FROM conversations WHERE id = ?', [message.conversationId]);
    if (row) {
      const summary = JSON.parse(row.payload) as { updatedAt?: string | null; preview?: string | null };
      const previousAt = summary.updatedAt ?? '';
      if (!previousAt || previousAt <= message.createdAt) {
        const next = { ...summary, preview: message.body, updatedAt: message.createdAt };
        await db.run(
          `UPDATE conversations
           SET last_message_text = ?, last_message_type = 'text', last_message_at = ?, payload = ?, updated_at = ?
           WHERE id = ?`,
          [message.body, message.createdAt, JSON.stringify(next), message.createdAt, message.conversationId],
        );
      }
    }
    emitLocal(`messages:${message.conversationId}`);
    emitLocal('conversations');
  },

  async upsertMany(conversationId: string, messages: ChatMessage[]): Promise<void> {
    for (const message of messages) {
      await this.insert({ ...message, conversationId, status: 'sent' }, false);
    }
    if (messages.length === 0) return;
    emitLocal(`messages:${conversationId}`);
  },

  async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM messages WHERE id = ? OR client_message_id = ?', [id, id]);
  },

  async markStatus(ids: string[], status: MessageStatus): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(', ');
    await db.run(`UPDATE messages SET status = ?, updated_at = ? WHERE id IN (${placeholders})`, [status, now(), ...ids]);
  },
};
