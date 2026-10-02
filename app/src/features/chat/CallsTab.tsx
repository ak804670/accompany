import { useCallback, useEffect, useState } from 'react';
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
import { callService } from '@/features/calls/call.service';
import { chatService, type CallHistoryItem, type ConversationSummary } from '@/features/chat/chat.service';
import { ApiError } from '@/services/api';

type CallsTabProps = {
  width: number;
  query: string;
  onOpen: (item: ConversationSummary, highlightCallId: string) => void;
};

export function CallsTab({ width, query, onOpen }: CallsTabProps) {
  const [items, setItems] = useState<CallHistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [missed, setMissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<CallHistoryItem | null>(null);

  const load = useCallback(async (next?: string | null, replace = true, onlyMissed = missed) => {
    try {
      const result = await chatService.recentCalls(next, onlyMissed);
      setItems((current) => (replace ? result.calls : [...current, ...result.calls.filter((call) => !current.some((item) => item.id === call.id))]));
      setCursor(result.nextCursor);
      setError(null);
    } catch (caught) {
      setError(!(caught instanceof ApiError) || caught.status === 0 ? "You're offline" : "We couldn't load calls right now.");
    }
  }, [missed]);

  useEffect(() => {
    void load(null, true, missed);
  }, [load, missed]);

  const needle = query.trim().toLowerCase();
  const visible = items.filter((item) => item.name.toLowerCase().includes(needle));

  async function confirmCall() {
    const item = pending;
    setPending(null);
    if (!item?.conversationId) {
      setNotice('Open the conversation before calling.');
      return;
    }
    try {
      const kind = item.callType === 'VIDEO' ? 'video' : 'audio';
      const response = await callService.start(item.personId, kind, item.conversationId);
      const callData = response.call;
      callManager.presentOutgoing({
        id: callData.id,
        name: item.name,
        video: kind === 'video',
        rate: callData.rate,
        userId: item.personId,
        media: response.token && response.url ? {
          callId: callData.id,
          url: response.url,
          token: response.token,
          roomName: callData.roomName,
        } : undefined,
      });
      setNotice(null);
      onOpen(summary(item), item.id);
    } catch (caught) {
      const body = caught instanceof ApiError && caught.body && typeof caught.body === 'object' ? caught.body as { error?: { message?: string } } : null;
      setNotice(body?.error?.message || "Couldn't start the call.");
    }
  }

  return (
    <View style={{ width }}>
      <View className="mb-sm flex-row gap-sm">
        <FilterChip label="All" selected={!missed} onPress={() => setMissed(false)} />
        <FilterChip label="Missed" selected={missed} onPress={() => setMissed(true)} />
      </View>
      {notice ? <AppText className="pb-sm" variant="bodyS" tone="warning">{notice}</AppText> : null}
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(null, true).finally(() => setRefreshing(false)); }} />}
        onEndReached={() => { if (cursor && !needle) void load(cursor, false); }}
        ListEmptyComponent={
          <IllustratedState
            name={error ? illustrationForError(error) : 'calls-empty'}
            title={error ?? (missed ? 'No missed calls' : 'No calls yet')}
            body={error ? 'Try again in a moment.' : missed ? 'Missed voice and video calls will appear here.' : 'Your recent voice and video calls will appear here.'}
          >
            {error ? <AppButton variant="outline" onPress={() => void load(null, true)}>Try again</AppButton> : null}
          </IllustratedState>
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
              icon={item.callType === 'VIDEO' ? 'video-call' : 'call'}
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
