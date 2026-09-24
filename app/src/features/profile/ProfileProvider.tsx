import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth';
import { ProfileContext } from '@/features/profile/profile-context';
import { profileService } from '@/features/profile/services/profile.service';
import type { UserProfile } from '@/features/profile/types';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setProfile(await profileService.get());
    } catch (caught) {
      setError(profileService.failureMessage(caught));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      setProfile(null);
      return;
    }
    void refresh();
  }, [status, refresh]);

  const value = useMemo(
    () => ({ profile, isLoading, error, refresh, setProfile }),
    [profile, isLoading, error, refresh],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
