import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';

import { AuthError } from '@/features/auth/components/AuthError';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { AuthStackParamList } from '@/features/auth/navigation';

type VerifyOtpScreenProps = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

export function maskDestination(channel: 'phone' | 'email', destination: string) {
  if (channel === 'email') {
    const [name, domain] = destination.split('@');
    return `${name?.slice(0, 1) ?? '*'}***@${domain ?? ''}`;
  }

  const match = destination.match(/^(\+\d{1,3})(\d+)$/);
  if (!match?.[1] || !match[2]) {
    return 'your phone';
  }

  return `${match[1]} •••• ${match[2].slice(-4)}`;
}

export function VerifyOtpScreen({ navigation, route }: VerifyOtpScreenProps) {
  const insets = useSafeAreaInsets();
  const { channel, destination } = route.params;
  const { status, error, verifyOtp, requestOtp } = useAuth();
  const [code, setCode] = useState('');
  const [resendAfter, setResendAfter] = useState(route.params.resendAfter);
  const [resendCycle, setResendCycle] = useState(0);
  const [resent, setResent] = useState(false);
  const verifying = status === 'verifyingOtp';
  const resending = status === 'requestingOtp';
  const locked = error?.code === 'OTP_TOO_MANY_ATTEMPTS';

  async function resend() {
    setResent(false);
    try {
      const result = await requestOtp(channel, destination);
      setCode('');
      setResendAfter(result.resendAfter);
      setResendCycle((value) => value + 1);
      setResent(true);
    } catch {
      // The auth provider stores the safe error message.
    }
  }

  return (
    <View
      className="flex-1 gap-xl bg-background px-lg"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <AuthHeader
        title="Enter verification code"
        subtitle={`We sent a verification code to ${maskDestination(channel, destination)}`}
        onBack={() => navigation.goBack()}
      />
      <OtpInput
        key={resendCycle}
        value={code}
        onChange={setCode}
        invalid={error?.code === 'INVALID_OTP' || error?.code === 'OTP_EXPIRED'}
        disabled={verifying || locked}
        resendAfter={resendAfter}
        resending={resending}
        onResend={() => void resend()}
      />
      {resent ? (
        <AppText variant="bodyS" tone="success">
          A new code was sent.
        </AppText>
      ) : null}
      <AuthError message={error?.message ?? null} />
      <AppButton
        size="full"
        loading={verifying}
        disabled={verifying || locked || code.length !== 6}
        onPress={() => void verifyOtp(channel, destination, code)}>
        Verify
      </AppButton>
    </View>
  );
}
