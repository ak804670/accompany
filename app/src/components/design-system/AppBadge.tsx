import type { ReactNode } from 'react';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type AppBadgeTone = 'primary' | 'secondary' | 'outline' | 'success' | 'warning' | 'error';

const toneVariant: Record<AppBadgeTone, NonNullable<BadgeProps['variant']>> = {
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  success: 'default',
  warning: 'default',
  error: 'destructive',
};

const toneClassName: Record<AppBadgeTone, string> = {
  primary: '',
  secondary: '',
  outline: '',
  success: 'border-transparent bg-success',
  warning: 'border-transparent bg-warning',
  error: '',
};

type AppBadgeProps = {
  children: ReactNode;
  tone?: AppBadgeTone;
};

export function AppBadge({ children, tone = 'primary' }: AppBadgeProps) {
  return (
    <Badge variant={toneVariant[tone]} className={toneClassName[tone]}>
      <Text className={cn(tone === 'warning' && 'text-foreground')}>{children}</Text>
    </Badge>
  );
}
