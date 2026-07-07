"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AuthBrandingPanel } from "@/components/auth/auth-branding-panel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container relative grid min-h-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <AuthBrandingPanel />
      <div className="flex min-h-screen items-center justify-center bg-background p-6 sm:p-8 lg:min-h-0">
        <div className="mx-auto flex w-full max-w-md flex-col justify-center">
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
            <AuthParamsListener />
            {children}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function AuthParamsListener() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get("message");
    if (message === "invitation-accepted") {
      toast.success(
        "Invitation accepted successfully! You can now log in with your credentials.",
      );
    } else if (message === "invitation-declined") {
      toast.info(
        "Invitation declined. You can still log in with your existing account.",
      );
    } else if (message === "signup-success") {
      toast.success(
        "Account created successfully! You can now log in with your credentials.",
      );
    }
  }, [searchParams]);

  return null;
}
