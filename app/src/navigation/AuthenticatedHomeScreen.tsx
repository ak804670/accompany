import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { BrandLogo } from '@/components/design-system/BrandLogo';
import { useAuth } from '@/features/auth';

export function AuthenticatedHomeScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);

  return (
    <View
      testID="authenticated-home"
      className="flex-1 justify-between bg-background px-lg"
      style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }}>
      <View className="gap-md">
        <BrandLogo size="md" />
        <AppText variant="h1">You are in</AppText>
        <AppText variant="bodyL" tone="muted">
          Find someone you might enjoy talking with.
        </AppText>
      </View>
      <AppButton
        variant="outline"
        loading={pending}
        disabled={pending}
        onPress={() => {
          setPending(true);
          void logout();
        }}>
        Log out
      </AppButton>
    </View>
  );
}
