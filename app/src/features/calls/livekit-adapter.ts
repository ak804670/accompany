import { AudioSession } from '@livekit/react-native';
import { Room } from 'livekit-client';
import { PermissionsAndroid, Platform } from 'react-native';

export type LiveKitSession = {
  callId: string;
  url: string;
  token: string;
  roomName: string;
};

export class LiveKitAdapter {
  private session: LiveKitSession | null = null;
  private room: Room | null = null;

  async connect(session: LiveKitSession): Promise<void> {
    if (this.room && this.session?.callId === session.callId) return;
    await this.disconnectCurrent();
    if (Platform.OS === 'android' && Number(Platform.Version) >= 23) {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Microphone permission was denied');
    }
    const room = new Room();
    this.room = room;
    this.session = session;
    try {
      await AudioSession.startAudioSession();
      await room.connect(session.url, session.token);
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (error) {
      await this.disconnectCurrent();
      throw error;
    }
  }

  current(): LiveKitSession | null {
    return this.session;
  }

  disconnect(callId: string): void {
    if (this.session?.callId === callId) void this.disconnectCurrent().catch(() => undefined);
  }

  setMuted(muted: boolean): void {
    void this.room?.localParticipant.setMicrophoneEnabled(!muted).catch(() => undefined);
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
