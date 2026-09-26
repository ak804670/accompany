import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AccompanyIllustration, type IllustrationMotion } from '@/components/illustrations/AccompanyIllustration';
import { AppText } from '@/components/design-system/AppText';
import type { IllustrationName } from '@/assets/illustrations/illustrationRegistry';

type IllustratedStateProps = {
  name: IllustrationName;
  title: string;
  body?: string;
  motion?: IllustrationMotion;
  size?: number;
  children?: ReactNode;
};

export function IllustratedState({ name, title, body, motion = 'none', size = 160, children }: IllustratedStateProps) {
  return (
    <View className="items-center gap-sm px-md py-lg">
      <AccompanyIllustration name={name} size={size} motion={motion} />
      <AppText className="text-center" variant="h3">{title}</AppText>
      {body ? <AppText className="text-center" variant="bodyM" tone="muted">{body}</AppText> : null}
      {children}
    </View>
  );
}
