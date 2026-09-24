import { apiClient } from '@/services/api';

export type ConversationSummary = {
  id: string;
  personId: string;
  name: string;
  preview: string | null;
  updatedAt: string | null;
  unreadCount: number;
  online: boolean;
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
type ConversationResponse = { conversation: { id: string; personId: string; name: string; online: boolean } };

export const chatService = {
  async list(cursor?: string | null): Promise<ListResponse> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiClient.get<ListResponse>(`/v1/conversations${query}`);
  },

  async get(conversationId: string): Promise<ConversationResponse['conversation']> {
    const result = await apiClient.get<ConversationResponse>(`/v1/conversations/${conversationId}`);
    return result.conversation;
  },

  async open(personId: string): Promise<string> {
    const result = await apiClient.post<OpenResponse>('/v1/conversations', { personId });
    return result.conversationId;
  },

  async messages(conversationId: string, cursor?: string | null): Promise<MessagesResponse> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiClient.get<MessagesResponse>(`/v1/conversations/${conversationId}/messages${query}`);
  },

  async send(conversationId: string, body: string): Promise<ChatMessage> {
    const result = await apiClient.post<SendResponse>(`/v1/conversations/${conversationId}/messages`, { body });
    return result.message;
  },

  async markRead(conversationId: string): Promise<void> {
    await apiClient.post(`/v1/conversations/${conversationId}/read`, {});
  },
};
