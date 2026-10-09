import { Text, View } from 'react-native';

import { cn } from '@/lib/utils';

export type UnreadBadgeProps = {
  count: number;
  size?: 'sm' | 'md';
  variant?: 'solid' | 'subtle';
  className?: string;
  testID?: string;
};

export function UnreadBadge({
  count,
  size = 'md',
  variant = 'solid',
  className,
  testID,
}: UnreadBadgeProps) {
  if (count <= 0) {
    return null;
  }

  const label = count > 99 ? '99+' : `${count}`;
  const isSm = size === 'sm';

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`${count} unread`}
      className={cn(
        'items-center justify-center rounded-full',
        variant === 'solid' ? 'bg-primary' : 'bg-primary/20 dark:bg-primary/30',
        isSm ? 'h-[18px] min-w-[18px] px-1' : 'h-5 min-w-[20px] px-1.5',
        className
      )}
    >
      <Text
        style={{ includeFontPadding: false }}
        className={cn(
          'text-center font-inter-bold leading-none',
          variant === 'solid' ? 'text-white' : 'text-primary',
          isSm ? 'text-[10px]' : 'text-[11px]'
        )}
      >
        {label}
      </Text>
    </View>
  );
}

