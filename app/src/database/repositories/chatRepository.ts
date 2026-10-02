import { openDatabase, type SqlBind } from '@/database/db';
import type { ConversationStatus, ConversationSummary } from '@/features/chat/chat.service';

export type StoredConversation = ConversationSummary & {
  canMessage?: boolean;
  canRespond?: boolean;
};

type ConversationRow = {
  id: string;
  person_id: string;
  name: string;
  preview: string | null;
  updated_at: string | null;
  unread_count: number;
  online: number;
  status: ConversationStatus;
  incoming: number;
  blocked: number;
  can_message: number | null;
  can_respond: number | null;
};

const conversations = new Map<string, StoredConversation>();
const UNREAD_KEY = 'chat_unread';
const CURSOR_KEY = 'chat_cursor';

function key(ownerUserId: string, conversationId: string): string {
  return `${ownerUserId}:${conversationId}`;
}

export function clearChatMemory(): void {
  conversations.clear();
}

function bit(value: boolean | undefined): number | null {
  if (value === undefined) return null;
  return value ? 1 : 0;
}

function fromRow(row: ConversationRow): StoredConversation {
  return {
    id: row.id,
    personId: row.person_id,
    name: row.name,
    preview: row.preview,
    updatedAt: row.updated_at,
    unreadCount: row.unread_count,
    online: row.online === 1,
    status: row.status,
    incoming: row.incoming === 1,
    blocked: row.blocked === 1,
    ...(row.can_message === null ? {} : { canMessage: row.can_message === 1 }),
    ...(row.can_respond === null ? {} : { canRespond: row.can_respond === 1 }),
  };
}

async function readMeta(ownerUserId: string, metaKey: string): Promise<string | null> {
  const db = await openDatabase();
  const row = await db.first<{ value: string | null }>(
    'SELECT value FROM cache_meta WHERE owner_user_id = ? AND key = ?',
    [ownerUserId, metaKey],
  );
  return row?.value ?? null;
}

async function writeMeta(ownerUserId: string, metaKey: string, value: string | null): Promise<void> {
  const db = await openDatabase();
  await db.run(
    `INSERT INTO cache_meta (owner_user_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(owner_user_id, key) DO UPDATE SET value = excluded.value`,
    [ownerUserId, metaKey, value],
  );
}

async function upsert(ownerUserId: string, conversation: StoredConversation): Promise<void> {
  conversations.set(key(ownerUserId, conversation.id), conversation);
  const db = await openDatabase();
  const params: SqlBind[] = [
    ownerUserId,
    conversation.id,
    conversation.personId,
    conversation.name,
    conversation.preview,
    conversation.updatedAt,
    conversation.unreadCount,
    conversation.online ? 1 : 0,
    conversation.status,
    conversation.incoming ? 1 : 0,
    conversation.blocked ? 1 : 0,
    bit(conversation.canMessage),
    bit(conversation.canRespond),
  ];
  await db.run(
    `INSERT INTO conversations (
      owner_user_id, id, person_id, name, preview, updated_at, unread_count, online, status, incoming, blocked, can_message, can_respond
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_user_id, id) DO UPDATE SET
      person_id = excluded.person_id,
      name = excluded.name,
      preview = excluded.preview,
      updated_at = excluded.updated_at,
      unread_count = excluded.unread_count,
      online = excluded.online,
      status = excluded.status,
      incoming = excluded.incoming,
      blocked = excluded.blocked,
      can_message = COALESCE(excluded.can_message, conversations.can_message),
      can_respond = COALESCE(excluded.can_respond, conversations.can_respond)`,
    params,
  );
}

export const chatRepository = {
  peek(ownerUserId: string, conversationId: string): StoredConversation | null {
    return conversations.get(key(ownerUserId, conversationId)) ?? null;
  },

  async list(ownerUserId: string): Promise<{ conversations: ConversationSummary[]; nextCursor: string | null; unread: number }> {
    try {
      const db = await openDatabase();
      const rows = await db.all<ConversationRow>(
        `SELECT id, person_id, name, preview, updated_at, unread_count, online, status, incoming, blocked, can_message, can_respond
         FROM conversations WHERE owner_user_id = ? ORDER BY COALESCE(updated_at, '') DESC`,
        [ownerUserId],
      );
      const unread = await readMeta(ownerUserId, UNREAD_KEY);
      const cursor = await readMeta(ownerUserId, CURSOR_KEY);
      const items = rows.map(fromRow);
      for (const item of items) conversations.set(key(ownerUserId, item.id), item);
      return {
        conversations: items,
        nextCursor: cursor ? cursor : null,
        unread: unread ? Number(unread) : items.reduce((sum, item) => sum + item.unreadCount, 0),
      };
    } catch {
      return { conversations: [], nextCursor: null, unread: 0 };
    }
  },

  async get(ownerUserId: string, conversationId: string): Promise<StoredConversation | null> {
    const remembered = conversations.get(key(ownerUserId, conversationId));
    if (remembered) return remembered;
    try {
      const db = await openDatabase();
      const row = await db.first<ConversationRow>(
        `SELECT id, person_id, name, preview, updated_at, unread_count, online, status, incoming, blocked, can_message, can_respond
         FROM conversations WHERE owner_user_id = ? AND id = ?`,
        [ownerUserId, conversationId],
      );
      if (!row) return null;
      const conversation = fromRow(row);
      conversations.set(key(ownerUserId, conversation.id), conversation);
      return conversation;
    } catch {
      return null;
    }
  },

  async unread(ownerUserId: string): Promise<number | null> {
    try {
      const value = await readMeta(ownerUserId, UNREAD_KEY);
      return value === null ? null : Number(value);
    } catch {
      return null;
    }
  },

  async updatePresence(ownerUserId: string, personId: string, online: boolean): Promise<void> {
    try {
      const db = await openDatabase();
      await db.run(
        'UPDATE conversations SET online = ? WHERE owner_user_id = ? AND person_id = ?',
        [online ? 1 : 0, ownerUserId, personId],
      );
      for (const [convKey, conv] of conversations.entries()) {
        if (convKey.startsWith(`${ownerUserId}:`) && conv.personId === personId) {
          conversations.set(convKey, { ...conv, online });
        }
      }
    } catch {
      // ignore
    }
  },

  async saveOne(ownerUserId: string, conversation: StoredConversation): Promise<void> {
    await upsert(ownerUserId, conversation);
  },

  async savePage(
    ownerUserId: string,
    items: StoredConversation[],
    unread: number | null,
    nextCursor: string | null,
    mode: 'replace' | 'append' | 'merge',
  ): Promise<void> {
    const db = await openDatabase();
    if (mode === 'replace') {
      if (items.length === 0) {
        await db.run('DELETE FROM conversations WHERE owner_user_id = ?', [ownerUserId]);
        for (const remembered of conversations.keys()) {
          if (remembered.startsWith(`${ownerUserId}:`)) conversations.delete(remembered);
        }
      } else {
        const placeholders = items.map(() => '?').join(', ');
        await db.run(
          `DELETE FROM conversations WHERE owner_user_id = ? AND id NOT IN (${placeholders})`,
          [ownerUserId, ...items.map((item) => item.id)],
        );
      }
    }
    for (const item of items) await upsert(ownerUserId, item);
    if (unread !== null) await writeMeta(ownerUserId, UNREAD_KEY, String(unread));
    if (mode !== 'merge') await writeMeta(ownerUserId, CURSOR_KEY, nextCursor);
  },
};
