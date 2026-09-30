import { accessFromSummary, keepListCard, mergeConversations, showsInitialLoader } from '@/database/cache-policy';
import type { ConversationSummary } from '@/features/chat/chat.service';

const conversation = (id: string, status: ConversationSummary['status'], extra: Partial<ConversationSummary> = {}): ConversationSummary => ({
  id,
  personId: `${id}-person`,
  name: id,
  preview: null,
  updatedAt: extra.updatedAt ?? null,
  unreadCount: 0,
  online: false,
  status,
  incoming: false,
  ...extra,
});

describe('local cache policy', () => {
  it('treats an accepted conversation as ready to message', () => {
    expect(accessFromSummary(conversation('1', 'accepted'))).toEqual({ canMessage: true, canRespond: false });
  });

  it('does not offer a composer for a pending outgoing request', () => {
    expect(accessFromSummary(conversation('1', 'pending'))).toEqual({ canMessage: false, canRespond: false });
  });

  it('lets the receiver respond to a pending request', () => {
    expect(accessFromSummary(conversation('1', 'pending', { incoming: true })).canRespond).toBe(true);
  });

  it('keeps the visible order when a conversation is updated and appends new ones', () => {
    const merged = mergeConversations(
      [conversation('old', 'accepted', { updatedAt: '2026-09-01T00:00:00.000Z' })],
      [
        conversation('old', 'accepted', { updatedAt: '2026-09-03T00:00:00.000Z', preview: 'hi' }),
        conversation('new', 'accepted', { updatedAt: '2026-09-02T00:00:00.000Z' }),
      ],
    );
    expect(merged.map((item) => item.id)).toEqual(['old', 'new']);
    expect(merged[0]?.preview).toBe('hi');
  });

  it('keeps the list preview and time when a conversation detail omits them', () => {
    const stored = keepListCard(
      conversation('1', 'accepted', { preview: 'Hii', updatedAt: '2026-09-30T08:00:00.000Z' }),
      conversation('1', 'accepted', { preview: null, updatedAt: null, unreadCount: 0 }),
    );
    expect(stored.preview).toBe('Hii');
    expect(stored.updatedAt).toBe('2026-09-30T08:00:00.000Z');
    expect(stored.unreadCount).toBe(0);
  });

  it('shows a full loader only when nothing is cached', () => {
    expect(showsInitialLoader(false, true)).toBe(true);
    expect(showsInitialLoader(true, true)).toBe(false);
  });
});
