"use client";

import { useEffect, useState } from "react";
import { authService } from "@/lib/services/auth-service";

export function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const runDebug = async () => {
      setIsLoading(true);
      try {
        const token = authService.getToken();
        console.log("Debug - Token exists:", !!token);
        console.log("Debug - Token value:", token);

        if (token) {
          try {
            const user = await authService.getCurrentUser();
            console.log("Debug - User data:", user);
            setDebugInfo({ token: !!token, user, error: null });
          } catch (error) {
            console.log("Debug - Auth error:", error);
            setDebugInfo({
              token: !!token,
              user: null,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        } else {
          setDebugInfo({ token: false, user: null, error: "No token" });
        }
      } catch (error) {
        console.log("Debug - General error:", error);
        setDebugInfo({
          token: false,
          user: null,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    runDebug();
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-md text-xs max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      {isLoading ? (
        <p>Loading...</p>
      ) : debugInfo ? (
        <div>
          <p>Token: {debugInfo.token ? "Yes" : "No"}</p>
          <p>User: {debugInfo.user ? "Yes" : "No"}</p>
          {debugInfo.error && <p>Error: {debugInfo.error}</p>}
        </div>
      ) : (
        <p>No debug info</p>
      )}
    </div>
  );
}
