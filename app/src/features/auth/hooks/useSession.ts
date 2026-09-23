import { useAuth } from '@/features/auth/hooks/useAuth';

export function useSession() {
  const { user, status } = useAuth();

  return {
    user,
    status,
    isChecking: status === 'checking',
    isAuthenticated: status === 'authenticated',
  };
}
