import type { ChatMessage, ConversationStatus } from '@/features/chat/chat.service';

export type ConversationPhase = 'loading' | 'ready' | 'error';

export type ChatContent = 'loading' | 'error' | 'empty' | 'timeline';

export type ChatFooter = 'none' | 'blocked' | 'incoming' | 'composer' | 'pending' | 'rejected';

export function chatPanels(input: {
  phase: ConversationPhase;
  status: ConversationStatus | null;
  blocked: boolean;
  canMessage: boolean;
  canRespond: boolean;
  hasTimeline: boolean;
}): { content: ChatContent; footer: ChatFooter } {
  if (input.phase === 'loading') return { content: 'loading', footer: 'none' };
  if (input.phase === 'error') return { content: 'error', footer: 'none' };

  const footer: ChatFooter = input.blocked
    ? 'blocked'
    : input.canRespond
      ? 'incoming'
      : input.canMessage
        ? 'composer'
        : input.status === 'rejected'
          ? 'rejected'
          : input.status === 'pending'
            ? 'pending'
            : 'none';

  const content: ChatContent = input.canMessage && !input.blocked && !input.hasTimeline ? 'empty' : 'timeline';
  return { content, footer };
}

/** Keep a socket message that arrived before the history response, without duplicating it. */
export function mergeInitialMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const ids = new Set(incoming.map((item) => item.id));
  const clientIds = new Set(incoming.flatMap((item) => (item.clientMessageId ? [item.clientMessageId] : [])));
  const extras = current.filter((item) => !ids.has(item.id) && !(item.clientMessageId && clientIds.has(item.clientMessageId)));
  return [...incoming, ...extras];
}
