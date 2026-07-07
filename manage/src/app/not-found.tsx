"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  useEffect(() => {
    // Get the previous path from the browser history
    // This will be null if there's no previous page in the history
    const referrer = document.referrer;

    // Check if referrer is from the same origin
    if (referrer && referrer.startsWith(window.location.origin)) {
      // Extract the path from the full URL
      const url = new URL(referrer);
      setPreviousPath(url.pathname);
    }
  }, []);

  const handleReturn = () => {
    if (previousPath) {
      // If there's a previous path, go back to it
      router.push(previousPath);
    } else {
      // If there's no previous path, go to /shops
      router.push("/shops");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-9xl font-bold text-primary">404</h1>
        <h2 className="text-3xl font-semibold text-foreground">
          Page Not Found
        </h2>
        <p className="text-muted-foreground">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Button onClick={handleReturn} className="mt-8" size="lg">
          <ArrowLeft className="mr-2" />
          Return Back
        </Button>
      </div>
    </div>
  );
}
