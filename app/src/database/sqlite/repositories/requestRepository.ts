import { getDatabase } from '@/database/sqlite/database';
import { getViewerId } from '@/database/sqlite/memory';
import type { ConversationStatus } from '@/features/chat/chat.service';

function now(): string {
  return new Date().toISOString();
}

export type StoredRequest = {
  id: string;
  senderId: string | null;
  receiverId: string | null;
  initialMessage: string | null;
  status: ConversationStatus | 'cancelled';
  createdAt: string | null;
  updatedAt: string;
};

export const requestRepository = {
  async get(id: string): Promise<StoredRequest | null> {
    const db = await getDatabase();
    const row = await db.first<{
      id: string;
      sender_id: string | null;
      receiver_id: string | null;
      initial_message: string | null;
      status: StoredRequest['status'];
      created_at: string | null;
      updated_at: string;
    }>('SELECT * FROM chat_requests WHERE id = ?', [id]);
    if (!row) return null;
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      initialMessage: row.initial_message,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async upsert(request: StoredRequest): Promise<void> {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO chat_requests (id, sender_id, receiver_id, initial_message, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         sender_id = excluded.sender_id,
         receiver_id = excluded.receiver_id,
         initial_message = excluded.initial_message,
         status = excluded.status,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      [request.id, request.senderId, request.receiverId, request.initialMessage, request.status, request.createdAt, request.updatedAt || now()],
    );
  },

  async updateStatus(id: string, status: StoredRequest['status']): Promise<void> {
    const db = await getDatabase();
    await db.run('UPDATE chat_requests SET status = ?, updated_at = ? WHERE id = ?', [status, now(), id]);
  },
};

export function requestFromConversation(item: {
  id: string;
  personId: string;
  incoming: boolean;
  preview: string | null;
  status: ConversationStatus;
  updatedAt: string | null;
}): StoredRequest {
  const viewer = getViewerId();
  return {
    id: item.id,
    senderId: item.incoming ? item.personId : viewer,
    receiverId: item.incoming ? viewer : item.personId,
    initialMessage: item.preview,
    status: item.status,
    createdAt: item.updatedAt,
    updatedAt: item.updatedAt ?? now(),
  };
}
