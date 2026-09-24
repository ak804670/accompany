import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { OnlinePersonCard } from '@/components/home/OnlinePersonCard';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { peopleService, type OnlinePerson } from '@/features/home/people.service';
import { ApiError } from '@/services/api';

type HomeScreenProps = {
  onOpenPerson: (userId: string) => void;
};

function greeting(name: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${period}, ${name}`;
}

function isOffline(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status === 0;
}

export function HomeScreen({ onOpenPerson }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [people, setPeople] = useState<OnlinePerson[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async (next?: string | null, replace = true) => {
    try {
      const result = await peopleService.online(next);
      setPeople((current) => (replace ? result.people : [...current, ...result.people]));
      setCursor(result.nextCursor);
      setError(null);
      setOffline(false);
    } catch (caught) {
      const lost = isOffline(caught);
      setOffline(lost);
      setError(lost ? "You're offline" : "Couldn't load people");
    }
  }, []);

  useEffect(() => {
    void load(null, true).finally(() => setLoading(false));
  }, [load]);

  const name = profile?.displayName?.trim() || 'there';

  return (
    <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 16 }}>
      <AppText variant="h2">{greeting(name)}</AppText>
      <AppText variant="bodyM" tone="muted" className="mt-xs">People online now</AppText>
      {offline ? <AppText className="mt-sm" variant="caption" tone="warning">You're offline</AppText> : null}
      {loading ? (
        <View className="mt-xl gap-md">
          <View className="h-20 rounded-sm bg-muted" />
          <View className="h-20 rounded-sm bg-muted" />
          <AppText variant="caption" tone="muted">Loading people...</AppText>
        </View>
      ) : (
        <FlatList
          className="mt-lg"
          data={people}
          keyExtractor={(item) => item.userId}
          contentContainerClassName="gap-md pb-lg"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(null, true).finally(() => setRefreshing(false)); }} />}
          onEndReached={() => { if (cursor) void load(cursor, false); }}
          ListEmptyComponent={
            <View className="mt-xl gap-sm">
              <AppText variant="h3">{error ?? 'No one is available right now'}</AppText>
              <AppText variant="bodyM" tone="muted">
                {error ? 'Try again in a moment.' : 'Check back soon or explore again in a little while.'}
              </AppText>
              {error ? <AppButton variant="outline" onPress={() => void load(null, true)}>Try again</AppButton> : null}
            </View>
          }
          renderItem={({ item }) => <OnlinePersonCard person={item} onPress={() => onOpenPerson(item.userId)} />}
        />
      )}
    </View>
  );
}
