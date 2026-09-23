import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';

import type { AuthStackParamList } from '@/features/auth/navigation';

type WelcomeScreenProps = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 justify-between bg-background px-lg"
      style={{ paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }}>
      <View className="gap-lg">
        <AppText variant="caption" tone="muted">
          Accompany
        </AppText>
        <AppText variant="display">Sometimes you just want someone around.</AppText>
        <AppText variant="bodyL" tone="muted">
          Find people to talk to, share interests with, and spend time with.
        </AppText>
      </View>
      <View className="gap-sm">
        <AppButton size="full" onPress={() => navigation.navigate('Login', { method: 'phone' })}>
          Continue with Phone
        </AppButton>
        <AppButton
          variant="outline"
          size="full"
          onPress={() => navigation.navigate('Login', { method: 'email' })}>
          Continue with Email
        </AppButton>
        <AppText variant="caption" tone="muted" className="pt-sm">
          By continuing you agree to the Terms and Privacy Policy.
        </AppText>
      </View>
    </View>
  );
}
