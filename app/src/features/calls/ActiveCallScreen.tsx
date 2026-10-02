import { useEffect, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';

import { AudioCallView } from '@/features/calls/components/AudioCallView';
import { CallControls } from '@/features/calls/components/CallControls';
import { CallHeader } from '@/features/calls/components/CallHeader';
import { RingingView } from '@/features/calls/components/RingingView';
import { VideoCallView } from '@/features/calls/components/VideoCallView';
import { callManager, type ActiveCall } from '@/features/calls/call-manager';

function useActiveCall(): ActiveCall | null {
  return useSyncExternalStore(
    (listener) => callManager.subscribe(listener),
    () => callManager.getCurrentCall(),
  );
}

export function ActiveCallScreen() {
  const call = useActiveCall();
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (!call?.startedAt || call.phase !== 'CONNECTED') {
      setDuration(0);
      return;
    }
    const started = call.startedAt;
    const update = () => {
      setDuration(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [call?.phase, call?.startedAt]);

  if (
    !call ||
    call.phase === 'ENDED' ||
    call.phase === 'REJECTED' ||
    call.phase === 'MISSED' ||
    call.phase === 'FAILED' ||
    call.phase === 'IDLE'
  ) {
    return null;
  }

  const isRinging = call.phase === 'RINGING';

  return (
    <View className="absolute inset-0 z-50 bg-zinc-950">
      {/* Ringing Screen */}
      {isRinging ? (
        <RingingView
          name={call.name}
          userId={call.userId}
          video={call.video}
          outgoing={call.outgoing}
          rate={call.rate}
          onAnswer={() => void callManager.answerCall(call.id)}
          onReject={() =>
            void (call.outgoing ? callManager.endCall(call.id) : callManager.rejectCall(call.id))
          }
        />
      ) : (
        <>
          {/* Top Header with companion name, timer, and coin rate */}
          {showControls ? (
            <CallHeader
              name={call.name}
              status={call.phase}
              durationSeconds={duration}
              rate={call.rate}
              video={call.video}
            />
          ) : null}

          {/* Main Stage: Video stream vs Audio centered avatar */}
          {call.video ? (
            <VideoCallView
              name={call.name}
              userId={call.userId}
              cameraEnabled={call.cameraEnabled}
              remoteCameraEnabled={call.remoteCameraEnabled}
              isFrontCamera={call.isFrontCamera}
              onFlipCamera={() => callManager.flipCamera()}
              onToggleOverlay={() => setShowControls((prev) => !prev)}
            />
          ) : (
            <AudioCallView
              name={call.name}
              userId={call.userId}
              isSpeaking={call.isSpeaking}
            />
          )}

          {/* Bottom Floating Control Dock */}
          {showControls ? (
            <CallControls
              video={call.video}
              muted={call.muted}
              cameraEnabled={call.cameraEnabled}
              speakerOn={call.speakerOn}
              onToggleMute={() => callManager.mute(!call.muted)}
              onToggleCamera={() => callManager.toggleCamera()}
              onFlipCamera={() => callManager.flipCamera()}
              onToggleSpeaker={() => callManager.toggleSpeaker()}
              onEndCall={() => void callManager.endCall(call.id)}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
