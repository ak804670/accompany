import { accessFromSummary, keepListCard, mergeConversations } from '@/database/cache-policy';
import { getDatabase } from '@/database/sqlite/database';
import {
  emitLocal,
  forgetConversations,
  peekConversation,
  peekConversationList,
  rememberConversation,
  rememberConversationList,
  type CachedConversation,
} from '@/database/sqlite/memory';
import { callRepository } from '@/database/sqlite/repositories/callRepository';
import { messageRepository } from '@/database/sqlite/repositories/messageRepository';
import { requestFromConversation, requestRepository } from '@/database/sqlite/repositories/requestRepository';
import type { ConversationStatus, ConversationSummary } from '@/features/chat/chat.service';

type ConversationRow = {
  id: string;
  payload: string;
  can_message: number;
  can_respond: number;
};

function flagsFor(item: ConversationSummary, explicit?: { canMessage: boolean; canRespond: boolean }) {
  return explicit ?? accessFromSummary(item);
}

async function storedSummary(id: string): Promise<ConversationSummary | null> {
  const peeked = peekConversation(id)?.summary;
  if (peeked) return peeked;
  const db = await getDatabase();
  const row = await db.first<{ payload: string }>('SELECT payload FROM conversations WHERE id = ?', [id]);
  return row ? JSON.parse(row.payload) as ConversationSummary : null;
}

async function writeConversation(item: ConversationSummary, explicit?: { canMessage: boolean; canRespond: boolean }): Promise<ConversationSummary> {
  const db = await getDatabase();
  const stored = keepListCard(await storedSummary(item.id), item);
  const access = flagsFor(stored, explicit);
  await db.run(
    `INSERT INTO conversations (
       id, other_user_id, name, last_message_id, last_message_text, last_message_type, last_message_at,
       unread_count, status, incoming, online, blocked, can_message, can_respond, payload, updated_at
     ) VALUES (?, ?, ?, NULL, ?, 'text', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       other_user_id = excluded.other_user_id,
       name = excluded.name,
       last_message_text = excluded.last_message_text,
       last_message_at = excluded.last_message_at,
       unread_count = excluded.unread_count,
       status = excluded.status,
       incoming = excluded.incoming,
       online = excluded.online,
       blocked = excluded.blocked,
       can_message = excluded.can_message,
       can_respond = excluded.can_respond,
       payload = excluded.payload,
       updated_at = excluded.updated_at`,
    [
      stored.id,
      stored.personId,
      stored.name,
      stored.preview,
      stored.updatedAt,
      stored.unreadCount,
      stored.status,
      stored.incoming ? 1 : 0,
      stored.online ? 1 : 0,
      stored.blocked ? 1 : 0,
      access.canMessage ? 1 : 0,
      access.canRespond ? 1 : 0,
      JSON.stringify(stored),
      stored.updatedAt,
    ],
  );
  await requestRepository.upsert(requestFromConversation(stored));
  const previous = peekConversation(stored.id);
  rememberConversation({
    summary: stored,
    canMessage: access.canMessage,
    canRespond: access.canRespond,
    messages: previous?.messages ?? [],
    calls: previous?.calls ?? [],
  });
  return stored;
}

function mapBundle(row: ConversationRow, messages: CachedConversation['messages'], calls: CachedConversation['calls']): CachedConversation {
  const summary = JSON.parse(row.payload) as ConversationSummary;
  return {
    summary,
    canMessage: row.can_message === 1,
    canRespond: row.can_respond === 1,
    messages,
    calls,
  };
}

export const conversationRepository = {
  peekList(): ConversationSummary[] | null {
    return peekConversationList();
  },

  peek(id: string): CachedConversation | null {
    return peekConversation(id);
  },

  async list(): Promise<ConversationSummary[]> {
    const db = await getDatabase();
    const rows = await db.all<{ payload: string }>('SELECT payload FROM conversations ORDER BY rowid ASC');
    const items = rows.map((row) => JSON.parse(row.payload) as ConversationSummary);
    rememberConversationList(items);
    return items;
  },

  async unread(): Promise<number> {
    const db = await getDatabase();
    const row = await db.first<{ total: number }>(
      `SELECT COALESCE(SUM(unread_count), 0) AS total FROM conversations WHERE status = 'accepted'`,
    );
    return Number(row?.total ?? 0);
  },

  async getBundle(id: string): Promise<CachedConversation | null> {
    const db = await getDatabase();
    const row = await db.first<ConversationRow>('SELECT id, payload, can_message, can_respond FROM conversations WHERE id = ?', [id]);
    if (!row) return null;
    const messages = await messageRepository.list(id);
    const calls = await callRepository.forConversation(id);
    const bundle = mapBundle(row, messages, calls);
    rememberConversation(bundle);
    return bundle;
  },

  async save(item: ConversationSummary, explicit?: { canMessage: boolean; canRespond: boolean }): Promise<void> {
    const stored = await writeConversation(item, explicit);
    const current = peekConversationList();
    if (current) rememberConversationList(mergeConversations(current, [stored]));
    emitLocal('conversations');
    emitLocal(`conversation:${item.id}`);
  },

  async upsertMany(items: ConversationSummary[]): Promise<void> {
    for (const item of items) await writeConversation(item);
    const current = await this.list();
    rememberConversationList(mergeConversations(current, items));
    emitLocal('conversations');
  },

  async replaceAll(items: ConversationSummary[]): Promise<void> {
    const db = await getDatabase();
    await db.transaction(async () => {
      await db.run('DELETE FROM conversations');
      await db.run('DELETE FROM chat_requests');
    });
    forgetConversations();
    for (const item of items) await writeConversation(item);
    rememberConversationList(items);
    emitLocal('conversations');
  },

  async updateStatus(id: string, status: ConversationStatus, access?: { canMessage: boolean; canRespond: boolean }): Promise<void> {
    const bundle = this.peek(id) ?? await this.getBundle(id);
    if (!bundle) {
      await requestRepository.updateStatus(id, status);
      return;
    }
    const summary: ConversationSummary = { ...bundle.summary, status, incoming: status === 'pending' ? bundle.summary.incoming : false };
    await this.save(summary, access ?? accessFromSummary(summary));
  },

  async setBlocked(id: string, blocked: boolean): Promise<void> {
    const bundle = this.peek(id) ?? await this.getBundle(id);
    if (!bundle) return;
    const summary: ConversationSummary = { ...bundle.summary, blocked, online: blocked ? false : bundle.summary.online };
    const access = blocked
      ? { canMessage: false, canRespond: false }
      : accessFromSummary(summary);
    await this.save(summary, access);
  },

  async markRead(id: string): Promise<void> {
    const db = await getDatabase();
    await db.run('UPDATE conversations SET unread_count = 0 WHERE id = ?', [id]);
    const bundle = peekConversation(id);
    if (!bundle) return;
    rememberConversation({ ...bundle, summary: { ...bundle.summary, unreadCount: 0 } });
    emitLocal('conversations');
  },
};
