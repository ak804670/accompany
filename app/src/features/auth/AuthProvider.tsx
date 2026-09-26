import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { configureApiAuth } from '@/services/api';
import { socketService } from '@/services/realtime/socket';
import { secureStorage } from '@/services/storage';

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
        if (!cancelled) {
          setUser(null);
          setStatus('unauthenticated');
        }
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status === 'authenticated') socketService.connect();
    if (status === 'unauthenticated') socketService.disconnect();
  }, [status]);

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
