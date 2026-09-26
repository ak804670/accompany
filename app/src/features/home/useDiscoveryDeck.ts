import { useCallback, useEffect, useRef, useState } from 'react';

import { prefetchPhotos } from '@/components/home/photo-cache';
import {
  IMAGE_PREFETCH_AHEAD,
  INITIAL_BATCH_SIZE,
  PREFETCH_BATCH_SIZE,
  discoveryLog,
  mergeProfiles,
  patchProfiles,
  shouldPrefetch,
} from '@/features/home/discovery';
import { peopleService, type OnlinePerson } from '@/features/home/people.service';
import { ApiError } from '@/services/api';

export function useDiscoveryDeck(distanceKm: number | null, interestIds: string[]) {
  const [people, setPeople] = useState<OnlinePerson[]>([]);
  const [index, setIndex] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const fetchingMore = useRef(false);
  const failedCursor = useRef<string | null>(null);
  const peopleRef = useRef(people);
  const indexRef = useRef(index);
  peopleRef.current = people;
  indexRef.current = index;
  cursorRef.current = cursor;

  const warmImages = useCallback(async (batch: OnlinePerson[], start: number, wait: boolean) => {
    const ids = batch.slice(start, start + IMAGE_PREFETCH_AHEAD + 1).map((person) => person.userId);
    const rest = batch.slice(start + ids.length).map((person) => person.userId);
    if (wait) await prefetchPhotos(ids, (userId) => peopleService.photo(userId));
    else void prefetchPhotos(ids, (userId) => peopleService.photo(userId));
    if (rest.length > 0) void prefetchPhotos(rest, (userId) => peopleService.photo(userId));
  }, []);

  const load = useCallback(async (mode: 'replace' | 'append' | 'refresh') => {
    if (mode === 'append') {
      if (fetchingMore.current || !cursorRef.current || failedCursor.current === cursorRef.current) return;
      fetchingMore.current = true;
      discoveryLog('prefetch triggered', { cursor: cursorRef.current, index: indexRef.current, deck: peopleRef.current.length });
    }
    try {
      const result = await peopleService.online({
        cursor: mode === 'append' ? cursorRef.current : null,
        limit: mode === 'append' ? PREFETCH_BATCH_SIZE : INITIAL_BATCH_SIZE,
        distanceKm,
        interestIds,
      });
      const incoming = result.people;
      if (mode === 'replace') {
        setPeople(incoming);
        setIndex(0);
        setCursor(result.nextCursor);
        cursorRef.current = result.nextCursor;
        discoveryLog('initial batch', { size: incoming.length, hasMore: result.nextCursor !== null });
        await warmImages(incoming, 0, true);
      } else if (mode === 'append') {
        setPeople((current) => {
          const merged = mergeProfiles(current, incoming);
          discoveryLog('prefetch completed', {
            added: merged.length - current.length,
            duplicates: incoming.length - (merged.length - current.length),
            deck: merged.length,
          });
          return merged;
        });
        setCursor(result.nextCursor);
        cursorRef.current = result.nextCursor;
        void warmImages(incoming, 0, false);
      } else if (peopleRef.current.length > 0) {
        setPeople((current) => patchProfiles(current, incoming));
        discoveryLog('status patched', { incoming: incoming.length, index: indexRef.current });
      }
      failedCursor.current = null;
      setError(null);
    } catch (caught) {
      if (mode === 'append') {
        failedCursor.current = cursorRef.current;
        discoveryLog('prefetch failed', { cursor: cursorRef.current });
        return;
      }
      if (mode === 'refresh') return;
      const lost = !(caught instanceof ApiError) || caught.status === 0;
      const needsLocation = caught instanceof ApiError && caught.status === 400;
      setError(lost ? "You're offline" : needsLocation ? 'Turn on location to see people nearby.' : "Couldn't load people");
    } finally {
      if (mode === 'append') fetchingMore.current = false;
      if (mode === 'replace') setLoading(false);
    }
  }, [distanceKm, interestIds, warmImages]);

  useEffect(() => {
    setLoading(true);
    void load('replace');
  }, [load]);

  useEffect(() => {
    const remaining = people.length - index - 1;
    if (!shouldPrefetch(remaining, cursor !== null, fetchingMore.current)) return;
    void load('append');
  }, [cursor, index, load, people.length]);

  useEffect(() => {
    if (people.length === 0) return;
    void warmImages(people, index, false);
  }, [index, people, warmImages]);

  function retry() {
    failedCursor.current = null;
    setLoading(people.length === 0);
    void load(people.length === 0 ? 'replace' : 'refresh');
  }

  return { people, index, setIndex, hasMore: cursor !== null, loading, error, retry, refresh: () => load('refresh') };
}
