import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { AuthError } from '@/features/auth/components/AuthError';
import { AuthHeader } from '@/features/auth/components/AuthHeader';

const steps = ['basics', 'photo', 'about', 'interests', 'preferences', 'review'];

type OnboardingFrameProps = {
  step: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
};

export function OnboardingFrame({
  step,
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  loading = false,
  disabled = false,
  error,
}: OnboardingFrameProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }}>
      <View className="mb-lg flex-row gap-xs">
        {steps.map((name, index) => (
          <View key={name} className={`h-1 flex-1 ${index <= step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </View>
      <AuthHeader title={title} subtitle={subtitle} onBack={onBack} />
      <View className="mt-xl flex-1">{children}</View>
      {error ? <AuthError message={error} /> : null}
      <AppButton className="mt-md" loading={loading} disabled={disabled || loading} onPress={onContinue}>
        {continueLabel}
      </AppButton>
    </View>
  );
}
