import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { AuthError } from '@/features/auth/components/AuthError';
import { AuthHeader } from '@/features/auth/components/AuthHeader';

const steps = ['basics', 'gender', 'location', 'photo', 'about', 'interests', 'preferences', 'almostIn'];

type OnboardingFrameProps = {
  step: number;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  onSkip?: () => void;
  skipLabel?: string;
  onClose?: () => void;
  hideHeader?: boolean;
  hideProgressBar?: boolean;
  footer?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
};

export function OnboardingFrame({
  step,
  title = '',
  subtitle,
  children,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  onSkip,
  skipLabel = 'Skip for now',
  onClose,
  hideHeader = false,
  hideProgressBar = false,
  footer,
  loading = false,
  disabled = false,
  error,
}: OnboardingFrameProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
      {!hideProgressBar ? (
        <View className="mb-md flex-row items-center justify-between gap-md">
          <View className="flex-1 flex-row gap-xs">
            {steps.map((name, index) => (
              <View key={name} className={`h-1 flex-1 ${index <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </View>
          {onClose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full bg-foreground/10 active:bg-foreground/20"
            >
              <AppText variant="bodyM" className="font-bold text-foreground">×</AppText>
            </Pressable>
          ) : onSkip ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip"
              hitSlop={8}
              onPress={onSkip}
              disabled={loading}
            >
              <AppText variant="label" tone="primary">
                Skip
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {!hideHeader && title ? <AuthHeader title={title} subtitle={subtitle} /> : null}
      <View className="mt-lg flex-1">{children}</View>
      {error ? <AuthError message={error} /> : null}
      {footer ? (
        footer
      ) : (
        <View className="mt-md gap-sm">
          {onBack ? (
            <AppButton
              variant="outline"
              disabled={loading}
              onPress={onBack}
            >
              Back
            </AppButton>
          ) : null}
          {onContinue ? (
            <AppButton
              loading={loading}
              disabled={disabled || loading}
              onPress={onContinue}
            >
              {continueLabel}
            </AppButton>
          ) : null}
          {onSkip ? (
            <AppButton
              variant="ghost"
              disabled={loading}
              onPress={onSkip}
            >
              {skipLabel}
            </AppButton>
          ) : null}
        </View>
      )}
    </View>
  );
}
