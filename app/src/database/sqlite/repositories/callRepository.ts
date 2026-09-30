import { getDatabase } from '@/database/sqlite/database';
import { emitLocal, peekCalls, rememberCalls } from '@/database/sqlite/memory';
import type { CallEvent, CallHistoryItem } from '@/features/chat/chat.service';

type CallRow = {
  id: string;
  payload: string;
  conversation_id: string | null;
  created_at: string;
};

function historyFrom(call: CallEvent, extra?: Partial<CallHistoryItem>): CallHistoryItem {
  return {
    ...call,
    personId: extra?.personId ?? '',
    name: extra?.name ?? '',
    conversationId: extra?.conversationId ?? call.conversationId ?? null,
  };
}

export const callRepository = {
  peek(): CallHistoryItem[] | null {
    return peekCalls();
  },

  async recent(): Promise<CallHistoryItem[]> {
    const db = await getDatabase();
    const rows = await db.all<CallRow>('SELECT id, payload, conversation_id, created_at FROM calls ORDER BY created_at DESC');
    const calls = rows.map((row) => JSON.parse(row.payload) as CallHistoryItem);
    rememberCalls(calls);
    return calls;
  },

  async forConversation(conversationId: string): Promise<CallEvent[]> {
    const db = await getDatabase();
    const rows = await db.all<CallRow>('SELECT payload FROM calls WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);
    return rows.map((row) => JSON.parse(row.payload) as CallEvent);
  },

  async upsert(call: CallEvent, extra?: Partial<CallHistoryItem>): Promise<void> {
    const db = await getDatabase();
    const stored = historyFrom(call, extra);
    await db.run(
      `INSERT INTO calls (
         id, conversation_id, caller_id, receiver_id, person_id, name, call_type, status, started_at, ended_at, duration, created_at, payload
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         conversation_id = excluded.conversation_id,
         status = excluded.status,
         duration = excluded.duration,
         person_id = excluded.person_id,
         name = excluded.name,
         payload = excluded.payload`,
      [
        stored.id,
        stored.conversationId ?? null,
        stored.callerId || 'unknown',
        stored.receiverId || 'unknown',
        stored.personId || null,
        stored.name || null,
        stored.callType,
        stored.status,
        stored.createdAt == null ? new Date().toISOString() : String(stored.createdAt instanceof Date ? stored.createdAt.toISOString() : stored.createdAt),
        typeof stored.durationSeconds === 'number' && Number.isFinite(stored.durationSeconds) ? stored.durationSeconds : null,
        stored.createdAt == null ? new Date().toISOString() : String(stored.createdAt instanceof Date ? stored.createdAt.toISOString() : stored.createdAt),
        JSON.stringify(stored),
      ],
    );
    const merged = new Map((peekCalls() ?? []).map((call) => [call.id, call]));
    merged.set(stored.id, stored);
    rememberCalls([...merged.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    emitLocal('calls');
  },

  async upsertMany(calls: CallHistoryItem[]): Promise<void> {
    for (const call of calls) await this.upsert(call, call);
    const merged = new Map((peekCalls() ?? []).map((call) => [call.id, call]));
    for (const call of calls) merged.set(call.id, call);
    rememberCalls([...merged.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    emitLocal('calls');
  },

  async upsertEvents(calls: CallEvent[], extra?: Partial<CallHistoryItem>): Promise<void> {
    const stored = calls.map((call) => historyFrom(call, extra));
    for (const call of stored) await this.upsert(call, call);
    const merged = new Map((peekCalls() ?? []).map((call) => [call.id, call]));
    for (const call of stored) merged.set(call.id, call);
    rememberCalls([...merged.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    emitLocal('calls');
  },
};
