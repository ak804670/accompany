import { apiClient } from '@/services/api';
import { env } from '@/services/env';
import { secureStorage } from '@/services/storage';

export type CommunicationRates = {
  chat: number | null;
  audio: number | null;
  video: number | null;
};

export type PersonRelationship =
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'accepted'
  | 'rejected'
  | 'blocked'
  | 'unavailable';

export type OnlinePerson = {
  userId: string;
  name: string;
  age: number | null;
  bio: string | null;
  mediaId: string | null;
  online: boolean;
  onCall?: boolean;
  interests: string[];
  sharedInterests: string[];
  rates: CommunicationRates;
  distanceKm: number | null;
  relationship: PersonRelationship;
  conversationId: string | null;
  rating?: {
    average: number;
    count: number;
  } | null;
};

export type DiscoveryQuery = {
  cursor?: string | null;
  limit?: number;
  distanceKm?: number | null;
  interestIds?: string[];
};

type PeopleResponse = { people: OnlinePerson[]; nextCursor: string | null; hasMore?: boolean };
type PersonResponse = { person: OnlinePerson };

export const peopleService = {
  async beat(): Promise<void> {
    await apiClient.post('/v1/presence', {});
  },

  async online(query: DiscoveryQuery = {}): Promise<PeopleResponse> {
    const params = new URLSearchParams();
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.distanceKm) params.set('distance', String(query.distanceKm));
    if (query.interestIds?.length) params.set('interests', query.interestIds.join(','));
    const suffix = params.size ? `?${params.toString()}` : '';
    const result = await apiClient.get<PeopleResponse>(`/v1/people/online${suffix}`);
    return {
      ...result,
      people: result.people.map((person) => ({
        ...person,
        online: Boolean(person.online),
      })),
    };
  },

  async saveLocation(latitude: number, longitude: number, discoveryEnabled = true): Promise<void> {
    await apiClient.put('/v1/me/location', { latitude, longitude, discoveryEnabled });
  },

  async blocks(): Promise<Array<{ userId: string; name: string }>> {
    const result = await apiClient.get<{ people: Array<{ userId: string; name: string }> }>('/v1/blocks');
    return result.people;
  },

  async block(userId: string): Promise<void> {
    await apiClient.post(`/v1/users/${userId}/block`, {});
  },

  async unblock(userId: string): Promise<void> {
    await apiClient.delete(`/v1/users/${userId}/block`);
  },

  async person(userId: string): Promise<OnlinePerson> {
    const result = await apiClient.get<PersonResponse>(`/v1/people/${userId}`);
    return result.person;
  },

  async photo(userId: string): Promise<string | null> {
    const token = await secureStorage.getAccessToken();
    if (!token) {
      return null;
    }
    const response = await fetch(`${env.apiBaseUrl}/v1/people/${userId}/photo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return null;
    }
    const type = response.headers.get('content-type') ?? 'image/jpeg';
    const bytes = new Uint8Array(await response.arrayBuffer());
    return `data:${type};base64,${encodeBase64(bytes)}`;
  },
};

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return globalThis.btoa(binary);
}
