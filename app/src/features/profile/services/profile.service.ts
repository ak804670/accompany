import { apiClient, ApiError } from '@/services/api';
import { env } from '@/services/env';
import { secureStorage } from '@/services/storage';

import type { ProfileInterest, UserProfile } from '@/features/profile/types';

type ProfileResponse = { profile: UserProfile };
type InterestResponse = { interests: ProfileInterest[] };

function message(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object' && 'error' in error.body) {
    const nested = (error.body as { error?: { message?: string } }).error?.message;
    if (nested) {
      return nested;
    }
  }
  return fallback;
}

export const profileService = {
  async get(): Promise<UserProfile> {
    const result = await apiClient.get<ProfileResponse>('/v1/profile');
    return result.profile;
  },

  async saveBasics(displayName: string, dateOfBirth: string): Promise<UserProfile> {
    const result = await apiClient.post<ProfileResponse>('/v1/profile', { displayName, dateOfBirth });
    return result.profile;
  },

  async update(body: { bio?: string; languagePreferences?: string[]; displayName?: string; dateOfBirth?: string }): Promise<UserProfile> {
    try {
      const result = await apiClient.patch<ProfileResponse>('/v1/profile', body);
      return result.profile;
    } catch (error) {
      throw new Error(message(error, 'Could not save your profile.'));
    }
  },

  async interests(query: string): Promise<ProfileInterest[]> {
    const result = await apiClient.get<InterestResponse>(`/v1/interests?q=${encodeURIComponent(query)}`);
    return result.interests;
  },

  async rates(): Promise<{ chat: number | null; audio: number | null; video: number | null }> {
    const result = await apiClient.get<{ rates: { chat: number | null; audio: number | null; video: number | null } }>('/v1/profile/rates');
    return result.rates;
  },

  async saveRates(rates: { chat?: number; audio?: number; video?: number }) {
    const result = await apiClient.put<{ rates: { chat: number | null; audio: number | null; video: number | null } }>('/v1/profile/rates', rates);
    return result.rates;
  },

  async reorderPhotos(mediaIds: string[]): Promise<UserProfile> {
    const result = await apiClient.put<ProfileResponse>('/v1/profile/media/order', { mediaIds });
    return result.profile;
  },

  async saveInterests(interestIds: string[], names: string[] = []): Promise<UserProfile> {
    const result = await apiClient.put<ProfileResponse>('/v1/profile/interests', { interestIds, names });
    return result.profile;
  },

  async photoPreview(id: string): Promise<string | null> {
    const token = await secureStorage.getAccessToken();
    if (!token) {
      return null;
    }
    const response = await fetch(`${env.apiBaseUrl}/v1/profile/media/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return null;
    }
    const type = response.headers.get('content-type') ?? 'image/jpeg';
    const bytes = new Uint8Array(await response.arrayBuffer());
    return `data:${type};base64,${encodeBase64(bytes)}`;
  },

  async uploadPhoto(bytes: Uint8Array, contentType: string): Promise<UserProfile> {
    const result = await apiClient.post<ProfileResponse>('/v1/profile/media', {
      contentType,
      data: encodeBase64(bytes),
    });
    return result.profile;
  },

  async removePhoto(id: string): Promise<UserProfile> {
    const result = await apiClient.delete<ProfileResponse>(`/v1/profile/media/${id}`);
    return result.profile;
  },

  async complete(): Promise<UserProfile> {
    const result = await apiClient.post<ProfileResponse>('/v1/profile/complete', {});
    return result.profile;
  },

  failureMessage(error: unknown): string {
    return message(error, 'Something went wrong. Please try again.');
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
