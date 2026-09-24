import { View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { PersonAvatar } from '@/components/home/PersonAvatar';

export function ProfileHeader({ name, bio, userId }: { name: string; bio: string | null; userId?: string | null }) {
  return (
    <View className="mt-xl gap-md">
      <PersonAvatar userId={userId} name={name} size={96} />
      <AppText variant="h2">{name}</AppText>
      {bio ? <AppText variant="bodyM" tone="muted">{bio}</AppText> : null}
    </View>
  );
}
