import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Animated, FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatListItem } from '@/components/chat/ChatListItem';
import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { IllustratedState } from '@/components/illustrations/IllustratedState';
import { illustrationForError, type IllustrationName } from '@/assets/illustrations/illustrationRegistry';
import { CallsTab } from '@/features/chat/CallsTab';
import { chatService, type ConversationSummary } from '@/features/chat/chat.service';
import { applyCachedConversations, mergeConversations, showsInitialLoader } from '@/database/cache-policy';
import { conversationRepository } from '@/database/sqlite/repositories/conversationRepository';
import { subscribeLocal } from '@/database/sqlite/memory';
import { syncConversationList } from '@/database/sync/syncEngine';
import { ApiError } from '@/services/api';

type ChatsScreenProps = {
  active?: boolean;
  onOpen: (item: ConversationSummary, highlightCallId?: string) => void;
};

type ChatTab = 'requests' | 'conversations' | 'calls';

const TABS: ChatTab[] = ['requests', 'conversations', 'calls'];

export function ChatsScreen({ onOpen, active = true }: ChatsScreenProps) {
  const insets = useSafeAreaInsets();
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const pager = useRef<Animated.ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const seeded = conversationRepository.peekList();
  const [items, setItems] = useState<ConversationSummary[]>(seeded ?? []);
  const [cursor, setCursor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<ChatTab>('requests');
  const [loading, setLoading] = useState(!(seeded && seeded.length > 0));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  const refreshed = useRef(false);
  itemsRef.current = items;

  const load = useCallback(async (next?: string | null, replace = true, force = false) => {
    try {
      const result = await syncConversationList(next, force);
      setItems((current) => {
        if (replace && result.nextCursor === null && !next) return result.conversations;
        return mergeConversations(current, result.conversations);
      });
      setCursor(result.nextCursor);
      setError(null);
    } catch (caught) {
      if (itemsRef.current.length === 0) {
        setError(!(caught instanceof ApiError) || caught.status === 0 ? "You're offline" : "We couldn't load chats right now.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active || refreshed.current) return;
    refreshed.current = true;
    let alive = true;
    void load(null, true).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [active, load]);

  useEffect(() => {
    let alive = true;
    void conversationRepository.list().then((cached) => {
      if (!alive || cached.length === 0) return;
      setItems((current) => applyCachedConversations(current, cached));
      setLoading(false);
    }).catch(() => undefined);
    const unsubscribe = subscribeLocal('conversations', () => {
      void conversationRepository.list().then((cached) => {
        if (!alive || cached.length === 0) return;
        setItems((current) => applyCachedConversations(current, cached));
      }).catch(() => undefined);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [load]);

  const needle = query.trim().toLowerCase();
  const requestCount = items.filter((item) => item.status === 'pending').length;
  const requests = items.filter((item) => item.status === 'pending' && item.name.toLowerCase().includes(needle));
  const conversations = items.filter((item) => item.status !== 'pending' && item.name.toLowerCase().includes(needle));

  function show(next: ChatTab) {
    setTab(next);
    pager.current?.scrollTo({ x: TABS.indexOf(next) * pageWidth, animated: true });
  }

  async function respond(id: string, accept: boolean) {
    const previous = itemsRef.current;
    setItems((current) => accept
      ? current.map((item) => item.id === id ? { ...item, status: 'accepted', incoming: false } : item)
      : current.filter((item) => item.id !== id));
    try {
      if (accept) await chatService.accept(id);
      else await chatService.reject(id);
      if (accept) await conversationRepository.updateStatus(id, 'accepted', { canMessage: true, canRespond: false });
      else {
        const item = previous.find((entry) => entry.id === id);
        if (item) await conversationRepository.save({ ...item, status: 'rejected', incoming: false }, { canMessage: false, canRespond: false });
      }
    } catch {
      setItems(previous);
    }
  }

  const indicator = scrollX.interpolate({
    inputRange: [0, pageWidth, pageWidth * 2],
    outputRange: [0, pageWidth / 3, (pageWidth * 2) / 3],
    extrapolate: 'clamp',
  });

  return (
    <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 16 }}>
      <AppText variant="h2">Chats</AppText>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={tab === 'requests' ? 'Search requests' : tab === 'calls' ? 'Search calls' : 'Search conversations'}
        accessibilityLabel={tab === 'requests' ? 'Search requests' : tab === 'calls' ? 'Search calls' : 'Search conversations'}
        className="mt-md h-12 rounded-sm border border-input bg-background px-3 text-foreground"
      />
      <View className="mt-md border-b border-border">
        <View className="flex-row">
          <ChatTabButton label={requestCount > 0 ? `Requests (${requestCount})` : 'Requests'} active={tab === 'requests'} onPress={() => show('requests')} />
          <ChatTabButton label="Conversations" active={tab === 'conversations'} onPress={() => show('conversations')} />
          <ChatTabButton label="Calls" active={tab === 'calls'} onPress={() => show('calls')} />
        </View>
        <Animated.View className="h-0.5 w-1/3 bg-primary" style={{ transform: [{ translateX: indicator }] }} />
      </View>
      <View className="mt-sm flex-1" onLayout={(event) => { setPageWidth(event.nativeEvent.layout.width); setPageHeight(event.nativeEvent.layout.height); }}>
      {pageWidth === 0 || pageHeight === 0 ? null : (
        <Animated.ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          nestedScrollEnabled
          directionalLockEnabled
          contentContainerStyle={{ height: pageHeight }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
          onMomentumScrollEnd={(event) => {
            setTab(TABS[Math.round(event.nativeEvent.contentOffset.x / pageWidth)] ?? 'requests');
          }}
          className="mt-sm flex-1"
        >
          <ChatPage width={pageWidth} height={pageHeight} loading={showsInitialLoader(requests.length > 0, loading)} items={requests} illustration={error ? illustrationForError(error) : 'chat-requests'} emptyTitle={error ?? 'No requests'} emptyBody={error ? 'Try again in a moment.' : 'New conversation requests will appear here.'} error={error} refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(null, true, true).finally(() => setRefreshing(false)); }} onEnd={() => { if (cursor && !query.trim()) void load(cursor, false); }} onRetry={() => void load(null, true, true)} renderItem={(item) => (
            <View className="gap-sm border-b border-border py-xs">
              <ChatListItem item={item} onPress={() => onOpen(item)} />
              {item.incoming ? (
                <View className="flex-row gap-sm pb-sm">
                  <AppButton variant="outline" className="flex-1" onPress={() => void respond(item.id, false)}>Decline</AppButton>
                  <AppButton className="flex-1" onPress={() => void respond(item.id, true)}>Accept</AppButton>
                </View>
              ) : <AppText className="pb-sm" variant="caption" tone="muted">Waiting for them to accept</AppText>}
            </View>
          )} />
          <ChatPage width={pageWidth} height={pageHeight} loading={showsInitialLoader(conversations.length > 0, loading)} items={conversations} illustration={error ? illustrationForError(error) : 'chat-empty'} emptyTitle={error ?? 'No conversations yet'} emptyBody={error ? 'Try again in a moment.' : 'When someone accepts a conversation, it will appear here.'} error={error} refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(null, true, true).finally(() => setRefreshing(false)); }} onEnd={() => { if (cursor && !query.trim()) void load(cursor, false); }} onRetry={() => void load(null, true, true)} renderItem={(item) => <ChatListItem item={item} onPress={() => onOpen(item)} />} />
          <CallsTab active={active && tab === 'calls'} width={pageWidth} height={pageHeight} query={query} onOpen={onOpen} />
        </Animated.ScrollView>
      )}
      </View>
    </View>
  );
}

function ChatPage({ width, height, items, illustration, emptyTitle, emptyBody, error, refreshing, onRefresh, onEnd, onRetry, renderItem, loading = false }: {
  width: number;
  height: number;
  items: ConversationSummary[];
  illustration: IllustrationName;
  emptyTitle: string;
  emptyBody: string;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onEnd: () => void;
  onRetry: () => void;
  renderItem: (item: ConversationSummary) => ReactElement;
  loading?: boolean;
}) {
  return (
    <View style={{ width, height }}>
      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEnd}
        ListEmptyComponent={
          loading ? (
            <IllustratedState name="loading" motion="pulse" size={140} title="Loading chats..." />
          ) : (
          <IllustratedState name={illustration} title={emptyTitle} body={emptyBody}>
            {error ? <AppButton variant="outline" onPress={onRetry}>Try again</AppButton> : null}
          </IllustratedState>
          )
        }
        renderItem={({ item }) => renderItem(item)}
      />
    </View>
  );
}

function ChatTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} className="min-h-12 flex-1 items-center justify-center" onPress={onPress}>
      <AppText variant="label" tone={active ? 'primary' : 'muted'}>{label}</AppText>
    </Pressable>
  );
}
