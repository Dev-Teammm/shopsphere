"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import { UserRole } from "@/lib/constants";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Inner component that uses useSearchParams - must be inside Suspense.
 */
function ProtectedRouteContent({
  children,
  allowedRoles = [UserRole.ADMIN, UserRole.EMPLOYEE],
}: ProtectedRouteProps) {
  const { isAuthenticated, user, checkingAuth } = useAppSelector(
    (state) => state.auth
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Wait until auth check is complete
    if (checkingAuth) {
      return;
    }

    // Prevent multiple redirects
    if (hasRedirected.current) {
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      hasRedirected.current = true;
      // Preserve the full URL including query params
      const returnUrl = searchParams.toString() 
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      router.push(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      hasRedirected.current = true;
      if (user.role === UserRole.ADMIN) {
        router.push("/admin/dashboard");
      } else if (user.role === UserRole.DELIVERY_AGENT) {
        router.push("/delivery-agent/dashboard");
      } else if (user.role === UserRole.CUSTOMER) {
        router.push("/");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, user, allowedRoles, router, pathname, checkingAuth, searchParams]);

  // Show loading while checking auth (but allow optimistic auth to pass through)
  // Only show loading if we're actively checking AND don't have optimistic auth
  if (checkingAuth && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If auth check is complete and user is not authenticated, show loading (will redirect)
  // But only if we're not still checking (to allow optimistic auth during check)
  if (!checkingAuth && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (allowedRoles.length === 0 || allowedRoles.includes(user.role)) {
      return <>{children}</>;
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

/**
 * Wraps components that require authentication.
 * Redirects to login page if user is not authenticated.
 * Can also check for specific roles.
 */
export default function ProtectedRoute(props: ProtectedRouteProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ProtectedRouteContent {...props} />
    </Suspense>
  );
}
