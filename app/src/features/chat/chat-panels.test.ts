import { chatPanels, mergeInitialMessages, phaseForCachedThread } from '@/features/chat/chat-panels';
import type { ChatMessage } from '@/features/chat/chat.service';

const base = { status: 'accepted' as const, blocked: false, canMessage: true, canRespond: false, hasTimeline: true };

describe('chat panels', () => {
  it('opens a cached thread without the loading phase', () => {
    expect(phaseForCachedThread(true)).toBe('ready');
    expect(phaseForCachedThread(false)).toBe('loading');
    expect(chatPanels({ ...base, phase: phaseForCachedThread(true) }).content).toBe('timeline');
  });

  it('keeps loading ahead of a pending request', () => {
    expect(chatPanels({ ...base, phase: 'loading', status: 'pending', canMessage: false, hasTimeline: false })).toEqual({
      content: 'loading',
      footer: 'none',
    });
  });

  it('shows the composer for an accepted conversation', () => {
    expect(chatPanels({ ...base, phase: 'ready' })).toEqual({ content: 'timeline', footer: 'composer' });
  });

  it('shows an empty chat only after an accepted conversation has no timeline', () => {
    expect(chatPanels({ ...base, phase: 'ready', hasTimeline: false })).toEqual({ content: 'empty', footer: 'composer' });
  });

  it('shows a pending request only after loading finishes', () => {
    expect(chatPanels({ ...base, phase: 'ready', status: 'pending', canMessage: false, hasTimeline: false })).toEqual({
      content: 'timeline',
      footer: 'pending',
    });
  });

  it('does not treat a rejected request as still waiting', () => {
    expect(chatPanels({ ...base, phase: 'ready', status: 'rejected', canMessage: false, hasTimeline: false }).footer).toBe('rejected');
  });

  it('shows the blocked state for any timeline', () => {
    expect(chatPanels({ ...base, phase: 'ready', blocked: true, canMessage: false }).footer).toBe('blocked');
  });

  it('shows an error instead of a request', () => {
    expect(chatPanels({ ...base, phase: 'error', status: 'pending', canMessage: false })).toEqual({
      content: 'error',
      footer: 'none',
    });
  });
});

describe('mergeInitialMessages', () => {
  const saved: ChatMessage = { id: 'server-1', senderId: 'a', body: 'Hello', createdAt: '2026-09-26T10:00:00.000Z', mine: false, clientMessageId: 'client-1' };

  it('keeps a live message that is not in the history response', () => {
    const live: ChatMessage = { id: 'server-2', senderId: 'b', body: 'Now', createdAt: '2026-09-26T10:01:00.000Z', mine: true };
    expect(mergeInitialMessages([live], [saved])).toEqual([saved, live]);
  });

  it('drops a live copy that the history response already contains', () => {
    expect(mergeInitialMessages([saved], [saved])).toEqual([saved]);
  });
});
