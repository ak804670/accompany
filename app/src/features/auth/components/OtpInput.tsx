import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';

const length = 6;

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  resendAfter?: number;
  onResend?: () => void;
  resending?: boolean;
};

function slots(value: string) {
  return Array.from({ length }, (_, index) => value[index] ?? '');
}

export function OtpInput({
  value,
  onChange,
  invalid = false,
  disabled = false,
  resendAfter = 30,
  onResend,
  resending = false,
}: OtpInputProps) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const [remaining, setRemaining] = useState(resendAfter);

  useEffect(() => {
    if (resendAfter <= 0) {
      return;
    }

    const started = Date.now();
    const timer = setInterval(() => {
      const left = resendAfter - Math.floor((Date.now() - started) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(timer);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [resendAfter]);

  function write(index: number, text: string) {
    const digits = text.replace(/\D/g, '');

    if (digits.length > 1) {
      const next = digits.slice(0, length);
      onChange(next);
      inputs.current[Math.min(next.length, length - 1)]?.focus();
      return;
    }

    const next = slots(value);
    next[index] = digits;
    onChange(next.join('').replace(/\s/g, ''));

    if (digits && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function onKeyPress(index: number, key: string) {
    if (key !== 'Backspace' || value[index] || index === 0) {
      return;
    }

    const next = slots(value);
    next[index - 1] = '';
    onChange(next.join(''));
    inputs.current[index - 1]?.focus();
  }

  return (
    <View className="gap-md">
      <View className="flex-row justify-between gap-sm">
        {slots(value).map((digit, index) => (
          <TextInput
            key={index}
            ref={(node) => {
              inputs.current[index] = node;
            }}
            value={digit}
            onChangeText={(text) => write(index, text)}
            onKeyPress={(event) => onKeyPress(index, event.nativeEvent.key)}
            autoFocus={index === 0}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={index === 0 ? length : 1}
            editable={!disabled}
            selectTextOnFocus
            accessibilityLabel={`Digit ${index + 1}`}
            className={`h-14 flex-1 rounded-sm border text-center font-newsreader-medium text-h3 text-foreground ${
              invalid ? 'border-destructive' : 'border-input'
            } bg-background`}
          />
        ))}
      </View>
      <View className="gap-xs">
        <AppText variant="bodyS" tone="muted">
          Did not receive it?
        </AppText>
        {remaining > 0 ? (
          <AppText variant="bodyS">Resend in {remaining}s</AppText>
        ) : (
          <AppButton
            variant="outline"
            size="sm"
            disabled={disabled || !onResend}
            loading={resending}
            onPress={onResend}>
            Resend
          </AppButton>
        )}
      </View>
    </View>
  );
}
