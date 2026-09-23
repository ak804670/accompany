import { View } from 'react-native';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { useTheme, type ThemePreference } from '@/theme';

const themeOptions: ThemePreference[] = ['light', 'dark', 'system'];

export function FoundationScreen() {
  const { preference, setPreference } = useTheme();

  return (
    <View className="flex-1 gap-lg bg-background px-md py-lg">
      <View className="gap-sm">
        <AppText variant="h1">Accompany</AppText>
        <AppText variant="bodyM" tone="muted">
          Foundation
        </AppText>
      </View>
      <View className="flex-row gap-sm">
        {themeOptions.map((option) => (
          <AppButton
            key={option}
            variant={preference === option ? 'primary' : 'outline'}
            size="sm"
            onPress={() => setPreference(option)}>
            {option}
          </AppButton>
        ))}
      </View>
      <AppButton variant="primary" size="md">
        Continue
      </AppButton>
    </View>
  );
}
