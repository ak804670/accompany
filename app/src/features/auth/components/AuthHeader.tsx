import { ChevronLeft } from 'lucide-react-native';
import { View } from 'react-native';

import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
};

export function AuthHeader({ title, subtitle, onBack }: AuthHeaderProps) {
  return (
    <View className="gap-sm">
      {onBack ? (
        <AppIconButton icon={ChevronLeft} accessibilityLabel="Go back" onPress={onBack} />
      ) : null}
      <AppText variant="h1">{title}</AppText>
      {subtitle ? (
        <AppText variant="bodyM" tone="muted">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}
