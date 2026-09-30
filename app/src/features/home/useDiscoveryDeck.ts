import { useCallback, useEffect, useRef, useState } from 'react';

import { syncResource } from '@/database/sync/queryClient';
import { homeCardRepository } from '@/database/sqlite/repositories/homeCardRepository';
import { prefetchPhotos } from '@/components/home/photo-cache';
import {
  homeFilterKey,
  IMAGE_PREFETCH_AHEAD,
  INITIAL_BATCH_SIZE,
  PREFETCH_BATCH_SIZE,
  discoveryLog,
  reconciledDeck,
  shouldPrefetch,
} from '@/features/home/discovery';
import { peopleService, type OnlinePerson } from '@/features/home/people.service';
import { ApiError } from '@/services/api';

export function useDiscoveryDeck(distanceKm: number | null, interestIds: string[], enabled = true) {
  const filterKey = homeFilterKey(distanceKm, interestIds);
  const seeded = homeCardRepository.peek(filterKey);
  const [people, setPeople] = useState<OnlinePerson[]>(seeded.people);
  const [index, setIndex] = useState(0);
  const [cursor, setCursor] = useState<string | null>(seeded.cursor);
  const [loading, setLoading] = useState(seeded.people.length === 0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(seeded.cursor);
  const epoch = useRef(0);
  const fetchingMore = useRef(false);
  const failedCursor = useRef<string | null>(null);
  const openedKey = useRef<string | null>(null);
  const peopleRef = useRef(people);
  const indexRef = useRef(index);
  peopleRef.current = people;
  indexRef.current = index;
  cursorRef.current = cursor;

  const warmImages = useCallback((batch: OnlinePerson[], start: number, wait = false) => {
    const ids = batch.slice(start, start + IMAGE_PREFETCH_AHEAD + 1).map((person) => person.userId);
    const rest = batch.slice(start + ids.length).map((person) => person.userId);
    const first = prefetchPhotos(ids, (userId) => peopleService.photo(userId));
    if (rest.length > 0) void prefetchPhotos(rest, (userId) => peopleService.photo(userId));
    return wait ? first : Promise.resolve();
  }, []);

  const load = useCallback(async (mode: 'replace' | 'append' | 'revalidate', force = false) => {
    const ticket = epoch.current;
    const key = homeFilterKey(distanceKm, interestIds);
    if (mode === 'append') {
      if (fetchingMore.current || !cursorRef.current || failedCursor.current === cursorRef.current) return;
      fetchingMore.current = true;
      discoveryLog('prefetch triggered', { cursor: cursorRef.current, index: indexRef.current, deck: peopleRef.current.length });
    }
    if (peopleRef.current.length > 0) setSyncing(true);
    try {
      const pageCursor = mode === 'append' ? cursorRef.current : null;
      const limit = mode === 'append' ? PREFETCH_BATCH_SIZE : INITIAL_BATCH_SIZE;
      const result = await syncResource(
        ['people-online', pageCursor, limit, distanceKm, interestIds.join(',')],
        () => peopleService.online({ cursor: pageCursor, limit, distanceKm, interestIds }),
        force,
      );
      const incoming = result.people;
      if (ticket !== epoch.current) return;
      if (mode === 'replace') {
        setPeople(incoming);
        peopleRef.current = incoming;
        setIndex(0);
        indexRef.current = 0;
        setCursor(result.nextCursor);
        cursorRef.current = result.nextCursor;
        await homeCardRepository.replace(key, incoming, result.nextCursor);
        discoveryLog('initial batch', { size: incoming.length, hasMore: result.nextCursor !== null });
        await warmImages(incoming, 0, true);
      } else if (mode === 'append') {
        const merged = await homeCardRepository.append(key, incoming, result.nextCursor);
        setPeople(merged);
        peopleRef.current = merged;
        setCursor(result.nextCursor);
        cursorRef.current = result.nextCursor;
        discoveryLog('prefetch completed', { added: incoming.length, deck: merged.length });
        warmImages(incoming, 0);
      } else {
        const next = reconciledDeck(peopleRef.current, incoming, indexRef.current);
        const saved = await homeCardRepository.patch(key, next.people);
        setPeople(saved);
        peopleRef.current = saved;
        if (next.index !== indexRef.current) {
          indexRef.current = next.index;
          setIndex(next.index);
        }
        discoveryLog('status patched', { incoming: incoming.length, index: indexRef.current });
        warmImages(saved, indexRef.current);
      }
      failedCursor.current = null;
      setError(null);
    } catch (caught) {
      if (mode === 'append') {
        failedCursor.current = cursorRef.current;
        discoveryLog('prefetch failed', { cursor: cursorRef.current });
        return;
      }
      if (ticket !== epoch.current || peopleRef.current.length > 0) return;
      const lost = !(caught instanceof ApiError) || caught.status === 0;
      const needsLocation = caught instanceof ApiError && caught.status === 400;
      setError(lost ? "You're offline" : needsLocation ? 'Turn on location to see people nearby.' : "Couldn't load people");
    } finally {
      if (mode === 'append') fetchingMore.current = false;
      if (ticket === epoch.current) {
        if (mode === 'replace') setLoading(false);
        setSyncing(false);
      }
    }
  }, [distanceKm, interestIds, warmImages]);

  useEffect(() => {
    if (!enabled) return;
    const key = homeFilterKey(distanceKm, interestIds);
    if (openedKey.current === key) return;
    openedKey.current = key;
    let cancelled = false;
    epoch.current += 1;
    void homeCardRepository.read(key).then((cached) => {
      if (cancelled) return;
      if (cached.people.length > 0) {
        peopleRef.current = cached.people;
        indexRef.current = 0;
        cursorRef.current = cached.cursor;
        setPeople(cached.people);
        setCursor(cached.cursor);
        setIndex(0);
        setLoading(false);
        setError(null);
        void load('revalidate');
        return;
      }
      setPeople([]);
      peopleRef.current = [];
      setIndex(0);
      indexRef.current = 0;
      setLoading(true);
      void load('replace');
    }).catch(() => {
      if (!cancelled) void load('replace');
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, load, distanceKm, interestIds]);

  useEffect(() => {
    const remaining = people.length - index - 1;
    if (!shouldPrefetch(remaining, cursor !== null, fetchingMore.current)) return;
    void load('append');
  }, [cursor, index, load, people.length]);

  useEffect(() => {
    if (people.length === 0) return;
    warmImages(people, index);
  }, [index, people, warmImages]);

  function retry() {
    failedCursor.current = null;
    setLoading(people.length === 0);
    void load(people.length === 0 ? 'replace' : 'revalidate', true);
  }

  return {
    people,
    index,
    setIndex,
    hasMore: cursor !== null,
    loading,
    syncing,
    error,
    retry,
    refresh: () => load('revalidate', true),
  };
}
