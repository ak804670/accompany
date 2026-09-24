export type RealtimeEvent = { type: 'message' | 'presence' | 'read' };

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
