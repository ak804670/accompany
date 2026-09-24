import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';

export function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-xs border-t border-border py-md">
      <AppText variant="label">{title}</AppText>
      {children}
    </View>
  );
}
