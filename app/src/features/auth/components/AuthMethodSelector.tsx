import { Pressable, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';

import type { AuthChannel } from '@/features/auth/types';

type AuthMethodSelectorProps = {
  method: AuthChannel;
  onChange: (method: AuthChannel) => void;
  disabled?: boolean;
};

const methods: { id: AuthChannel; label: string }[] = [
  { id: 'phone', label: 'Phone' },
  { id: 'email', label: 'Email' },
];

export function AuthMethodSelector({ method, onChange, disabled }: AuthMethodSelectorProps) {
  return (
    <View className="flex-row gap-lg">
      {methods.map((item) => {
        const selected = method === item.id;

        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(item.id)}
            className="pb-sm">
            <AppText variant="label" tone={selected ? 'default' : 'muted'}>
              {item.label}
            </AppText>
            <View className={`mt-sm h-px ${selected ? 'bg-primary' : 'bg-transparent'}`} />
          </Pressable>
        );
      })}
    </View>
  );
}
