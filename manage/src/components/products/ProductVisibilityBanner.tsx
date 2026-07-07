"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  visibilityService,
  VisibilityIssue,
} from "@/lib/services/visibility-service";
import { shopService } from "@/lib/services/shop-service";
import { cn } from "@/lib/utils";

interface ProductVisibilityBannerProps {
  shopSlug?: string | null;
  shopId?: string | null;
  productId?: string | null;
  className?: string;
}

function getDismissKey(
  shopId: string,
  productId?: string | null,
  fingerprint?: string,
) {
  return `shopsphere-visibility-dismissed:${shopId}:${productId ?? "shop"}:${fingerprint ?? ""}`;
}

export function ProductVisibilityBanner({
  shopSlug,
  shopId: shopIdProp,
  productId,
  className,
}: ProductVisibilityBannerProps) {
  const [dismissedFingerprint, setDismissedFingerprint] = useState<
    string | null
  >(null);

  const { data: shopData } = useQuery({
    queryKey: ["shop", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug && !shopIdProp,
  });

  const shopId = shopIdProp ?? shopData?.shopId ?? null;

  const { data: visibilityStatus, isLoading } = useQuery({
    queryKey: ["visibility-status", shopId, productId],
    queryFn: async () => {
      if (productId) {
        return visibilityService.getProductVisibilityStatus(productId);
      }
      if (shopId) {
        return visibilityService.getShopVisibilityStatus(shopId);
      }
      return null;
    },
    enabled: !!shopId,
    refetchOnWindowFocus: true,
  });

  const issues = visibilityStatus?.issues ?? [];
  const fingerprint = useMemo(
    () => issues.map((issue) => issue.code).sort().join("|"),
    [issues],
  );

  useEffect(() => {
    if (!shopId || !fingerprint) {
      setDismissedFingerprint(null);
      return;
    }

    const stored = localStorage.getItem(
      getDismissKey(shopId, productId, fingerprint),
    );
    setDismissedFingerprint(stored);
  }, [shopId, productId, fingerprint]);

  if (!shopId || isLoading || !visibilityStatus) {
    return null;
  }

  if (visibilityStatus.visibleToCustomers || issues.length === 0) {
    return null;
  }

  if (dismissedFingerprint === fingerprint) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(getDismissKey(shopId, productId, fingerprint), "1");
    setDismissedFingerprint(fingerprint);
  };

  return (
    <div
      className={cn(
        "border-b border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl gap-4 px-4 py-4 md:px-6">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200">
          <EyeOff className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <p className="text-sm font-semibold text-amber-950">
                Customers cannot see your products yet
              </p>
            </div>
            <p className="text-sm text-amber-900/80">
              Your listings are hidden on the storefront until the items below
              are resolved.
            </p>
          </div>

          <ul className="space-y-2">
            {issues.map((issue: VisibilityIssue) => (
              <li
                key={issue.code}
                className="rounded-lg border border-amber-200/70 bg-white/70 px-3 py-2.5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {issue.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {issue.description}
                    </p>
                  </div>
                  {issue.actionLabel && issue.actionPath && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-amber-300 bg-white hover:bg-amber-50"
                    >
                      <Link href={issue.actionPath}>
                        {issue.actionLabel}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-amber-800 hover:bg-amber-100 hover:text-amber-950"
          onClick={handleDismiss}
          aria-label="Dismiss visibility warning"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
