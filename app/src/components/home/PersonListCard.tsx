import { Pressable, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { AppText } from '@/components/design-system/AppText';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { formatDistance } from '@/features/home/discovery';
import type { OnlinePerson } from '@/features/home/people.service';

type PersonListCardProps = {
  person: OnlinePerson;
  onPress: () => void;
};

export function PersonListCard({ person, onPress }: PersonListCardProps) {
  const distance = formatDistance(person.distanceKm);
  const interests = person.sharedInterests.length > 0 ? person.sharedInterests : person.interests;
  const isOnline = Boolean(person.online);
  const isOnCall = Boolean(person.onCall);
  const subtitle = [
    person.age ? `${person.age} yrs` : null,
    distance ?? null,
  ].filter(Boolean).join(' • ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${person.name}, view profile`}
      className="flex-row items-center gap-md rounded-xl border border-border bg-card p-sm active:opacity-80"
      onPress={onPress}
    >
      <View className="relative h-28 w-24 overflow-hidden rounded-lg bg-muted">
        <PersonAvatar userId={person.userId} name={person.name} fill />
        <View className="absolute bottom-1.5 left-1.5 flex-row items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: isOnCall ? '#EB9E1F' : isOnline ? '#39C76A' : '#9CA3AF' }}
          />
          <AppText variant="caption" className="text-[10px] font-medium text-white">
            {isOnCall ? 'On call' : isOnline ? 'Online' : 'Offline'}
          </AppText>
        </View>
      </View>
      <View className="flex-1 justify-center gap-1">
        <View className="flex-row items-center justify-between">
          <AppText variant="h3" numberOfLines={1} className="flex-1 pr-1">{person.name}</AppText>
          {person.rating && person.rating.count > 0 ? (
            <View className="flex-row items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5">
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <AppText variant="caption" className="text-[11px] font-semibold text-amber-500">
                {person.rating.average.toFixed(1)}
              </AppText>
              <AppText variant="caption" tone="muted" className="text-[10px]">
                ({person.rating.count})
              </AppText>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <AppText variant="bodyS" tone="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
        {interests.length > 0 ? (
          <View className="mt-1 flex-row flex-wrap gap-1">
            {interests.slice(0, 3).map((interest) => (
              <View key={interest} className="rounded-full bg-muted/80 px-2 py-0.5">
                <AppText variant="caption" tone="muted">{interest}</AppText>
              </View>
            ))}
          </View>
        ) : null}
        {person.bio ? (
          <AppText variant="caption" tone="muted" numberOfLines={1} className="mt-0.5">
            {person.bio}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

