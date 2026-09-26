import { PermissionsAndroid, Platform } from 'react-native';

import { type CallPlatform, type NativeCall, type NativeCallAction } from '@/features/calls/call-platform';

const inactivePlatform: CallPlatform = {
  available: () => false,
  showIncoming: () => undefined,
  showOutgoing: () => undefined,
  showConnected: () => undefined,
  dismiss: () => undefined,
  subscribe: () => () => undefined,
};

type NativeModule = {
  showIncoming(callId: string, name: string, video: boolean): void;
  showOutgoing(callId: string, name: string, video: boolean): void;
  showConnected(callId: string, name: string, video: boolean): void;
  dismiss(callId: string): void;
  addListener(event: 'onCallAction', listener: (payload: { action: NativeCallAction; callId: string }) => void): { remove(): void };
};

async function allowNotifications(): Promise<void> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  if (!already) await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

function loadModule(): NativeModule | null {
  if (Platform.OS === 'web') return null;
  try {
    const loaded = require('accompany-calls') as { default?: NativeModule } & NativeModule;
    return loaded.default ?? loaded;
  } catch {
    return null;
  }
}

export function createNativePlatform(): CallPlatform {
  const native = loadModule();
  if (!native) return inactivePlatform;
  const show = (call: NativeCall, kind: 'incoming' | 'outgoing' | 'connected') => {
    void allowNotifications().then(() => {
      if (kind === 'incoming') native.showIncoming(call.id, call.name, call.video);
      if (kind === 'outgoing') native.showOutgoing(call.id, call.name, call.video);
      if (kind === 'connected') native.showConnected(call.id, call.name, call.video);
    }).catch((error: unknown) => {
      console.warn('Call notification was not posted', error);
    });
  };
  return {
    available: () => Platform.OS === 'ios' || Platform.OS === 'android',
    showIncoming: (call) => show(call, 'incoming'),
    showOutgoing: (call) => show(call, 'outgoing'),
    showConnected: (call) => show(call, 'connected'),
    dismiss: (callId) => {
      try {
        native.dismiss(callId);
      } catch {
        // The system UI is already gone.
      }
    },
    subscribe: (listener) => {
      const subscription = native.addListener('onCallAction', (payload) => listener(payload.action, payload.callId));
      return () => subscription.remove();
    },
  };
}
