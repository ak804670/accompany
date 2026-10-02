import { VideoOff } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { Icon } from '@/components/ui/icon';

export type VideoCallViewProps = {
  name: string;
  userId?: string | null;
  cameraEnabled: boolean;
  remoteCameraEnabled?: boolean;
  isFrontCamera?: boolean;
  onFlipCamera?: () => void;
  onToggleOverlay?: () => void;
};

export function VideoCallView({
  name,
  userId,
  cameraEnabled,
  remoteCameraEnabled = true,
  onFlipCamera,
  onToggleOverlay,
}: VideoCallViewProps) {
  return (
    <Pressable className="flex-1 bg-black" onPress={onToggleOverlay}>
      {/* Remote Participant Stream / Fallback */}
      {remoteCameraEnabled ? (
        <View className="flex-1 items-center justify-center bg-zinc-950">
          {/* WebRTC VideoTrack render container */}
          <View className="h-full w-full items-center justify-center bg-zinc-900">
            <PersonAvatar userId={userId} name={name} size={120} />
            <AppText variant="caption" className="mt-3 text-white/50">
              Live Video Stream Active
            </AppText>
          </View>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center bg-zinc-950">
          <View className="overflow-hidden rounded-full border-2 border-white/10 shadow-2xl">
            <PersonAvatar userId={userId} name={name} size={128} />
          </View>
          <View className="mt-4 flex-row items-center gap-2 rounded-full bg-white/10 px-3 py-1">
            <Icon as={VideoOff} className="size-4 text-white/70" />
            <AppText variant="caption" className="text-white/80">
              {name} turned off camera
            </AppText>
          </View>
        </View>
      )}

      {/* Floating Picture-in-Picture (Local Camera Preview) */}
      <View
        className="absolute right-4 top-28 h-44 w-32 overflow-hidden rounded-2xl border-2 border-white/20 bg-zinc-900 shadow-2xl"
        pointerEvents="box-none"
      >
        <Pressable className="h-full w-full" onPress={onFlipCamera}>
          {cameraEnabled ? (
            <View className="h-full w-full items-center justify-center bg-zinc-800">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <AppText variant="caption" className="font-semibold text-white">You</AppText>
              </View>
              <AppText variant="caption" className="mt-2 text-[10px] text-white/60">
                Tap to flip
              </AppText>
            </View>
          ) : (
            <View className="h-full w-full items-center justify-center bg-zinc-900 p-2">
              <Icon as={VideoOff} className="size-6 text-white/40" />
              <AppText variant="caption" className="mt-1 text-center text-[10px] text-white/50">
                Camera off
              </AppText>
            </View>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}
