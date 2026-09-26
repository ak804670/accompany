export const ChatEvents = {
  conversationJoin: 'conversation:join',
  conversationLeave: 'conversation:leave',
  conversationJoined: 'conversation:joined',
  conversationLeft: 'conversation:left',
  conversationUpdate: 'conversation:update',
  messageSend: 'message:send',
  messageNew: 'message:new',
  messageDelivered: 'message:delivered',
  messageRead: 'message:read',
  messageFailed: 'message:failed',
  typingStart: 'typing:start',
  typingStop: 'typing:stop',
  presenceUpdate: 'presence:update',
  chatRequestNew: 'chat_request:new',
  chatRequestAccepted: 'chat_request:accepted',
  chatRequestRejected: 'chat_request:rejected',
  userBlocked: 'user:blocked',
  userUnblocked: 'user:unblocked',
  error: 'socket:error',
} as const;

export type ChatEventName = (typeof ChatEvents)[keyof typeof ChatEvents];

export type SocketFailure = {
  code:
    | 'UNAUTHORIZED'
    | 'CONVERSATION_NOT_FOUND'
    | 'CONVERSATION_ACCESS_DENIED'
    | 'USER_BLOCKED'
    | 'CHAT_REQUEST_PENDING'
    | 'MESSAGE_INVALID'
    | 'MESSAGE_SEND_FAILED'
    | 'RATE_LIMITED';
  message: string;
};

export type LiveMessage = {
  messageId: string;
  clientMessageId: string | null;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text';
  createdAt: string;
};

export function failureForDecision(status: number, message: string): SocketFailure {
  if (status === 404) return { code: 'CONVERSATION_NOT_FOUND', message };
  if (message.toLowerCase().includes('accept')) return { code: 'CHAT_REQUEST_PENDING', message };
  if (status === 403) return { code: 'USER_BLOCKED', message };
  return { code: 'CONVERSATION_ACCESS_DENIED', message };
}

export function nextPresence(activeSockets: number): 'ONLINE' | 'OFFLINE' {
  return activeSockets > 0 ? 'ONLINE' : 'OFFLINE';
}

export function validateMessageContent(content: unknown): string | SocketFailure {
  if (typeof content !== 'string') return { code: 'MESSAGE_INVALID', message: 'Write a message first.' };
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 2000) return { code: 'MESSAGE_INVALID', message: 'Write a message first.' };
  return trimmed;
}
