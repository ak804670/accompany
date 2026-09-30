import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { peekProfile } from '@/database/sqlite/memory';
import { profileRepository } from '@/database/sqlite/repositories/profileRepository';
import { syncProfile } from '@/database/sync/syncEngine';
import { useAuth } from '@/features/auth';
import { ProfileContext } from '@/features/profile/profile-context';
import { profileService } from '@/features/profile/services/profile.service';
import type { UserProfile } from '@/features/profile/types';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const seeded = peekProfile();
  const [profile, setProfileState] = useState<UserProfile | null>(seeded);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const setProfile = useCallback((next: UserProfile) => {
    profileRef.current = next;
    setProfileState(next);
    void profileRepository.saveCurrent(next).catch(() => undefined);
  }, []);

  const loadProfile = useCallback(async (force: boolean) => {
    let cached = profileRef.current;
    if (!cached) {
      try {
        cached = await profileRepository.getCurrent();
      } catch {
        cached = null;
      }
    }
    if (cached) {
      profileRef.current = cached;
      setProfileState(cached);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const fresh = await syncProfile(force);
      profileRef.current = fresh;
      setProfileState(fresh);
    } catch (caught) {
      if (!profileRef.current) setError(profileService.failureMessage(caught));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadProfile(true);
  }, [loadProfile]);

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') {
        profileRef.current = null;
        setProfileState(null);
      }
      return;
    }
    void loadProfile(false);
  }, [status, loadProfile]);

  const value = useMemo(
    () => ({ profile, isLoading, error, refresh, setProfile }),
    [profile, isLoading, error, refresh, setProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
