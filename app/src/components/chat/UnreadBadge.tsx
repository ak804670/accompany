import { AppText } from '@/components/design-system/AppText';

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }
  return (
    <AppText variant="caption" accessibilityLabel={`${count} unread`}>
      {count > 99 ? '99+' : count}
    </AppText>
  );
}
