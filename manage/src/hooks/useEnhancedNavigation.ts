/**
 * Enhanced navigation hook with reload capabilities
 */

import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';
import { 
  NavigationOptions, 
  navigateWithOptions, 
  shouldForceReloadOnAuthChange,
  routeRequiresReloadOnAuth 
} from '@/lib/navigationUtils';
import { useAppSelector } from '@/lib/redux/hooks';

export const useEnhancedNavigation = () => {
  const router = useRouter();
  const { user } = useAppSelector(state => state.auth);
  const isAuthenticated = !!user;
  const previousAuthState = useRef(isAuthenticated);

  /**
   * Navigate to a URL with optional reload
   */
  const navigate = useCallback((url: string, options: NavigationOptions = {}) => {
    const currentPath = window.location.pathname;
    
    // Check if we should force reload based on auth state changes
    const authStateChanged = shouldForceReloadOnAuthChange(
      previousAuthState.current, 
      isAuthenticated
    );
    
    // Force reload if auth state changed and we're going to a protected route
    const shouldForceReload = options.forceReload || 
      (authStateChanged && routeRequiresReloadOnAuth(url));

    const finalOptions = {
      ...options,
      forceReload: shouldForceReload
    };

    const result = navigateWithOptions(url, finalOptions);
    
    if (result && !finalOptions.forceReload) {
      if (result.replace) {
        router.replace(result.url);
      } else {
        router.push(result.url);
      }
    }

    // Update previous auth state
    previousAuthState.current = isAuthenticated;
  }, [router, isAuthenticated]);

  /**
   * Navigate with forced reload
   */
  const navigateWithReload = useCallback((url: string, replace = false) => {
    navigate(url, { forceReload: true, replace });
  }, [navigate]);

  /**
   * Navigate to authenticated routes (forces reload if auth state changed)
   */
  const navigateToAuthRoute = useCallback((url: string, options: NavigationOptions = {}) => {
    navigate(url, { ...options, forceReload: true });
  }, [navigate]);

  /**
   * Refresh current page
   */
  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    navigate,
    navigateWithReload,
    navigateToAuthRoute,
    refresh,
    // Expose original router methods
    push: router.push,
    replace: router.replace,
    back: router.back,
    forward: router.forward
  };
};
