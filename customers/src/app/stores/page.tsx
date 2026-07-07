"use client";

import { useState, useMemo, Suspense } from "react";
import { StoresClient } from "./StoresClient";
import { Loader2 } from "lucide-react";

export default function StoresPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <StoresClient />
    </Suspense>
  );
}

