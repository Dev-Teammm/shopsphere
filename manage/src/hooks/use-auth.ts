'use client';

import { useAppSelector } from '@/lib/redux/hooks';

/**
 * Custom hook for authentication
 * Simply provides auth-related state from Redux
 */
export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error } = useAppSelector(state => state.auth);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
  };
}; 