import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { peopleService } from '@/features/home/people.service';

type PersonAvatarProps = {
  userId?: string | null;
  name: string;
  size?: number;
};

export function PersonAvatar({ userId, name, size = 64 }: PersonAvatarProps) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    peopleService.photo(userId).then((value) => {
      if (!cancelled) setUri(value);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <View className="items-center justify-center overflow-hidden rounded-sm bg-muted" style={{ width: size, height: size }}>
      {uri ? (
        <Image accessibilityIgnoresInvertColors source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <AppText variant="h3">{name.slice(0, 1).toUpperCase()}</AppText>
      )}
    </View>
  );
}
