import { AudioSession } from '@livekit/react-native';
import { Room, Track } from 'livekit-client';
import { PermissionsAndroid, Platform } from 'react-native';

export type LiveKitSession = {
  callId: string;
  url: string;
  token: string;
  roomName: string;
  video?: boolean;
};

export class LiveKitAdapter {
  private session: LiveKitSession | null = null;
  private room: Room | null = null;

  async connect(session: LiveKitSession): Promise<void> {
    if (this.room && this.session?.callId === session.callId) return;
    await this.disconnectCurrent();
    if (Platform.OS === 'android' && Number(Platform.Version) >= 23) {
      const microphone = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (microphone !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Microphone permission was denied');
      if (session.video) {
        const camera = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (camera !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Camera permission was denied');
      }
    }
    const room = new Room();
    this.room = room;
    this.session = session;
    try {
      await AudioSession.startAudioSession();
      await room.connect(session.url, session.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      if (session.video) await room.localParticipant.setCameraEnabled(true);
    } catch (error) {
      await this.disconnectCurrent();
      throw error;
    }
  }

  current(): LiveKitSession | null {
    return this.session;
  }

  getRoom(): Room | null {
    return this.room;
  }

  disconnect(callId: string): void {
    if (this.session?.callId === callId) void this.disconnectCurrent().catch(() => undefined);
  }

  setMuted(muted: boolean): void {
    void this.room?.localParticipant.setMicrophoneEnabled(!muted).catch(() => undefined);
  }

  async setCameraEnabled(enabled: boolean): Promise<void> {
    await this.room?.localParticipant.setCameraEnabled(enabled);
  }

  async flipCamera(isFrontCamera: boolean): Promise<void> {
    const track = this.room?.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (track) await track.restartTrack({ facingMode: isFrontCamera ? 'user' : 'environment' });
  }

  setSpeakerOn(speakerOn: boolean): void {
    const output = Platform.OS === 'ios'
      ? (speakerOn ? 'force_speaker' : 'default')
      : (speakerOn ? 'speaker' : 'earpiece');
    void AudioSession.selectAudioOutput(output).catch(() => undefined);
  }

  private async disconnectCurrent(): Promise<void> {
    const room = this.room;
    this.room = null;
    this.session = null;
    if (room) {
      room.removeAllListeners();
      await room.disconnect();
      await AudioSession.stopAudioSession();
    }
  }
}
