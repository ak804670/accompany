import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { demoProfilePhoto } from '@/assets/photos/demo-profiles';
import { cachedPhoto, loadPhoto } from '@/components/home/photo-cache';
import { AppText } from '@/components/design-system/AppText';
import { peopleService } from '@/features/home/people.service';

type PersonAvatarProps = {
  userId?: string | null;
  name: string;
  size?: number;
  wide?: boolean;
  fill?: boolean;
};

export function PersonAvatar({ userId, name, size = 64, wide = false, fill = false }: PersonAvatarProps) {
  const [uri, setUri] = useState<string | null>(userId ? cachedPhoto(userId) ?? null : null);

  useEffect(() => {
    if (!userId) return;
    const cached = cachedPhoto(userId);
    if (cached !== undefined) {
      setUri(cached);
      return;
    }
    let cancelled = false;
    void loadPhoto(userId, () => peopleService.photo(userId)).then((value) => {
      if (!cancelled) setUri(value);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const demo = userId ? demoProfilePhoto(userId) : undefined;
  const frame = fill
    ? { width: '100%' as const, height: '100%' as const }
    : wide
      ? { width: '100%' as const, height: size }
      : { width: size, height: size, borderRadius: 8 };

  return (
    <View className="items-center justify-center overflow-hidden bg-muted" style={frame}>
      {uri ? (
        <Image accessibilityIgnoresInvertColors source={{ uri }} style={frame} />
      ) : demo ? (
        <Image accessibilityIgnoresInvertColors accessibilityLabel="" source={demo} style={frame} />
      ) : (
        <AppText variant="h3">{name.slice(0, 1).toUpperCase()}</AppText>
      )}
    </View>
  );
}
