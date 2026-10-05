import { apiClient } from '@/services/api';

export type CallSession = {
  id: string;
  callType: 'AUDIO' | 'VIDEO';
  status: string;
  roomName: string;
  rate: number;
  token?: string;
  url?: string;
  name: string;
  callerId?: string;
  receiverId?: string;
  callerName?: string | null;
};

type CallResponse = {
  call: Omit<CallSession, 'token' | 'url' | 'name'> & { callerName?: string | null; callerId?: string; receiverId?: string };
  token?: string;
  url?: string;
};

export const callService = {
  async start(personId: string, kind: 'audio' | 'video', conversationId?: string | null): Promise<CallResponse> {
    return apiClient.post<CallResponse>('/v1/calls', { personId, kind, conversationId });
  },

  async get(callId: string): Promise<CallResponse['call']> {
    const result = await apiClient.get<{ call: CallResponse['call'] }>(`/v1/calls/${callId}`);
    return result.call;
  },

  async incoming(): Promise<CallResponse['call'] | null> {
    const result = await apiClient.get<{ call: CallResponse['call'] | null }>('/v1/calls/incoming');
    return result.call;
  },

  async accept(callId: string): Promise<CallResponse> {
    return apiClient.post<CallResponse>(`/v1/calls/${callId}/accept`, {});
  },

  async decline(callId: string): Promise<void> {
    await apiClient.post(`/v1/calls/${callId}/decline`, {});
  },

  async cancel(callId: string): Promise<void> {
    await apiClient.post(`/v1/calls/${callId}/cancel`, {});
  },

  async end(callId: string): Promise<void> {
    await apiClient.post(`/v1/calls/${callId}/end`, {});
  },

  async registerDevice(platform: 'ios' | 'android', token: string): Promise<void> {
    await apiClient.post('/v1/devices', { platform, token });
  },
};
