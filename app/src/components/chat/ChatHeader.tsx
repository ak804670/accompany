import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { OnlineStatus } from '@/components/home/OnlineStatus';
import { PersonAvatar } from '@/components/home/PersonAvatar';

type ChatHeaderProps = {
  name: string;
  personId?: string | null;
  online: boolean;
  onBack: () => void;
  actions?: ReactNode;
};

export function ChatHeader({ name, personId, online, onBack, actions }: ChatHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center gap-sm border-b border-nav-border bg-nav px-sm pb-2"
      style={{ paddingTop: insets.top + 8 }}
    >
      <AppIconButton icon="back" size="lg" accessibilityLabel="Go back" onPress={onBack} />
      <PersonAvatar userId={personId} name={name} size={40} />
      <View className="flex-1">
        <AppText variant="label">{name}</AppText>
        <OnlineStatus online={online} />
      </View>
      {actions}
    </View>
  );
}
