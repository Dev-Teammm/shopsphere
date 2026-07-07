"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { shopService, ShopDTO } from "@/lib/services/shop-service";
import { useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import { UserRole } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Store, Package, Plus, ArrowRight, Building2 } from "lucide-react";
import Image from "next/image";
import ProtectedRoute from "@/components/auth/protected-route";
import { ShopsHeader } from "@/components/shops/shops-header";

function ShopsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Redirect admins immediately to admin portal
  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  const {
    data: shops,
    isLoading: shopsLoading,
    error: shopsError,
    refetch,
  } = useQuery({
    queryKey: ["userShops"],
    queryFn: () => shopService.getUserShops(),
    enabled: !!user,
    retry: 1,
  });

  useEffect(() => {
    if (shopsError) {
      const errorMessage =
        shopsError instanceof Error
          ? shopsError.message
          : "Failed to load shops";

      if (errorMessage.includes("Unauthorized")) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          router.push("/auth");
        }, 2000);
      } else {
        toast({
          title: "Error Loading Shops",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  }, [shopsError, toast, router]);

  const handleOpenShop = (shop: ShopDTO) => {
    // We now navigate using the shop slug, not the internal ID
    const slug = shop.slug;
    if (!slug) {
      toast({
        title: "Cannot open shop",
        description:
          "This shop is missing a valid slug. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    // Check if shop has Stripe account connected (only for active shops)
    if (shop.status === "ACTIVE" && !shop.stripeAccount) {
      toast({
        title: "Stripe Account Required",
        description:
          "This shop needs a Stripe account to be connected before you can access it. Please contact the shop owner.",
        variant: "destructive",
      });
      return;
    }

    // Check if there's a returnUrl to navigate back to
    const returnUrl = searchParams.get("returnUrl");
    let targetUrl: string;

    if (returnUrl) {
      // Parse the returnUrl and add shopSlug to it
      try {
        const url = new URL(returnUrl, window.location.origin);
        url.searchParams.set("shopSlug", slug);
        targetUrl = url.pathname + url.search;
      } catch {
        // If returnUrl is not a full URL, treat it as a path
        const separator = returnUrl.includes("?") ? "&" : "?";
        targetUrl = `${returnUrl}${separator}shopSlug=${encodeURIComponent(slug)}`;
      }
    } else {
      // No returnUrl, use default dashboard
      targetUrl = `/dashboard?shopSlug=${encodeURIComponent(slug)}`;
    }

    // Delivery agents have their own dashboard
    if (user?.role === UserRole.DELIVERY_AGENT) {
      if (returnUrl) {
        router.push(targetUrl);
      } else {
        router.push(
          `/delivery-agent/dashboard?shopSlug=${encodeURIComponent(slug)}`,
        );
      }
      return;
    }

    // Admins should not select shops - redirect to admin portal
    if (user?.role === UserRole.ADMIN) {
      router.push("/admin/dashboard");
      return;
    }

    // Vendors and employees go to the main dashboard with shopSlug
    if (
      user?.role === UserRole.VENDOR ||
      user?.role === UserRole.EMPLOYEE
    ) {
      router.push(targetUrl);
      return;
    }

    // Fallback: if somehow role is missing / unsupported, show a message
    toast({
      title: "Cannot open shop",
      description: "Your role is not allowed to access this shop dashboard.",
      variant: "destructive",
    });
  };

  const handleCreateShop = () => {
    router.push("/shops/manage/create");
  };

  if (shopsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ShopsHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-48 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string, isActive?: boolean) => {
    if (status === "ACTIVE" && isActive) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-white">
          Active
        </Badge>
      );
    }
    if (status === "PENDING") {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
          Pending
        </Badge>
      );
    }
    if (status === "SUSPENDED") {
      return (
        <Badge className="bg-red-500 hover:bg-red-600 text-white">
          Suspended
        </Badge>
      );
    }
    if (status === "INACTIVE") {
      return (
        <Badge className="bg-gray-500 hover:bg-gray-600 text-white">
          Inactive
        </Badge>
      );
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <ShopsHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">My Shops</h1>
            <p className="text-muted-foreground">
              Select a shop to manage or create a new one
            </p>
          </div>
          {(user?.role === UserRole.VENDOR ||
            user?.role === UserRole.CUSTOMER) && (
            <Button onClick={handleCreateShop} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create Shop
            </Button>
          )}
        </div>

        {!shopsLoading && !shopsError && (!shops || shops.length === 0) && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No shops found</h3>
                <p className="text-muted-foreground mb-6">
                  {user?.role === UserRole.VENDOR ||
                  user?.role === UserRole.CUSTOMER
                    ? "You don't have any shops yet. Create your first shop to get started."
                    : "You are not associated with any shops yet."}
                </p>
                {(user?.role === UserRole.VENDOR ||
                  user?.role === UserRole.CUSTOMER) && (
                  <Button
                    onClick={handleCreateShop}
                    size="lg"
                    className="gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Create Shop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!shopsLoading && !shopsError && shops && shops.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop) => (
              <Card
                key={shop.shopId}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="p-0">
                  <div className="relative h-48 w-full bg-muted rounded-t-lg overflow-hidden">
                    {shop.logoUrl ? (
                      <Image
                        src={shop.logoUrl}
                        alt={shop.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted">
                        <Store className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(shop.status, shop.isActive)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <CardTitle className="mb-2">{shop.name}</CardTitle>
                  {shop.description && (
                    <CardDescription className="line-clamp-2 mb-4">
                      {shop.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>{shop.productCount || 0} products</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  {user?.role === UserRole.VENDOR &&
                    shop.ownerId === user.id && (
                      <Button
                        onClick={() =>
                          router.push(`/shops/manage/${shop.shopId}`)
                        }
                        variant="outline"
                        className="flex-1 gap-2"
                        size="lg"
                      >
                        <Store className="h-4 w-4" />
                        Manage
                      </Button>
                    )}
                  <Button
                    onClick={() => handleOpenShop(shop)}
                    className="flex-1 gap-2"
                    size="lg"
                    disabled={
                      shop.status === "SUSPENDED" || shop.status === "INACTIVE"
                    }
                  >
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShopsPage() {
  return (
    <ProtectedRoute
      allowedRoles={[
        UserRole.VENDOR,
        UserRole.CUSTOMER,
        UserRole.EMPLOYEE,
        UserRole.DELIVERY_AGENT,
      ]}
    >
      <ShopsPageContent />
    </ProtectedRoute>
  );
}
