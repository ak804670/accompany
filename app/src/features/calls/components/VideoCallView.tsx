import { VideoTrack } from '@livekit/react-native';
import { RoomEvent, Track, type Room } from 'livekit-client';
import { VideoOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
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
  room?: Room | null;
  onFlipCamera?: () => void;
  onToggleOverlay?: () => void;
};

export function VideoCallView({
  name,
  userId,
  cameraEnabled,
  remoteCameraEnabled = true,
  isFrontCamera = true,
  room = null,
  onFlipCamera,
  onToggleOverlay,
}: VideoCallViewProps) {
  const [, refreshTracks] = useState(0);
  useEffect(() => {
    if (!room) return;
    const refresh = () => refreshTracks((version) => version + 1);
    room.on(RoomEvent.TrackSubscribed, refresh);
    room.on(RoomEvent.TrackUnsubscribed, refresh);
    room.on(RoomEvent.LocalTrackPublished, refresh);
    room.on(RoomEvent.LocalTrackUnpublished, refresh);
    return () => {
      room.off(RoomEvent.TrackSubscribed, refresh);
      room.off(RoomEvent.TrackUnsubscribed, refresh);
      room.off(RoomEvent.LocalTrackPublished, refresh);
      room.off(RoomEvent.LocalTrackUnpublished, refresh);
    };
  }, [room]);

  const remoteEntry = room
    ? [...room.remoteParticipants.values()]
        .map((participant) => ({ participant, publication: participant.getTrackPublication(Track.Source.Camera) }))
        .find((entry) => entry.publication?.track)
    : undefined;
  const remotePublication = remoteEntry?.publication;
  const localPublication = room?.localParticipant.getTrackPublication(Track.Source.Camera);
  const remoteTrackRef = remoteEntry?.participant && remotePublication ? {
    participant: remoteEntry.participant,
    publication: remotePublication,
    source: Track.Source.Camera,
  } : null;
  const localTrackRef = localPublication?.track ? {
    participant: room!.localParticipant,
    publication: localPublication,
    source: Track.Source.Camera,
  } : null;

  return (
    <Pressable className="flex-1 bg-black" onPress={onToggleOverlay}>
      {remoteCameraEnabled && remoteTrackRef ? (
      <VideoTrack trackRef={remoteTrackRef} style={{ flex: 1, width: '100%' }} objectFit="cover" />
      ) : (
        <View className="flex-1 items-center justify-center bg-zinc-950">
          <View className="h-32 w-32 items-center justify-center overflow-hidden rounded-2xl bg-zinc-900">
            <PersonAvatar userId={userId} name={name} size={96} />
          </View>
          <AppText variant="caption" className="mt-3 text-white/50">
            {remoteCameraEnabled ? 'Waiting for video…' : `${name} turned off camera`}
          </AppText>
        </View>
      )}

      <View className="absolute right-4 top-28 h-44 w-32 overflow-hidden rounded-2xl border-2 border-white/20 bg-zinc-900 shadow-2xl">
        <Pressable className="h-full w-full" onPress={onFlipCamera}>
          {cameraEnabled && localTrackRef ? (
            <VideoTrack trackRef={localTrackRef} style={{ flex: 1 }} objectFit="cover" mirror={isFrontCamera} />
          ) : (
            <View className="h-full w-full items-center justify-center p-2">
              <Icon as={VideoOff} className="size-6 text-white/40" />
              <AppText variant="caption" className="mt-1 text-center text-[10px] text-white/50">
                {cameraEnabled ? 'Starting camera…' : 'Camera off'}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}
