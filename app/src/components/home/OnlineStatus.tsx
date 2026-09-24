import { AppText } from '@/components/design-system/AppText';

export function OnlineStatus({ online }: { online: boolean }) {
  return (
    <AppText variant="caption" tone={online ? 'success' : 'muted'}>
      {online ? '● Online' : 'Offline'}
    </AppText>
  );
}
