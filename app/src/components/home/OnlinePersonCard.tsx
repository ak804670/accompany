import { Pressable, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { OnlineStatus } from '@/components/home/OnlineStatus';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import type { OnlinePerson } from '@/features/home/people.service';

type OnlinePersonCardProps = {
  person: OnlinePerson;
  onPress: () => void;
};

export function OnlinePersonCard({ person, onPress }: OnlinePersonCardProps) {
  const title = person.age ? `${person.name}, ${person.age}` : person.name;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, online`}
      className="flex-row gap-md rounded-sm bg-card p-md"
      onPress={onPress}
    >
      <PersonAvatar userId={person.userId} name={person.name} />
      <View className="flex-1 gap-xs">
        <AppText variant="label">{title}</AppText>
        {person.bio ? <AppText variant="bodyS" tone="muted" numberOfLines={2}>{person.bio}</AppText> : null}
        <OnlineStatus online />
      </View>
    </Pressable>
  );
}
