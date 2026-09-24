import { createContext } from 'react';

import type { UserProfile } from '@/features/profile/types';

export type ProfileContextValue = {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
};

export const ProfileContext = createContext<ProfileContextValue | null>(null);
