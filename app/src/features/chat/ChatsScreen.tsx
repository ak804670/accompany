import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatListItem } from '@/components/chat/ChatListItem';
import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { chatService, type ConversationSummary } from '@/features/chat/chat.service';
import { ApiError } from '@/services/api';

type ChatsScreenProps = {
  onOpen: (item: ConversationSummary) => void;
};

export function ChatsScreen({ onOpen }: ChatsScreenProps) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (next?: string | null, replace = true) => {
    try {
      const result = await chatService.list(next);
      setItems((current) => (replace ? result.conversations : [...current, ...result.conversations]));
      setCursor(result.nextCursor);
      setError(null);
    } catch (caught) {
      setError(!(caught instanceof ApiError) || caught.status === 0 ? "You're offline" : "Couldn't load conversations");
    }
  }, []);

  useEffect(() => {
    void load(null, true).finally(() => setLoading(false));
  }, [load]);

  const visible = items.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 16 }}>
      <AppText variant="h2">Chats</AppText>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search conversations"
        accessibilityLabel="Search conversations"
        className="mt-md h-12 rounded-sm border border-input bg-background px-3 text-foreground"
      />
      {loading ? <AppText className="mt-xl" variant="bodyM" tone="muted">Loading conversations...</AppText> : (
        <FlatList
          className="mt-md"
          data={visible}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(null, true).finally(() => setRefreshing(false)); }} />}
          onEndReached={() => { if (cursor && !query.trim()) void load(cursor, false); }}
          ListEmptyComponent={
            <View className="mt-xl gap-sm">
              <AppText variant="h3">{error ?? 'No conversations yet'}</AppText>
              <AppText variant="bodyM" tone="muted">{error ? 'Try again in a moment.' : 'When you start talking with someone, it will appear here.'}</AppText>
              {error ? <AppButton variant="outline" onPress={() => void load(null, true)}>Try again</AppButton> : null}
            </View>
          }
          renderItem={({ item }) => <ChatListItem item={item} onPress={() => onOpen(item)} />}
        />
      )}
    </View>
  );
}
