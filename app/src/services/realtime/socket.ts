import { io, type Socket } from 'socket.io-client';

import { env } from '@/services/env';
import { secureStorage } from '@/services/storage/secure-storage';

export const ChatEvents = {
  conversationJoin: 'conversation:join',
  conversationLeave: 'conversation:leave',
  messageSend: 'message:send',
  messageNew: 'message:new',
  messageDelivered: 'message:delivered',
  messageRead: 'message:read',
  messageFailed: 'message:failed',
  typingStart: 'typing:start',
  typingStop: 'typing:stop',
  presenceUpdate: 'presence:update',
  conversationUpdate: 'conversation:update',
  chatRequestNew: 'chat_request:new',
  chatRequestAccepted: 'chat_request:accepted',
} as const;

export type LiveMessage = {
  messageId: string;
  clientMessageId: string | null;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text';
  createdAt: string;
};

type Handler = (payload: unknown) => void;

const handlers = new Map<string, Set<Handler>>();
let socket: Socket | null = null;
let activeConversationId: string | null = null;
let typingTimer: ReturnType<typeof setTimeout> | null = null;

function origin(): string {
  const configured = env.wsBaseUrl.trim();
  const base = configured && !configured.includes('example.com') ? configured : env.apiBaseUrl;
  return base.replace(/\/$/, '').replace(/^ws/i, 'http');
}

function attachHandlers(current: Socket): void {
  for (const [event, set] of handlers) {
    current.off(event);
    for (const handler of set) current.on(event, handler);
  }
}

export const socketService = {
  get connected(): boolean {
    return Boolean(socket?.connected);
  },

  connect(): void {
    if (socket) return;
    void secureStorage.getAccessToken().then((token) => {
      if (!token || socket) return;
      const current = io(origin(), {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        autoConnect: true,
      });
      socket = current;
      attachHandlers(current);
      current.on('connect', () => {
        if (activeConversationId) current.emit(ChatEvents.conversationJoin, { conversationId: activeConversationId });
      });
      current.on('connect_error', () => {
        void secureStorage.getAccessToken().then((next) => {
          if (next) current.auth = { token: next };
        }).catch(() => undefined);
      });
    }).catch(() => undefined);
  },

  disconnect(): void {
    activeConversationId = null;
    socket?.disconnect();
    socket = null;
  },

  join(conversationId: string): void {
    activeConversationId = conversationId;
    socket?.emit(ChatEvents.conversationJoin, { conversationId });
  },

  leave(conversationId: string): void {
    if (activeConversationId === conversationId) activeConversationId = null;
    socket?.emit(ChatEvents.conversationLeave, { conversationId });
  },

  sendMessage(conversationId: string, content: string, clientMessageId: string): Promise<LiveMessage> {
    return new Promise((resolve, reject) => {
      if (!socket?.connected) {
        reject(new Error('offline'));
        return;
      }
      socket.timeout(8000).emit(ChatEvents.messageSend, { conversationId, content, clientMessageId }, (error: unknown, body: { ok?: boolean; message?: LiveMessage; error?: { message?: string } }) => {
        if (error || !body?.ok || !body.message) {
          reject(new Error(body?.error?.message || "Couldn't send the message."));
          return;
        }
        resolve(body.message);
      });
    });
  },

  markRead(conversationId: string, messageIds: string[]): void {
    socket?.emit(ChatEvents.messageRead, { conversationId, messageIds });
  },

  typing(conversationId: string, active: boolean): void {
    if (!socket?.connected) return;
    if (!active) {
      if (typingTimer) clearTimeout(typingTimer);
      socket.emit(ChatEvents.typingStop, { conversationId });
      return;
    }
    if (typingTimer) return;
    socket.emit(ChatEvents.typingStart, { conversationId });
    typingTimer = setTimeout(() => {
      typingTimer = null;
      socket?.emit(ChatEvents.typingStop, { conversationId });
    }, 2500);
  },

  subscribe(event: string, handler: Handler): () => void {
    const set = handlers.get(event) ?? new Set<Handler>();
    set.add(handler);
    handlers.set(event, set);
    socket?.on(event, handler);
    return () => {
      set.delete(handler);
      socket?.off(event, handler);
    };
  },

  notify(event: string, payload: unknown): void {
    for (const handler of handlers.get(event) ?? []) handler(payload);
  },
};

type LegacyListener = (event: { type: string }) => void;

export function subscribeRealtime(listener: LegacyListener): () => void {
  socketService.connect();
  const forward = (type: string) => () => listener({ type });
  const offs = [
    socketService.subscribe(ChatEvents.messageNew, forward('NEW_MESSAGE')),
    socketService.subscribe(ChatEvents.messageRead, forward('MESSAGE_READ')),
    socketService.subscribe(ChatEvents.chatRequestNew, forward('CHAT_REQUEST_RECEIVED')),
    socketService.subscribe(ChatEvents.chatRequestAccepted, forward('CHAT_REQUEST_ACCEPTED')),
    socketService.subscribe(ChatEvents.conversationUpdate, forward('NEW_MESSAGE')),
  ];
  return () => {
    for (const off of offs) off();
  };
}
