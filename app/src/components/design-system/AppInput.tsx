import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type AppInputProps = ComponentProps<typeof Input> & {
  error?: string;
};

export function AppInput({ error, className, ...props }: AppInputProps) {
  return (
    <View className="gap-xs">
      <Input
        aria-invalid={Boolean(error)}
        className={cn(
          'rounded-sm font-inter-regular text-body-m',
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {error ? (
        <AppText variant="caption" tone="error">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
