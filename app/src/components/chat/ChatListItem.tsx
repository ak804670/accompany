import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { UnreadBadge } from '@/components/chat/UnreadBadge';
import { AppText } from '@/components/design-system/AppText';
import { OnlineStatus } from '@/components/home/OnlineStatus';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import type { ConversationSummary } from '@/features/chat/chat.service';
import { getGiphyMessageUrl } from '@/features/chat/giphy';

function when(value: string | null): string {
  if (!value) return '';
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export function ChatListItem({ item, onPress }: { item: ConversationSummary; onPress: () => void }) {
  const [, setClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setClock((value) => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.name} className="flex-row items-center gap-md py-md" onPress={onPress}>
      <PersonAvatar userId={item.personId} name={item.name} size={48} />
      <View className="flex-1 gap-xs">
        <View className="flex-row items-center justify-between">
          <AppText variant="label">{item.name}</AppText>
          <AppText variant="caption" tone="muted">{when(item.updatedAt)}</AppText>
        </View>
        <View className="flex-row items-center justify-between gap-sm">
          <AppText variant="bodyS" tone={item.unreadCount > 0 ? 'default' : 'muted'} numberOfLines={1} className="flex-1">
            {item.preview == null ? 'Say hello' : getGiphyMessageUrl(item.preview) ? 'GIF' : item.preview}
          </AppText>
          <UnreadBadge count={item.unreadCount} />
        </View>
        {item.blocked ? <AppText variant="caption" tone="muted">Blocked</AppText> : item.onCall ? <OnlineStatus onCall /> : item.online ? <OnlineStatus online /> : null}
      </View>
    </Pressable>
  );
}
