import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BrandIconName } from '@/assets/icons/registry';
import { UnreadBadge } from '@/components/chat/UnreadBadge';
import { AppText } from '@/components/design-system/AppText';
import { BrandIcon } from '@/components/icons/BrandIcon';
import { NavBarGradient } from '@/components/navigation/NavBarGradient';

export type MainTab = 'home' | 'chats' | 'profile';

const items: Array<{ id: MainTab; label: string; icon: BrandIconName }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'chats', label: 'Chats', icon: 'chat' },
  { id: 'profile', label: 'Profile', icon: 'profile' },
];

type BottomNavigationProps = {
  value: MainTab;
  unread: number;
  onChange: (tab: MainTab) => void;
};

export function BottomNavigation({ value, unread, onChange }: BottomNavigationProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="relative overflow-hidden flex-row border-t border-nav-border px-sm pt-xs"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <NavBarGradient />
      {items.map((item) => {
        const active = value === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            className={`min-h-14 flex-1 items-center justify-center gap-xs rounded-sm ${active ? 'bg-primary-lighter/30 dark:bg-primary/20' : ''}`}
            onPress={() => onChange(item.id)}
          >
            <BrandIcon name={item.icon} size={22} />
            <AppText variant="caption" tone={active ? 'primary' : 'muted'}>{item.label}</AppText>
            {item.id === 'chats' && unread > 0 ? <UnreadBadge count={unread} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
