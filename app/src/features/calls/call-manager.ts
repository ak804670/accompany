import { callService } from '@/features/calls/call.service';
import { isTerminal, phaseFromStatus, reduceCall, type CallPhase } from '@/features/calls/call-state';
import { type CallPlatform } from '@/features/calls/call-platform';
import { createNativePlatform } from '@/features/calls/native-platform';
import { LiveKitAdapter, type LiveKitSession } from '@/features/calls/livekit-adapter';

export type ActiveCall = {
  id: string;
  name: string;
  video: boolean;
  outgoing: boolean;
  phase: CallPhase;
  muted: boolean;
  cameraEnabled: boolean;
  rate?: number | null;
  userId?: string | null;
  speakerOn: boolean;
  isFrontCamera: boolean;
  isSpeaking: boolean;
  remoteCameraEnabled: boolean;
  startedAt?: number | null;
};

export type PendingRating = {
  callId: string;
  userId: string;
  name: string;
};

type Listeners = Set<() => void>;

export class CallManager {
  private current: ActiveCall | null = null;
  private pendingRating: PendingRating | null = null;
  private ending: Promise<void> | null = null;
  private readonly listeners: Listeners = new Set();
  private unsubscribeNative: (() => void) | null = null;

  constructor(
    private readonly platform: CallPlatform = createNativePlatform(),
    private readonly media = new LiveKitAdapter(),
  ) {}

  start(): void {
    this.unsubscribeNative?.();
    this.unsubscribeNative = this.platform.subscribe((action, callId) => {
      if (action === 'hangup') void this.endCall(callId);
      if (action === 'reject') void this.rejectCall(callId);
      if (action === 'answer') void this.answerCall(callId);
    });
  }

  stop(): void {
    this.unsubscribeNative?.();
    this.unsubscribeNative = null;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCurrentCall(): ActiveCall | null {
    return this.current;
  }

  getPendingRating(): PendingRating | null {
    return this.pendingRating;
  }

  setPendingRating(rating: PendingRating | null): void {
    this.pendingRating = rating;
    this.listeners.forEach((listener) => listener());
  }

  clearPendingRating(): void {
    this.pendingRating = null;
    this.listeners.forEach((listener) => listener());
  }

  getMedia(): LiveKitSession | null {
    return this.media.current();
  }

  presentOutgoing(input: {
    id: string;
    name: string;
    video: boolean;
    rate?: number | null;
    userId?: string | null;
    media?: LiveKitSession;
  }): void {
    this.replace({
      id: input.id,
      name: input.name,
      video: input.video,
      outgoing: true,
      phase: 'RINGING',
      muted: false,
      cameraEnabled: input.video,
      rate: input.rate ?? null,
      userId: input.userId ?? null,
      speakerOn: input.video,
      isFrontCamera: true,
      isSpeaking: false,
      remoteCameraEnabled: true,
      startedAt: null,
    });
    if (input.media) {
      void this.media.connect(input.media).catch(() => {
        if (this.current?.id !== input.id) return;
        this.platform.dismiss(input.id);
        this.replace({ ...this.current, phase: 'FAILED' });
        void callService.end(input.id).catch(() => undefined);
      });
    }
    this.platform.showOutgoing({ id: input.id, name: input.name, video: input.video, outgoing: true });
  }

  presentIncoming(input: {
    id: string;
    name: string;
    video: boolean;
    rate?: number | null;
    userId?: string | null;
    status?: string;
  }): void {
    if (this.current?.id === input.id) return;
    const phase = input.status ? phaseFromStatus(input.status) : 'RINGING';
    if (isTerminal(phase)) return;
    this.replace({
      id: input.id,
      name: input.name,
      video: input.video,
      outgoing: false,
      phase,
      muted: false,
      cameraEnabled: input.video,
      rate: input.rate ?? null,
      userId: input.userId ?? null,
      speakerOn: input.video,
      isFrontCamera: true,
      isSpeaking: false,
      remoteCameraEnabled: true,
      startedAt: null,
    });
    this.platform.showIncoming({ id: input.id, name: input.name, video: input.video, outgoing: false });
  }

  async answerCall(callId: string): Promise<void> {
    const call = this.current;
    if (!call || call.id !== callId) return;
    const next = reduceCall(call.phase, 'answer');
    if (next === call.phase) return;
    this.replace({ ...call, phase: next });
    try {
      const result = await callService.accept(callId);
      if (!result.token || !result.url) throw new Error('Call media credentials are missing');
      await this.media.connect({ callId, url: result.url, token: result.token, roomName: result.call.roomName });
      this.replace({
        ...call,
        phase: 'CONNECTED',
        startedAt: Date.now(),
        rate: result.call.rate ?? call.rate,
      });
      this.platform.showConnected({ id: call.id, name: call.name, video: call.video, outgoing: false });
    } catch {
      this.replace({ ...call, phase: 'FAILED' });
      this.platform.dismiss(callId);
      this.media.disconnect(callId);
      await callService.end(callId).catch(() => undefined);
    }
  }

  async rejectCall(callId: string): Promise<void> {
    const call = this.current;
    if (!call || call.id !== callId) {
      this.platform.dismiss(callId);
      return;
    }
    if (reduceCall(call.phase, 'reject') === call.phase) {
      this.platform.dismiss(callId);
      return;
    }
    this.replace({ ...call, phase: 'REJECTED' });
    this.platform.dismiss(callId);
    this.media.disconnect(callId);
    await callService.decline(callId).catch(() => undefined);
    this.clear(callId);
  }

  async endCall(callId: string): Promise<void> {
    if (this.ending) return this.ending;
    const call = this.current;
    if (!call || call.id !== callId) {
      this.platform.dismiss(callId);
      return;
    }
    if (call.phase === 'RINGING' && call.outgoing) {
      this.ending = this.finish(call, 'CANCELLED');
      return this.ending;
    }
    if (call.phase === 'RINGING' && !call.outgoing) return this.rejectCall(callId);
    const next = reduceCall(call.phase, 'end');
    if (next !== 'ENDING') {
      this.platform.dismiss(callId);
      return;
    }
    this.ending = this.finish(call, 'END');
    return this.ending;
  }

  mute(muted: boolean): void {
    if (!this.current) return;
    this.media.setMuted(muted);
    this.replace({ ...this.current, muted });
  }

  toggleCamera(): void {
    if (!this.current) return;
    this.replace({ ...this.current, cameraEnabled: !this.current.cameraEnabled });
  }

  toggleSpeaker(): void {
    if (!this.current) return;
    this.media.setSpeakerOn(!this.current.speakerOn);
    this.replace({ ...this.current, speakerOn: !this.current.speakerOn });
  }

  flipCamera(): void {
    if (!this.current) return;
    this.replace({ ...this.current, isFrontCamera: !this.current.isFrontCamera });
  }

  setSpeaking(isSpeaking: boolean): void {
    if (!this.current) return;
    this.replace({ ...this.current, isSpeaking });
  }

  setRemoteCameraEnabled(remoteCameraEnabled: boolean): void {
    if (!this.current) return;
    this.replace({ ...this.current, remoteCameraEnabled });
  }

  syncRemote(status: string): void {
    if (!this.current) return;
    const phase = phaseFromStatus(status);
    if (!isTerminal(phase) && phase !== 'CONNECTED' && phase !== 'CONNECTING') return;
    if (isTerminal(phase)) {
      const call = this.current;
      const wasConnected = call.phase === 'CONNECTED' || Boolean(call.startedAt);
      const ratedUserId = call.userId;
      const ratedName = call.name;
      const callId = call.id;

      this.platform.dismiss(this.current.id);
      this.media.disconnect(this.current.id);
      this.clear(this.current.id);

      if (wasConnected && ratedUserId) {
        this.pendingRating = { callId, userId: ratedUserId, name: ratedName };
        this.listeners.forEach((listener) => listener());
      }
      return;
    }
    if (phase === 'CONNECTED' && this.current.phase !== 'CONNECTED') {
      this.replace({ ...this.current, phase, startedAt: this.current.startedAt ?? Date.now() });
      this.platform.showConnected(this.current);
    }
  }

  private async finish(call: ActiveCall, kind: 'END' | 'CANCELLED'): Promise<void> {
    const wasConnected = call.phase === 'CONNECTED' || Boolean(call.startedAt);
    const ratedUserId = call.userId;
    const ratedName = call.name;
    const callId = call.id;

    this.replace({ ...call, phase: 'ENDING' });
    this.platform.dismiss(call.id);
    this.media.disconnect(call.id);
    try {
      if (kind === 'CANCELLED') await callService.cancel(call.id);
      else await callService.end(call.id);
    } catch {
      // The backend remains authoritative. A second hangup is ignored there.
    } finally {
      this.replace({ ...call, phase: 'ENDED' });
      this.clear(call.id);
      if (wasConnected && ratedUserId && kind !== 'CANCELLED') {
        this.pendingRating = { callId, userId: ratedUserId, name: ratedName };
        this.listeners.forEach((listener) => listener());
      }
      this.ending = null;
    }
  }

  private replace(call: ActiveCall): void {
    this.current = call;
    this.listeners.forEach((listener) => listener());
  }

  private clear(callId: string): void {
    if (this.current?.id === callId) this.current = null;
    this.listeners.forEach((listener) => listener());
  }
}

export const callManager = new CallManager();
