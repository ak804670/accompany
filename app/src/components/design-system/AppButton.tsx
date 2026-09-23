import { Check } from 'lucide-react-native';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { palette, useTheme } from '@/theme';

export type AppButtonVariant =
  'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'link' | 'icon';

export type AppButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'full';

export type AppButtonProps = Omit<
  ComponentProps<typeof Button>,
  'variant' | 'size' | 'children'
> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  status?: 'default' | 'success';
  children?: ReactNode;
};

const filledVariants = new Set<AppButtonVariant>(['primary', 'destructive', 'success']);

function mapVariant(variant: AppButtonVariant): ComponentProps<typeof Button>['variant'] {
  switch (variant) {
    case 'primary':
    case 'success':
      return 'default';
    case 'icon':
      return 'ghost';
    default:
      return variant;
  }
}

function mapSize(size: AppButtonSize, variant: AppButtonVariant) {
  if (variant === 'icon') {
    if (size === 'xs' || size === 'sm') {
      return { size: 'icon' as const, className: 'h-8 w-8' };
    }

    if (size === 'lg') {
      return { size: 'icon' as const, className: 'h-12 w-12' };
    }

    if (size === 'full') {
      return { size: 'default' as const, className: 'w-full' };
    }

    return { size: 'icon' as const, className: '' };
  }

  switch (size) {
    case 'xs':
      return { size: 'sm' as const, className: 'h-8 px-2' };
    case 'sm':
      return { size: 'sm' as const, className: '' };
    case 'lg':
      return { size: 'lg' as const, className: '' };
    case 'full':
      return { size: 'lg' as const, className: 'h-12 w-full' };
    default:
      return { size: 'default' as const, className: '' };
  }
}

function indicatorColor(variant: AppButtonVariant, scheme: 'light' | 'dark') {
  if (variant === 'destructive') {
    return '#FFFFFF';
  }

  if (filledVariants.has(variant)) {
    return palette[scheme].primaryForeground;
  }

  return palette[scheme].text;
}

export function AppButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  status = 'default',
  disabled,
  className,
  children,
  accessibilityState,
  ...props
}: AppButtonProps) {
  const { resolvedScheme } = useTheme();
  const visualVariant = status === 'success' ? 'success' : variant;
  const mappedSize = mapSize(size, visualVariant === 'icon' ? 'icon' : variant);
  const isDisabled = Boolean(disabled) || loading || status === 'success';

  return (
    <Button
      variant={mapVariant(visualVariant)}
      size={mappedSize.size}
      disabled={isDisabled}
      accessibilityState={{
        ...accessibilityState,
        disabled: isDisabled,
        busy: loading,
      }}
      className={cn(
        visualVariant === 'success' && 'bg-success active:bg-success/90',
        mappedSize.className,
        className
      )}
      {...props}>
      {loading ? (
        <ActivityIndicator color={indicatorColor(visualVariant, resolvedScheme)} size="small" />
      ) : null}
      {status === 'success' && !loading ? <Icon as={Check} className="size-4" /> : null}
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Button>
  );
}
