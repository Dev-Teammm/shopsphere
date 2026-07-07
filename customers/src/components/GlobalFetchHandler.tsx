"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function GlobalFetchHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        const options = args[1] as RequestInit | undefined;
        let skipGlobalToast = false;

        if (options?.headers) {
          if (options.headers instanceof Headers) {
            skipGlobalToast =
              options.headers.get("X-Skip-Global-Toast") === "true";
          } else {
            skipGlobalToast =
              (options.headers as Record<string, string>)[
                "X-Skip-Global-Toast"
              ] === "true";
          }
        }

        if (!response.ok && !skipGlobalToast) {
          const isAuthPage = window.location.pathname.includes("/auth");

          // Don't show global error toasts for 401/403 on auth pages
          if (
            isAuthPage &&
            (response.status === 401 || response.status === 403)
          ) {
            return response;
          }

          const clone = response.clone();
          try {
            const data = await clone.json();
            const errorMessage =
              data.message ||
              data.error ||
              `Error ${response.status}: ${response.statusText}`;
            if (errorMessage.toLowerCase() === "access denied") {
              return response;
            }
            toast.error("Process Failed", {
              description: errorMessage,
              position: "top-center",
              duration: 5000,
            });
          } catch (e) {
            // toast.error("Process Failed", {
            //   description: `Server returned ${response.status}: ${response.statusText}`,
            //   position: "top-center",
            //   duration: 5000,
            // });
            console.error(e);
          }
        }

        return response;
      } catch (error: any) {
        // Network errors are already handled by apiCall in api.ts
        // We only rethrow here without showing a second toast
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
