import { requireNativeModule } from 'expo-modules-core';

type CallAction = { action: 'answer' | 'reject' | 'hangup'; callId: string };

type AccompanyCallsModule = {
  showIncoming(callId: string, name: string, video: boolean): void;
  showOutgoing(callId: string, name: string, video: boolean): void;
  showConnected(callId: string, name: string, video: boolean): void;
  dismiss(callId: string): void;
  addListener(event: 'onCallAction', listener: (payload: CallAction) => void): { remove(): void };
};

export default requireNativeModule<AccompanyCallsModule>('AccompanyCalls');
