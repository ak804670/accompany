import { apiClient } from '@/services/api';

export type ConversationStatus = 'pending' | 'accepted' | 'rejected';

export type ConversationSummary = {
  id: string;
  personId: string;
  name: string;
  preview: string | null;
  updatedAt: string | null;
  unreadCount: number;
  online: boolean;
  status: ConversationStatus;
  incoming: boolean;
  blocked?: boolean;
};

export type CallEvent = {
  id: string;
  callType: 'AUDIO' | 'VIDEO';
  status: string;
  createdAt: string;
  callerId: string;
  receiverId: string;
  durationSeconds?: number;
  conversationId?: string | null;
};

export type CallHistoryItem = CallEvent & {
  personId: string;
  name: string;
  conversationId: string | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

type ListResponse = { conversations: ConversationSummary[]; nextCursor: string | null; unread: number };
type MessagesResponse = { messages: ChatMessage[]; nextCursor: string | null };
type SendResponse = { message: ChatMessage };
type OpenResponse = { conversationId: string };
type ConversationResponse = {
  conversation: ConversationSummary & { canMessage: boolean; canRespond: boolean };
};

export const chatService = {
  async list(cursor?: string | null): Promise<ListResponse> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiClient.get<ListResponse>(`/v1/conversations${query}`);
  },

  async get(conversationId: string): Promise<ConversationResponse['conversation']> {
    const result = await apiClient.get<ConversationResponse>(`/v1/conversations/${conversationId}`);
    return result.conversation;
  },

  async open(personId: string, message: string): Promise<string> {
    const result = await apiClient.post<OpenResponse>('/v1/conversations', { personId, message });
    return result.conversationId;
  },

  async accept(conversationId: string): Promise<void> {
    await apiClient.post(`/v1/conversations/${conversationId}/accept`, {});
  },

  async reject(conversationId: string): Promise<void> {
    await apiClient.post(`/v1/conversations/${conversationId}/reject`, {});
  },

  async messages(conversationId: string, cursor?: string | null): Promise<MessagesResponse> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiClient.get<MessagesResponse>(`/v1/conversations/${conversationId}/messages${query}`);
  },

  async send(conversationId: string, body: string): Promise<ChatMessage> {
    const result = await apiClient.post<SendResponse>(`/v1/conversations/${conversationId}/messages`, { body });
    return result.message;
  },

  async requestCall(personId: string, kind: 'audio' | 'video', conversationId: string): Promise<CallEvent> {
    const result = await apiClient.post<{ call: CallEvent }>('/v1/calls', { personId, kind, conversationId });
    return result.call;
  },

  async callsWith(personId: string): Promise<CallEvent[]> {
    const result = await apiClient.get<{ calls: CallEvent[] }>(`/v1/calls?personId=${encodeURIComponent(personId)}`);
    return result.calls;
  },

  async recentCalls(cursor?: string | null, missed = false): Promise<{ calls: CallHistoryItem[]; nextCursor: string | null }> {
    const params = new URLSearchParams({ limit: '25' });
    if (cursor) params.set('cursor', cursor);
    if (missed) params.set('filter', 'missed');
    return apiClient.get<{ calls: CallHistoryItem[]; nextCursor: string | null }>(`/v1/calls/recent?${params.toString()}`);
  },

  async acceptCall(callId: string): Promise<void> {
    await apiClient.post(`/v1/calls/${callId}/accept`, {});
  },

  async declineCall(callId: string): Promise<void> {
    await apiClient.post(`/v1/calls/${callId}/decline`, {});
  },

  async cancelCall(callId: string): Promise<void> {
    await apiClient.post(`/v1/calls/${callId}/cancel`, {});
  },

  async endCall(callId: string): Promise<void> {
    await apiClient.post(`/v1/calls/${callId}/end`, {});
  },

  async markRead(conversationId: string): Promise<void> {
    await apiClient.post(`/v1/conversations/${conversationId}/read`, {});
  },
};
