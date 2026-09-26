export type RealtimeEventType =
  | 'message'
  | 'presence'
  | 'read'
  | 'CHAT_REQUEST_RECEIVED'
  | 'CHAT_REQUEST_ACCEPTED'
  | 'CHAT_REQUEST_REJECTED'
  | 'NEW_MESSAGE'
  | 'MESSAGE_READ'
  | 'USER_ONLINE'
  | 'USER_OFFLINE'
  | 'BLOCK_CREATED';

export type RealtimeEvent = { type: RealtimeEventType };

type Listener = (event: RealtimeEvent) => void;

const listeners = new Set<Listener>();

export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener);
  const url = process.env.EXPO_PUBLIC_REALTIME_URL;
  let socket: WebSocket | null = null;
  if (url && !url.includes('example.com')) {
    socket = new WebSocket(url);
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as RealtimeEvent;
        for (const item of listeners) {
          item(parsed);
        }
      } catch {
        return;
      }
    };
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      socket?.close();
    }
  };
}
