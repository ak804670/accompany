import { View } from 'react-native';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';

type CallingStateProps = {
  name: string;
  video: boolean;
  outgoing: boolean;
  connected: boolean;
  onCancel: () => void;
  onDecline: () => void;
  onAccept: () => void;
  onEnd: () => void;
};

export function CallingState({ name, video, outgoing, connected, onCancel, onDecline, onAccept, onEnd }: CallingStateProps) {
  const medium = video ? 'Video call' : 'Voice call';
  return (
    <View className="mx-md mb-sm gap-sm rounded-sm border border-border bg-card p-md">
      <AppText variant="label">{outgoing ? `Calling ${name}` : `${name} is calling`}</AppText>
      <AppText variant="bodyS" tone="muted">{medium} · {connected ? 'Connected' : 'Ringing'}</AppText>
      {connected ? (
        <AppButton variant="outline" onPress={onEnd}>End</AppButton>
      ) : outgoing ? (
        <AppButton variant="outline" onPress={onCancel}>Cancel</AppButton>
      ) : (
        <View className="flex-row gap-sm">
          <AppButton variant="outline" className="flex-1" onPress={onDecline}>Decline</AppButton>
          <AppButton className="flex-1" onPress={onAccept}>Accept</AppButton>
        </View>
      )}
    </View>
  );
}
