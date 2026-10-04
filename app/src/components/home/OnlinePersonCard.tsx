import { Pressable, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { OnlineStatus } from '@/components/home/OnlineStatus';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { formatDistance, formatRate } from '@/features/home/discovery';
import type { OnlinePerson } from '@/features/home/people.service';

type OnlinePersonCardProps = {
  person: OnlinePerson;
  onPress: () => void;
};

export function OnlinePersonCard({ person, onPress }: OnlinePersonCardProps) {
  const distance = formatDistance(person.distanceKm);
  const interests = person.sharedInterests.length > 0 ? person.sharedInterests : person.interests;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${person.name}, tap to view profile`}
      accessibilityHint="Opens the full profile"
      className="flex-1 overflow-hidden rounded-md border border-border bg-card"
      onPress={onPress}
    >
      <View className="min-h-0 flex-1 bg-muted">
        <PersonAvatar userId={person.userId} name={person.name} fill />
      </View>
      <View className="gap-sm p-md">
        <View className="gap-xs">
          <AppText variant="h3">{person.name}</AppText>
          <OnlineStatus online={person.online} onCall={person.onCall} />
          {distance ? <AppText variant="caption" tone="muted">{distance}</AppText> : null}
        </View>
        {person.bio ? <AppText variant="bodyS" tone="muted" numberOfLines={3}>{person.bio}</AppText> : null}
        {interests.length > 0 ? (
          <View className="flex-row flex-wrap gap-xs">
            {interests.slice(0, 4).map((interest) => (
              <View key={interest} className="rounded-full bg-muted px-sm py-xs">
                <AppText variant="caption">{interest}</AppText>
              </View>
            ))}
          </View>
        ) : null}
        <View className="flex-row gap-md border-t border-border pt-sm">
          <View className="flex-1 gap-xs">
            <AppText variant="caption" tone="muted">Audio</AppText>
            <AppText variant="label">{formatRate(person.rates.audio, 'min')}</AppText>
          </View>
          <View className="flex-1 gap-xs">
            <AppText variant="caption" tone="muted">Video</AppText>
            <AppText variant="label">{formatRate(person.rates.video, 'min')}</AppText>
          </View>
        </View>
        <AppText variant="caption" tone="muted">Tap to view profile</AppText>
      </View>
    </Pressable>
  );
}
