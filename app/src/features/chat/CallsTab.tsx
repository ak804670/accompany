import { Phone, Video } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { CallEventRow } from '@/components/chat/CallEventRow';
import { CallRequestDialog } from '@/components/chat/CallRequestDialog';
import { AppButton } from '@/components/design-system/AppButton';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { IllustratedState } from '@/components/illustrations/IllustratedState';
import { illustrationForError } from '@/assets/illustrations/illustrationRegistry';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { callManager } from '@/features/calls/call-manager';
import { callRepository } from '@/database/sqlite/repositories/callRepository';
import { subscribeLocal } from '@/database/sqlite/memory';
import { chatService, type CallHistoryItem, type ConversationSummary } from '@/features/chat/chat.service';
import { syncCalls } from '@/database/sync/syncEngine';
import { ApiError } from '@/services/api';

type CallsTabProps = {
  active?: boolean;
  width: number;
  height: number;
  query: string;
  onOpen: (item: ConversationSummary, highlightCallId: string) => void;
};

export function CallsTab({ active = false, width, height, query, onOpen }: CallsTabProps) {
  const seeded = callRepository.peek();
  const [items, setItems] = useState<CallHistoryItem[]>(seeded ?? []);
  const [cursor, setCursor] = useState<string | null>(null);
  const [missed, setMissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settled, setSettled] = useState(Boolean(seeded && seeded.length > 0));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<CallHistoryItem | null>(null);
  const missedRef = useRef(missed);
  const fetchedAll = useRef(false);
  missedRef.current = missed;

  const load = useCallback(async (next?: string | null, force = false) => {
    const onlyMissed = missedRef.current;
    try {
      const result = await syncCalls(next, onlyMissed, force);
      setItems((current) => (next
        ? [...current, ...result.calls.filter((call) => !current.some((item) => item.id === call.id))]
        : result.calls));
      setCursor(result.nextCursor);
      setError(null);
    } catch (caught) {
      const cached = onlyMissed ? [] : callRepository.peek() ?? await callRepository.recent().catch(() => []);
      if (cached.length > 0) setItems(cached);
      else setError(!(caught instanceof ApiError) || caught.status === 0 ? "You're offline" : "We couldn't load calls right now.");
    } finally {
      setSettled(true);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    if (!missed && fetchedAll.current) return;
    if (!missed) fetchedAll.current = true;
    let alive = true;
    if (!missed) {
      void callRepository.recent().then((cached) => {
        if (!alive || missedRef.current || cached.length === 0) return;
        setItems(cached);
        setSettled(true);
      }).catch(() => undefined);
    }
    void load(null, true);
    const unsubscribe = subscribeLocal('calls', () => {
      if (!alive || missedRef.current) return;
      const cached = callRepository.peek();
      if (!cached || cached.length === 0) return;
      setItems((current) => {
        if (current.length === 0) return cached;
        const byId = new Map(cached.map((item) => [item.id, item]));
        const seen = new Set(current.map((item) => item.id));
        return [...current.map((item) => byId.get(item.id) ?? item), ...cached.filter((item) => !seen.has(item.id))];
      });
      setSettled(true);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [active, load, missed]);

  const needle = query.trim().toLowerCase();
  const visible = items.filter((item) => (item.name ?? '').toLowerCase().includes(needle));

  async function confirmCall() {
    const item = pending;
    setPending(null);
    if (!item?.conversationId) {
      setNotice('Open the conversation before calling.');
      return;
    }
    try {
      const created = await chatService.requestCall(item.personId, item.callType === 'VIDEO' ? 'video' : 'audio', item.conversationId);
      callManager.presentOutgoing({ id: created.id, name: item.name, video: item.callType === 'VIDEO' });
      setNotice(null);
      onOpen(summary(item), item.id);
    } catch (caught) {
      const body = caught instanceof ApiError && caught.body && typeof caught.body === 'object' ? caught.body as { error?: { message?: string } } : null;
      setNotice(body?.error?.message || "Couldn't start the call.");
    }
  }

  return (
    <View style={{ width, height }}>
      <View className="mb-sm flex-row gap-sm">
        <FilterChip label="All" selected={!missed} onPress={() => setMissed(false)} />
        <FilterChip label="Missed" selected={missed} onPress={() => setMissed(true)} />
      </View>
      {notice ? <AppText className="pb-sm" variant="bodyS" tone="warning">{notice}</AppText> : null}
      <FlatList
        style={{ flex: 1 }}
        data={visible}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(null, true).finally(() => setRefreshing(false)); }} />}
        onEndReached={() => { if (cursor && !needle) void load(cursor); }}
        ListEmptyComponent={
          !settled && !error ? (
            <IllustratedState name="loading" motion="pulse" size={140} title="Loading calls..." />
          ) : (
          <IllustratedState
            name={error ? illustrationForError(error) : 'calls-empty'}
            title={error ?? (missed ? 'No missed calls' : 'No calls yet')}
            body={error ? 'Try again in a moment.' : missed ? 'Missed voice and video calls will appear here.' : 'Your recent voice and video calls will appear here.'}
          >
            {error ? <AppButton variant="outline" onPress={() => void load(null, true)}>Try again</AppButton> : null}
          </IllustratedState>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, open conversation`}
            className="flex-row items-center gap-md border-b border-border py-sm"
            onPress={() => { if (item.conversationId) onOpen(summary(item), item.id); }}
          >
            <PersonAvatar userId={item.personId} name={item.name} size={48} />
            <View className="min-w-0 flex-1">
              <AppText variant="label">{item.name}</AppText>
              <CallEventRow stacked call={item} viewerId={item.callerId === item.personId ? item.receiverId : item.callerId} />
            </View>
            <AppIconButton
              icon={item.callType === 'VIDEO' ? Video : Phone}
              accessibilityLabel={item.callType === 'VIDEO' ? `Video call ${item.name}` : `Voice call ${item.name}`}
              onPress={() => setPending(item)}
            />
          </Pressable>
        )}
      />
      <CallRequestDialog
        kind={pending ? (pending.callType === 'VIDEO' ? 'video' : 'voice') : null}
        name={pending?.name ?? ''}
        onClose={() => setPending(null)}
        onConfirm={() => void confirmCall()}
      />
    </View>
  );
}

function summary(item: CallHistoryItem): ConversationSummary {
  return {
    id: item.conversationId ?? '',
    personId: item.personId,
    name: item.name,
    preview: null,
    updatedAt: item.createdAt,
    unreadCount: 0,
    online: false,
    status: 'accepted',
    incoming: false,
  };
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} className={selected ? 'rounded-sm bg-muted px-md py-xs' : 'rounded-sm px-md py-xs'} onPress={onPress}>
      <AppText variant="label" tone={selected ? 'default' : 'muted'}>{label}</AppText>
    </Pressable>
  );
}
