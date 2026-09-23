import * as SecureStore from 'expo-secure-store';

import { secureKeys } from '@/services/storage/keys';

const keyPattern = /^[A-Za-z0-9._-]+$/;

function assertKey(key: string) {
  if (!keyPattern.test(key)) {
    throw new Error(`Invalid secure storage key: ${key}`);
  }
}

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    assertKey(key);
    return SecureStore.getItemAsync(key);
  },

  async set(key: string, value: string): Promise<void> {
    assertKey(key);
    await SecureStore.setItemAsync(key, value);
  },

  async remove(key: string): Promise<void> {
    assertKey(key);
    await SecureStore.deleteItemAsync(key);
  },

  setAccessToken(token: string) {
    return secureStorage.set(secureKeys.accessToken, token);
  },

  getAccessToken() {
    return secureStorage.get(secureKeys.accessToken);
  },

  setRefreshToken(token: string) {
    return secureStorage.set(secureKeys.refreshToken, token);
  },

  getRefreshToken() {
    return secureStorage.get(secureKeys.refreshToken);
  },

  async clearTokens() {
    await secureStorage.remove(secureKeys.accessToken);
    await secureStorage.remove(secureKeys.refreshToken);
  },
};
