import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { apiClient } from '@/services/api';
import { ApiError } from '@/services/api/types';
import { secureKeys, secureStorage } from '@/services/storage';

import type { AuthChannel, AuthFailure, AuthUser } from '@/features/auth/types';

type OtpRequestResponse = {
  success: true;
  expiresIn: number;
  resendAfter: number;
};

type VerifyResponse = {
  user: AuthUser;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

const fallbackFailure: AuthFailure = {
  code: 'AUTH_UNAVAILABLE',
  message: 'Something went wrong. Please try again.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function toAuthFailure(error: unknown): AuthFailure {
  if (error instanceof ApiError && isRecord(error.body) && isRecord(error.body.error)) {
    const code = error.body.error.code;
    const message = error.body.error.message;
    if (typeof code === 'string' && typeof message === 'string') {
      return { code, message };
    }
  }

  return fallbackFailure;
}

function createDeviceId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `device-${Date.now()}`;
}

async function devicePayload() {
  const existing = await secureStorage.get(secureKeys.deviceId);
  const deviceIdentifier = existing ?? createDeviceId();

  if (!existing) {
    await secureStorage.set(secureKeys.deviceId, deviceIdentifier);
  }

  return {
    deviceIdentifier,
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
  };
}

export const authService = {
  async requestOtp(channel: AuthChannel, destination: string) {
    return apiClient.post<OtpRequestResponse>(
      '/v1/auth/request-otp',
      { channel, destination },
      { auth: false }
    );
  },

  async verifyOtp(channel: AuthChannel, destination: string, otp: string) {
    const device = await devicePayload();
    const result = await apiClient.post<VerifyResponse>(
      '/v1/auth/verify-otp',
      { channel, destination, otp, device },
      { auth: false }
    );

    await secureStorage.setAccessToken(result.session.accessToken);
    await secureStorage.setRefreshToken(result.session.refreshToken);

    return { user: result.user };
  },

  async refresh() {
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const result = await apiClient.post<VerifyResponse>(
        '/v1/auth/refresh',
        { refreshToken },
        { auth: false }
      );
      await secureStorage.setAccessToken(result.session.accessToken);
      await secureStorage.setRefreshToken(result.session.refreshToken);
      return {
        accessToken: result.session.accessToken,
        refreshToken: result.session.refreshToken,
      };
    } catch {
      await secureStorage.clearTokens();
      return null;
    }
  },

  currentSession() {
    return apiClient.get<{ user: AuthUser }>('/v1/auth/session');
  },

  async logout() {
    const refreshToken = await secureStorage.getRefreshToken();

    try {
      await apiClient.post<void>(
        '/v1/auth/logout',
        refreshToken ? { refreshToken } : {},
        { auth: true }
      );
    } catch {
      // Local credentials are cleared even when the server cannot be reached.
    }

    await secureStorage.clearTokens();
  },
};
