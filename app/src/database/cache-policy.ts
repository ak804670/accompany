import type { ConversationSummary } from '@/features/chat/chat.service';

export function accessFromSummary(item: ConversationSummary): { canMessage: boolean; canRespond: boolean } {
  const blocked = Boolean(item.blocked);
  return {
    canMessage: item.status === 'accepted' && !blocked,
    canRespond: item.status === 'pending' && item.incoming && !blocked,
  };
}

export function keepListCard(existing: ConversationSummary | null | undefined, incoming: ConversationSummary): ConversationSummary {
  if (!existing) return incoming;
  return {
    ...incoming,
    preview: incoming.preview ?? existing.preview,
    updatedAt: incoming.updatedAt ?? existing.updatedAt,
  };
}

export function mergeConversations(current: ConversationSummary[], incoming: ConversationSummary[]): ConversationSummary[] {
  const incomingById = new Map(incoming.map((item) => [item.id, item]));
  const seen = new Set(current.map((item) => item.id));
  const updated = current.map((item) => incomingById.get(item.id) ?? item);
  const added = incoming.filter((item) => !seen.has(item.id));
  return [...updated, ...added];
}

export function applyCachedConversations(current: ConversationSummary[], cached: ConversationSummary[]): ConversationSummary[] {
  if (current.length === 0) return cached;
  return mergeConversations(current, cached);
}

export function showsInitialLoader(hasCachedData: boolean, requestPending: boolean): boolean {
  return !hasCachedData && requestPending;
}
