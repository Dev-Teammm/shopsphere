"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  checkAuthStart,
  checkAuthSuccess,
  checkAuthFailure,
} from "@/lib/redux/auth-slice";
import { authService } from "@/lib/services/auth-service";
import { setupAuthHeaders } from "@/lib/utils/auth-utils";
import { User } from "@/lib/types";

/**
 * Auth checker component
 * Checks for existing auth session when the app initializes
 * Uses sessionStorage to track if auth check has been completed in this session
 */
export function AuthChecker({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { checkingAuth } = useAppSelector((state) => state.auth);
  const hasCheckedAuth = useRef(false);
  const isChecking = useRef(false);

  useEffect(() => {
    // Only check auth once during this render cycle
    if (hasCheckedAuth.current || isChecking.current) {
      return;
    }

    const checkAuthentication = async () => {
      try {
        isChecking.current = true;
        hasCheckedAuth.current = true;

        setupAuthHeaders();
        dispatch(checkAuthStart());

        const token = authService.getToken();
        if (!token) {
          dispatch(checkAuthFailure());
          return;
        }

        const user = await authService.getCurrentUser();
        const allowedRoles = ["ADMIN", "EMPLOYEE", "DELIVERY_AGENT", "VENDOR", "CUSTOMER"];
        if (!allowedRoles.includes(user.role)) {
          localStorage.removeItem("authToken");
          dispatch(checkAuthFailure());
          return;
        }
        
        dispatch(checkAuthSuccess(user));
      } catch (error: any) {
        // On any error, end the checking state so UI can proceed
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          localStorage.removeItem("authToken");
        dispatch(checkAuthFailure());
        } else {
          // For network errors, keep optimistic auth state
          // The API client will handle 401/403 on actual requests
          console.log("Network error during auth check, keeping optimistic state");
          // Don't dispatch checkAuthFailure for network errors - keep optimistic state
          // Just mark checking as complete
          dispatch(checkAuthFailure()); // Actually, we should fail to be safe
        }
      } finally {
        isChecking.current = false;
      }
    };

    // Always check if there's a token, regardless of sessionStorage
    // sessionStorage was causing issues on page reload
    const token = authService.getToken();
    if (token) {
    checkAuthentication();
    } else {
      // No token, mark as checked immediately
      hasCheckedAuth.current = true;
      dispatch(checkAuthFailure());
    }
  }, [dispatch]);

  // Show loading only while a check is in progress
  if (checkingAuth && !hasCheckedAuth.current) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
