/**
 * Authentication utility functions
 */

import { authService } from "../services/auth-service";

/**
 * Ensures that the authentication token is properly set in headers
 * Call this before making authenticated API requests
 */
export const ensureAuthHeaders = (): void => {
  authService.refreshTokenHeaders();
};

/**
 * Creates authenticated request config for axios
 * Use this when you need to manually set auth headers
 */
export const createAuthConfig = (config: any = {}) => {
  const token = authService.getToken();
  if (token) {
    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      },
    };
  }
  return config;
};

/**
 * Checks if user is authenticated and has valid token
 */
export const isAuthenticatedWithToken = (): boolean => {
  const token = authService.getToken();
  if (!token) return false;

  // Basic token validation (you can add more validation here)
  try {
    // Check if token is not expired (basic check)
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;

    if (payload.exp && payload.exp < currentTime) {
      // Token expired, just return false - don't call logout here
      return false;
    }

    return true;
  } catch (error) {
    // Invalid token format, just return false - don't call logout here
    return false;
  }
};

/**
 * Gets the current auth token
 */
export const getAuthToken = (): string | null => {
  return authService.getToken();
};

/**
 * Sets up authentication headers for the current session
 * Call this when the app initializes
 */
export const setupAuthHeaders = (): void => {
  if (isAuthenticatedWithToken()) {
    authService.refreshTokenHeaders();
  }
};
