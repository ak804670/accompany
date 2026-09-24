import { useContext } from 'react';

import { ProfileContext } from '@/features/profile/profile-context';

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return value;
}
