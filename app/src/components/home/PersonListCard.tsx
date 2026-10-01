import { Pressable, View } from 'react-native';

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
  const isOnline = person.online !== false;
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
            style={{ backgroundColor: isOnline ? '#39C76A' : '#9CA3AF' }}
          />
          <AppText variant="caption" className="text-[10px] font-medium text-white">
            {isOnline ? 'Online' : 'Offline'}
          </AppText>
        </View>
      </View>
      <View className="flex-1 justify-center gap-1">
        <AppText variant="h3" numberOfLines={1}>{person.name}</AppText>
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

