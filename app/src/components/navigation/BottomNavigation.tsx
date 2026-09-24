import { House, MessageCircle, User } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UnreadBadge } from '@/components/chat/UnreadBadge';
import { AppText } from '@/components/design-system/AppText';
import { Icon } from '@/components/ui/icon';

export type MainTab = 'home' | 'chats' | 'profile';

const items: Array<{ id: MainTab; label: string; icon: typeof House }> = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'chats', label: 'Chats', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: User },
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
      className="flex-row border-t border-border bg-background px-sm pt-xs"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            className={`min-h-14 flex-1 items-center justify-center gap-xs rounded-sm ${active ? 'bg-muted' : ''}`}
            onPress={() => onChange(item.id)}
          >
            <Icon as={item.icon} size={22} className={active ? 'text-primary' : 'text-muted-foreground'} />
            <AppText variant="caption" tone={active ? 'primary' : 'muted'}>{item.label}</AppText>
            {item.id === 'chats' && unread > 0 ? <UnreadBadge count={unread} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
