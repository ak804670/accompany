export const DISCOVERY_RADII_KM = [5, 10, 25, 50] as const;
export const SWIPE_THRESHOLD = 120;
export const INITIAL_BATCH_SIZE = 10;
export const PREFETCH_BATCH_SIZE = 10;
export const PREFETCH_THRESHOLD = 4;
export const IMAGE_PREFETCH_AHEAD = 3;

export function shouldPrefetch(remaining: number, hasMore: boolean, fetching: boolean): boolean {
  return hasMore && !fetching && remaining >= 0 && remaining <= PREFETCH_THRESHOLD;
}

export function patchProfiles<T extends { userId: string }>(current: T[], incoming: T[]): T[] {
  const byId = new Map(incoming.map((person) => [person.userId, person]));
  return current.map((person) => {
    const next = byId.get(person.userId);
    return next ? { ...person, ...next } : person;
  });
}

export function discoveryLog(event: string, detail: Record<string, unknown>): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.info('[discovery]', event, detail);
}

export function shouldCompleteSwipe(distance: number, threshold = SWIPE_THRESHOLD): boolean {
  return Math.abs(distance) >= threshold;
}

export function mergeProfiles<T extends { userId: string }>(current: T[], incoming: T[]): T[] {
  const seen = new Set(current.map((person) => person.userId));
  const next = [...current];
  for (const person of incoming) {
    if (seen.has(person.userId)) continue;
    seen.add(person.userId);
    next.push(person);
  }
  return next;
}

export function nextDeckIndex(index: number, length: number, hasMore: boolean): number {
  if (length <= 0) return 0;
  if (index < length - 1) return index + 1;
  if (hasMore) return index;
  return 0;
}

export function formatRate(amount: number | null, unit: 'message' | 'min'): string {
  if (amount === null) return '—';
  return `₹${amount}/${unit}`;
}

export function formatDistance(distanceKm: number | null): string | null {
  if (distanceKm === null) return null;
  if (distanceKm < 1) return 'Nearby';
  return `${distanceKm} km away`;
}
