import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { View } from 'react-native';
import PhoneInput, {
  getCountryByCca2,
  isValidPhoneNumber,
  type ICountry,
} from 'react-native-international-phone-number';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppInput } from '@/components/design-system/AppInput';
import { AppText } from '@/components/design-system/AppText';

import { AuthError } from '@/features/auth/components/AuthError';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { AuthMethodSelector } from '@/features/auth/components/AuthMethodSelector';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { AuthStackParamList } from '@/features/auth/navigation';
import type { AuthChannel } from '@/features/auth/types';
import { palette, useTheme } from '@/theme';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const e164 = /^\+[1-9]\d{7,14}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function phoneDestination(country: ICountry | null, phone: string): string | null {
  if (!country || !isValidPhoneNumber(phone, country)) {
    return null;
  }

  const value = `${country.idd.root}${phone.replace(/\D/g, '')}`;
  return e164.test(value) ? value : null;
}

export function LoginScreen({ navigation, route }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { status, error, requestOtp, clearError } = useAuth();
  const { resolvedScheme } = useTheme();
  const colors = palette[resolvedScheme];
  const [method, setMethod] = useState<AuthChannel>(route.params.method);
  const [country, setCountry] = useState<ICountry | null>(getCountryByCca2('IN') ?? null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const loading = status === 'requestingOtp';

  async function continueWithMethod() {
    const destination =
      method === 'email'
        ? emailPattern.test(email.trim().toLowerCase())
          ? email.trim().toLowerCase()
          : null
        : phoneDestination(country, phone);
    if (!destination) {
      setFieldError(method === 'email' ? 'Enter a valid email.' : 'Enter a valid phone number.');
      return;
    }

    setFieldError(null);

    try {
      const result = await requestOtp(method, destination);
      navigation.navigate('VerifyOtp', {
        channel: method,
        destination,
        resendAfter: result.resendAfter,
      });
    } catch {
      // The auth provider stores the safe error message.
    }
  }

  return (
    <View
      className="flex-1 gap-xl bg-background px-lg"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <AuthHeader title="Continue" subtitle="We'll text or email you a verification code." onBack={() => navigation.goBack()} />
      <AuthMethodSelector
        method={method}
        disabled={loading}
        onChange={(next) => {
          clearError();
          setFieldError(null);
          setMethod(next);
        }}
      />
      {method === 'phone' ? (
        <View className="gap-sm">
          <AppText variant="label">Phone</AppText>
          <PhoneInput
            value={phone}
            onChangePhoneNumber={setPhone}
            selectedCountry={country}
            onChangeSelectedCountry={setCountry}
            defaultCountry="IN"
            theme={resolvedScheme}
            disabled={loading}
            modalType="bottomSheet"
            popularCountries={['IN', 'US', 'GB', 'AE']}
            accessibilityLabelPhoneInput="Phone number"
            phoneInputPlaceholderTextColor={colors.textMuted}
            phoneInputSelectionColor={colors.primary}
            phoneInputStyles={{
              container: {
                backgroundColor: colors.surface,
                borderColor: fieldError ? colors.error : colors.border,
                borderRadius: 4,
              },
              flagContainer: {
                backgroundColor: colors.surface,
              },
              callingCode: {
                color: colors.text,
                fontFamily: 'Inter_500Medium',
                fontSize: 15,
              },
              input: {
                color: colors.text,
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
              },
              divider: {
                backgroundColor: colors.border,
              },
              caret: {
                color: colors.textMuted,
                fontSize: 8,
              },
            }}
          />
          {fieldError ? (
            <AppText variant="caption" tone="error">
              {fieldError}
            </AppText>
          ) : null}
        </View>
      ) : (
        <View className="gap-sm">
          <AppText variant="label">Email</AppText>
          <AppInput
            accessibilityLabel="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!loading}
            error={fieldError ?? undefined}
          />
        </View>
      )}
      <AuthError message={error?.message ?? null} />
      <AppButton size="full" loading={loading} disabled={loading} onPress={() => void continueWithMethod()}>
        Continue
      </AppButton>
    </View>
  );
}
