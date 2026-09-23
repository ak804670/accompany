import { AppText } from '@/components/design-system/AppText';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const sizeClass = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-12',
} as const;

type AppAvatarProps = {
  fallback: string;
  source?: string;
  size?: keyof typeof sizeClass;
};

export function AppAvatar({ fallback, source, size = 'md' }: AppAvatarProps) {
  return (
    <Avatar alt={fallback} className={sizeClass[size]}>
      {source ? <AvatarImage source={{ uri: source }} /> : null}
      <AvatarFallback>
        <AppText variant="label">{fallback}</AppText>
      </AvatarFallback>
    </Avatar>
  );
}
