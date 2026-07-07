"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import { UserRole } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, checkingAuth } = useAppSelector(
    (state) => state.auth
  );

  useEffect(() => {
    // Wait until auth check is complete
    if (checkingAuth) {
      return;
    }

    // If user is authenticated, redirect based on role
    if (isAuthenticated && user) {
      if (
        user.role === UserRole.VENDOR ||
        user.role === UserRole.CUSTOMER ||
        user.role === UserRole.EMPLOYEE ||
        user.role === UserRole.DELIVERY_AGENT ||
        user.role === UserRole.ADMIN
      ) {
        router.replace("/shops");
      } else {
        router.replace("/auth");
      }
    } else {
      // If not authenticated, redirect to auth
      router.replace("/auth");
    }
  }, [isAuthenticated, user, checkingAuth, router]);

  // Show loading during auth check
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
