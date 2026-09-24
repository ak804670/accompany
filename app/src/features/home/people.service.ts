import { apiClient } from '@/services/api';
import { env } from '@/services/env';
import { secureStorage } from '@/services/storage';

export type OnlinePerson = {
  userId: string;
  name: string;
  age: number | null;
  bio: string | null;
  mediaId: string | null;
  online: boolean;
};

type PeopleResponse = { people: OnlinePerson[]; nextCursor: string | null };
type PersonResponse = { person: OnlinePerson };

export const peopleService = {
  async beat(): Promise<void> {
    await apiClient.post('/v1/presence', {});
  },

  async online(cursor?: string | null): Promise<PeopleResponse> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiClient.get<PeopleResponse>(`/v1/people/online${query}`);
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
