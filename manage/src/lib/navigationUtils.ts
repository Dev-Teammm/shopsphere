/**
 * Navigation utilities for handling client-side navigation with optional page reloads
 */

export interface NavigationOptions {
  /** Force a full page reload instead of client-side navigation */
  forceReload?: boolean;
  /** Replace current history entry instead of pushing new one */
  replace?: boolean;
  /** Open in new tab/window */
  newTab?: boolean;
}

/**
 * Enhanced navigation function that can force page reloads
 * @param url - The URL to navigate to
 * @param options - Navigation options
 */
export const navigateWithOptions = (url: string, options: NavigationOptions = {}) => {
  const { forceReload = false, replace = false, newTab = false } = options;

  if (newTab) {
    window.open(url, '_blank');
    return;
  }

  if (forceReload) {
    // Force a full page reload
    if (replace) {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
    return;
  }

  // Use Next.js router for client-side navigation
  // This will be handled by the component using useRouter
  return { url, replace };
};

/**
 * Check if we should force reload based on authentication state changes
 * @param wasAuthenticated - Previous authentication state
 * @param isAuthenticated - Current authentication state
 * @returns true if reload is recommended
 */
export const shouldForceReloadOnAuthChange = (
  wasAuthenticated: boolean,
  isAuthenticated: boolean
): boolean => {
  // Force reload when authentication state changes
  return wasAuthenticated !== isAuthenticated;
};

export const ROUTES_REQUIRING_RELOAD_ON_AUTH = [
  '/dashboard',
  '/products',
  '/orders',
  '/customers',
  '/analytics',
  '/settings',
  '/profile',
  '/delivery-agent'
  ,'/products'
];


export const routeRequiresReloadOnAuth = (pathname: string): boolean => {
  return ROUTES_REQUIRING_RELOAD_ON_AUTH.some(route => 
    pathname.startsWith(route)
  );
};

/**
 * Enhanced router hook that provides reload functionality
 */
export const createEnhancedRouter = (router: any) => {
  return {
    ...router,
    pushWithReload: (url: string, options: NavigationOptions = {}) => {
      const result = navigateWithOptions(url, options);
      if (result && !options.forceReload) {
        if (result.replace) {
          router.replace(result.url);
        } else {
          router.push(result.url);
        }
      }
    },
    replaceWithReload: (url: string, options: NavigationOptions = {}) => {
      const result = navigateWithOptions(url, { ...options, replace: true });
      if (result && !options.forceReload) {
        router.replace(result.url);
      }
    }
  };
};
