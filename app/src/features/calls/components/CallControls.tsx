import {
  Mic,
  MicOff,
  PhoneOff,
  SwitchCamera,
  Video,
  VideoOff,
  Volume1,
  Volume2,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { Icon } from '@/components/ui/icon';

export type CallControlsProps = {
  video: boolean;
  muted: boolean;
  cameraEnabled: boolean;
  speakerOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onFlipCamera: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
};

export function CallControls({
  video,
  muted,
  cameraEnabled,
  speakerOn,
  onToggleMute,
  onToggleCamera,
  onFlipCamera,
  onToggleSpeaker,
  onEndCall,
}: CallControlsProps) {
  return (
    <View
      className="absolute bottom-8 left-4 right-4 z-30 flex-row items-center justify-around rounded-3xl border border-white/10 bg-black/75 px-4 py-3 shadow-2xl backdrop-blur-xl"
      pointerEvents="box-none"
    >
      {/* Microphone Mute / Unmute */}
      <ControlBtn
        label={muted ? 'Unmute' : 'Mute'}
        icon={<Icon as={muted ? MicOff : Mic} className={`size-6 ${muted ? 'text-destructive' : 'text-white'}`} />}
        active={!muted}
        onPress={onToggleMute}
      />

      {/* Speakerphone Toggle */}
      <ControlBtn
        label={speakerOn ? 'Speaker' : 'Earpiece'}
        icon={<Icon as={speakerOn ? Volume2 : Volume1} className="size-6 text-white" />}
        active={speakerOn}
        onPress={onToggleSpeaker}
      />

      {/* Video-Only: Camera On / Off */}
      {video ? (
        <ControlBtn
          label={cameraEnabled ? 'Cam On' : 'Cam Off'}
          icon={<Icon as={cameraEnabled ? Video : VideoOff} className={`size-6 ${cameraEnabled ? 'text-white' : 'text-destructive'}`} />}
          active={cameraEnabled}
          onPress={onToggleCamera}
        />
      ) : null}

      {/* Video-Only: Flip Camera (Front / Rear) */}
      {video ? (
        <ControlBtn
          label="Flip"
          icon={<Icon as={SwitchCamera} className="size-6 text-white" />}
          onPress={onFlipCamera}
        />
      ) : null}

      {/* End Call / Hang Up */}
      <ControlBtn
        danger
        label="End"
        icon={<Icon as={PhoneOff} className="size-6 text-white" />}
        onPress={onEndCall}
      />
    </View>
  );
}

function ControlBtn({
  label,
  icon,
  onPress,
  active = false,
  danger = false,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center gap-1.5 active:scale-95"
    >
      <View
        className={`h-14 w-14 items-center justify-center rounded-full ${
          danger
            ? 'bg-destructive shadow-lg shadow-destructive/40'
            : active
              ? 'bg-white/20 border border-white/25'
              : 'bg-white/10'
        }`}
      >
        {icon}
      </View>
      <AppText variant="caption" className="text-[11px] font-medium text-white/80">
        {label}
      </AppText>
    </Pressable>
  );
}
