import { formatRate, mergeProfiles, nextDeckIndex, patchProfiles, shouldPrefetch, shouldShowDiscoveryLoader, shouldCompleteSwipe, SWIPE_THRESHOLD, PREFETCH_THRESHOLD } from '@/features/home/discovery';

describe('discovery swipe', () => {
  it('returns the card when the drag is below the threshold', () => {
    expect(shouldCompleteSwipe(SWIPE_THRESHOLD - 1)).toBe(false);
    expect(shouldCompleteSwipe(-(SWIPE_THRESHOLD - 1))).toBe(false);
  });

  it('advances when the drag reaches the threshold', () => {
    expect(shouldCompleteSwipe(SWIPE_THRESHOLD)).toBe(true);
    expect(shouldCompleteSwipe(-SWIPE_THRESHOLD)).toBe(true);
  });

  it('keeps the current card when more people are still loading', () => {
    expect(nextDeckIndex(3, 4, true)).toBe(3);
  });

  it('loops to the first card only when the deck is complete', () => {
    expect(nextDeckIndex(3, 4, false)).toBe(0);
    expect(nextDeckIndex(0, 4, false)).toBe(1);
  });

  it('appends new profiles without duplicating ids or resetting order', () => {
    const merged = mergeProfiles(
      [{ userId: 'a' }, { userId: 'b' }],
      [{ userId: 'b' }, { userId: 'c' }],
    );
    expect(merged.map((person) => person.userId)).toEqual(['a', 'b', 'c']);
  });

  it('skips the discovery loader when cached profiles are already on screen', () => {
    expect(shouldShowDiscoveryLoader(0, true)).toBe(true);
    expect(shouldShowDiscoveryLoader(10, true)).toBe(false);
    expect(shouldShowDiscoveryLoader(0, false)).toBe(false);
  });

  it('prefetches only when four or fewer profiles remain', () => {
    expect(shouldPrefetch(PREFETCH_THRESHOLD, true, false)).toBe(true);
    expect(shouldPrefetch(PREFETCH_THRESHOLD + 1, true, false)).toBe(false);
    expect(shouldPrefetch(1, true, true)).toBe(false);
    expect(shouldPrefetch(1, false, false)).toBe(false);
  });

  it('updates an existing profile in place', () => {
    const patched = patchProfiles(
      [{ userId: 'a', online: false }, { userId: 'b', online: true }],
      [{ userId: 'a', online: true }],
    );
    expect(patched).toEqual([{ userId: 'a', online: true }, { userId: 'b', online: true }]);
  });

  it('keeps a short batch and an empty batch usable', () => {
    expect(mergeProfiles([{ userId: 'a' }], [])).toEqual([{ userId: 'a' }]);
    expect(nextDeckIndex(0, 0, false)).toBe(0);
    expect(nextDeckIndex(1, 3, false)).toBe(2);
  });

  describe('formatRate', () => {
    it('formats rates in coins per unit', () => {
      expect(formatRate(null, 'min')).toBe('—');
      expect(formatRate(1, 'min')).toBe('1 coin/min');
      expect(formatRate(10, 'min')).toBe('10 coins/min');
      expect(formatRate(5, 'message')).toBe('5 coins/message');
    });
  });
});
