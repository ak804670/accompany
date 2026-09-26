import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react-native';
import { useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/design-system/AppText';
import { Icon } from '@/components/ui/icon';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { callManager, type ActiveCall } from '@/features/calls/call-manager';
function useActiveCall(): ActiveCall | null {
  return useSyncExternalStore(
    (listener) => callManager.subscribe(listener),
    () => callManager.getCurrentCall(),
  );
}

export function ActiveCallScreen() {
  const call = useActiveCall();
  const insets = useSafeAreaInsets();
  if (!call || call.phase === 'ENDED' || call.phase === 'REJECTED' || call.phase === 'MISSED' || call.phase === 'FAILED' || call.phase === 'IDLE') {
    return null;
  }
  const status = call.phase === 'CONNECTED' ? 'Connected' : call.phase === 'CONNECTING' ? 'Connecting' : call.phase === 'ENDING' ? 'Ending' : 'Ringing';
  const medium = call.video ? 'Video call' : 'Voice call';
  return (
    <View className={call.video ? 'absolute inset-0 bg-foreground' : 'absolute inset-0 bg-background'} style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <View className="flex-1 items-center justify-center gap-md px-lg">
        {call.video ? (
          <View className="w-full flex-1 items-center justify-center rounded-md bg-foreground">
            <Icon as={call.cameraEnabled ? Video : VideoOff} className="size-8 text-background" />
          </View>
        ) : (
          <PersonAvatar name={call.name} size={120} />
        )}
        <AppText variant="h2" className={call.video ? 'text-background' : undefined}>{call.name}</AppText>
        <AppText variant="bodyM" className={call.video ? 'text-background' : undefined} tone={call.video ? 'default' : 'muted'}>{medium} · {status}</AppText>
      </View>
      <View className="flex-row items-center justify-center gap-lg px-lg">
        <RoundAction label={call.muted ? 'Unmute' : 'Mute'} icon={call.muted ? MicOff : Mic} onPress={() => callManager.mute(!call.muted)} light={call.video} />
        {call.video ? <RoundAction label={call.cameraEnabled ? 'Turn camera off' : 'Turn camera on'} icon={call.cameraEnabled ? Video : VideoOff} onPress={() => callManager.toggleCamera()} light /> : null}
        {call.phase === 'RINGING' && !call.outgoing ? (
          <RoundAction label="Decline" icon={PhoneOff} danger onPress={() => void callManager.rejectCall(call.id)} />
        ) : null}
        {call.phase === 'RINGING' && !call.outgoing ? (
          <RoundAction label="Accept" icon={Phone} onPress={() => void callManager.answerCall(call.id)} />
        ) : (
          <RoundAction label={call.outgoing && call.phase === 'RINGING' ? 'Cancel' : 'End call'} icon={PhoneOff} danger onPress={() => void callManager.endCall(call.id)} />
        )}
      </View>
    </View>
  );
}

function RoundAction({ label, icon, onPress, danger = false, light = false }: { label: string; icon: typeof Phone; onPress: () => void; danger?: boolean; light?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="items-center gap-xs">
      <View className={danger ? 'h-16 w-16 items-center justify-center rounded-full bg-destructive' : light ? 'h-16 w-16 items-center justify-center rounded-full bg-background' : 'h-16 w-16 items-center justify-center rounded-full bg-muted'}>
        <Icon as={icon} className={danger ? 'size-6 text-white' : 'size-6 text-foreground'} />
      </View>
      <AppText variant="caption" className={light ? 'text-background' : undefined}>{label}</AppText>
    </Pressable>
  );
}
