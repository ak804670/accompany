export type NativeCallAction = 'answer' | 'reject' | 'hangup';

export type NativeCall = {
  id: string;
  name: string;
  video: boolean;
  outgoing: boolean;
};

export type CallPlatform = {
  available(): boolean;
  showIncoming(call: NativeCall): void;
  showOutgoing(call: NativeCall): void;
  showConnected(call: NativeCall): void;
  dismiss(callId: string): void;
  subscribe(listener: (action: NativeCallAction, callId: string) => void): () => void;
};

export const inactivePlatform: CallPlatform = {
  available: () => false,
  showIncoming: () => undefined,
  showOutgoing: () => undefined,
  showConnected: () => undefined,
  dismiss: () => undefined,
  subscribe: () => () => undefined,
};
