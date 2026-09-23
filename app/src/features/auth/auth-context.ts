import { createContext } from 'react';

import type { AuthChannel, AuthFailure, AuthStatus, AuthUser } from '@/features/auth/types';

export type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  error: AuthFailure | null;
  requestOtp: (channel: AuthChannel, destination: string) => Promise<{ resendAfter: number }>;
  verifyOtp: (channel: AuthChannel, destination: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
