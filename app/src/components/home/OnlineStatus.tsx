import { AppText } from '@/components/design-system/AppText';

export function OnlineStatus({ online = false, onCall }: { online?: boolean; onCall?: boolean }) {
  if (onCall) {
    return (
      <AppText variant="caption" tone="warning">
        ● On call
      </AppText>
    );
  }

  return (
    <AppText variant="caption" tone={online ? 'success' : 'muted'}>
      {online ? '● Online' : 'Offline'}
    </AppText>
  );
}
