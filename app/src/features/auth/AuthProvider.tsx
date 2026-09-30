import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { configureApiAuth } from '@/services/api';
import { socketService } from '@/services/realtime/socket';
import { secureStorage } from '@/services/storage';
import { initDatabase } from '@/database/sqlite/database';
import { clearLocalData } from '@/database/sqlite/clear';
import { startBackgroundSync, startRealtimeCache, stopRealtimeCache } from '@/database/sync/syncEngine';

import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context';
import { authService, toAuthFailure } from '@/features/auth/services/auth.service';
import type { AuthChannel, AuthFailure, AuthStatus, AuthUser } from '@/features/auth/types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [error, setError] = useState<AuthFailure | null>(null);

  useEffect(() => {
    let cancelled = false;

    configureApiAuth({
      refresh: () => authService.refresh(),
      onSessionLost: () => {
        stopRealtimeCache();
        void clearLocalData().catch(() => undefined);
        if (cancelled) {
          return;
        }
        setUser(null);
        setStatus('unauthenticated');
      },
    });

    async function restore() {
      const accessToken = await secureStorage.getAccessToken();
      const refreshToken = await secureStorage.getRefreshToken();

      if (!accessToken && !refreshToken) {
        if (!cancelled) {
          setStatus('unauthenticated');
        }
        return;
      }

      try {
        if (!accessToken) {
          const refreshed = await authService.refresh();
          if (!refreshed) {
            throw new Error('missing session');
          }
        }

        const session = await authService.currentSession();
        if (!cancelled) {
          setUser(session.user);
          setStatus('authenticated');
        }
      } catch {
        await secureStorage.clearTokens();
        stopRealtimeCache();
        await clearLocalData().catch(() => undefined);
        if (!cancelled) {
          setUser(null);
          setStatus('unauthenticated');
        }
      }
    }

    void restore();
    void initDatabase().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const savedSession = useRef(false);

  useEffect(() => {
    if (status === 'authenticated') {
      startRealtimeCache(user?.id ?? null);
      if (!savedSession.current) {
        savedSession.current = true;
        startBackgroundSync();
      }
      socketService.connect();
    }
    if (status === 'unauthenticated') {
      savedSession.current = false;
      stopRealtimeCache();
      socketService.disconnect();
    }
  }, [status, user?.id]);

  const requestOtp = useCallback(async (channel: AuthChannel, destination: string) => {
    setStatus('requestingOtp');
    setError(null);

    try {
      const result = await authService.requestOtp(channel, destination);
      setStatus('unauthenticated');
      return { resendAfter: result.resendAfter };
    } catch (caught) {
      setError(toAuthFailure(caught));
      setStatus('error');
      throw caught;
    }
  }, []);

  const verifyOtp = useCallback(async (channel: AuthChannel, destination: string, otp: string) => {
    setStatus('verifyingOtp');
    setError(null);

    try {
      const result = await authService.verifyOtp(channel, destination, otp);
      setUser(result.user);
      setStatus('authenticated');
    } catch (caught) {
      setError(toAuthFailure(caught));
      setStatus('error');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      stopRealtimeCache();
      await clearLocalData().catch(() => undefined);
      setUser(null);
      setError(null);
      setStatus('unauthenticated');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus((current) => (current === 'error' ? 'unauthenticated' : current));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error,
      requestOtp,
      verifyOtp,
      logout,
      clearError,
    }),
    [user, status, error, requestOtp, verifyOtp, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
