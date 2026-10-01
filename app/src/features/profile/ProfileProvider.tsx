import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { bumpProfileGeneration, profileGeneration, warmSession } from '@/database/session-cache';
import { profileRepository } from '@/database/repositories/profileRepository';
import { useAuth, useSession } from '@/features/auth';
import { ProfileContext } from '@/features/profile/profile-context';
import { profileService } from '@/features/profile/services/profile.service';
import type { UserProfile } from '@/features/profile/types';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { user } = useSession();
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const userId = user.id;
    const gen = bumpProfileGeneration();
    setError(null);
    const cached = profileRepository.peek(userId) ?? await profileRepository.get(userId);
    if (!cached) setIsLoading(true);
    try {
      const next = await profileService.get();
      if (gen !== profileGeneration()) return;
      try {
        await profileRepository.save(userId, next);
      } catch {
        // The confirmed profile still updates the open screen.
      }
      setProfileState(next);
    } catch (caught) {
      if (gen !== profileGeneration()) return;
      setError(profileService.failureMessage(caught));
    } finally {
      if (gen === profileGeneration()) setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (status !== 'authenticated' || !user?.id) {
      setProfileState(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    const userId = user.id;
    let active = true;
    void (async () => {
      const cached = profileRepository.peek(userId) ?? await profileRepository.get(userId);
      if (!active) return;
      if (cached) {
        setProfileState(cached);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      void warmSession(userId);
      const gen = profileGeneration();
      try {
        const next = await profileService.get();
        if (!active || gen !== profileGeneration()) return;
        try {
          await profileRepository.save(userId, next);
        } catch {
          // The confirmed profile still updates the open screen.
        }
        setProfileState(next);
      } catch (caught) {
        if (!active || gen !== profileGeneration()) return;
        if (!cached) setError(profileService.failureMessage(caught));
      } finally {
        if (active && gen === profileGeneration()) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [status, user?.id]);

  const setProfile = useCallback((next: UserProfile) => {
    bumpProfileGeneration();
    setProfileState(next);
    if (user?.id) {
      void profileRepository.save(user.id, next).catch(() => undefined);
    }
  }, [user?.id]);

  const value = useMemo(
    () => ({ profile, isLoading, error, refresh, setProfile }),
    [profile, isLoading, error, refresh, setProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
