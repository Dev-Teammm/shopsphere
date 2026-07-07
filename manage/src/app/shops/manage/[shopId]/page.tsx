"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import { UserRole } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Store, CreditCard, Loader2, Package } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { BasicInfoTab } from "@/components/shops/manage/basic-info-tab";
import { StripeAccountTab } from "@/components/shops/manage/stripe-account-tab";
import { SubscriptionTab } from "@/components/shops/manage/subscription-tab";
import { shopService, ShopDTO } from "@/lib/services/shop-service";
import { subscriptionService } from "@/lib/services/subscription-service";

function ShopManagementContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state: RootState) => state.auth);

  const shopId = params.shopId as string;
  const isNewShop = shopId === "create";
  const [activeTab, setActiveTab] = useState("basic");
  const [paymentVerificationAttempted, setPaymentVerificationAttempted] = useState(false);

  // Handle payment verification on return from Stripe (at page level to ensure it runs)
  useEffect(() => {
    if (isNewShop || paymentVerificationAttempted) return;
    
    const sessionId = searchParams.get("session_id");
    const subscriptionStatus = searchParams.get("subscription");
    
    if (sessionId && subscriptionStatus === "success") {
      setPaymentVerificationAttempted(true);
      
      console.log("Verifying payment for session:", sessionId);
      
      // Verify payment and activate subscription
      subscriptionService.verifyPayment(sessionId)
        .then(() => {
          console.log("Payment verification successful");
          
          // Invalidate queries to refresh subscription data
          queryClient.invalidateQueries({ queryKey: ["shop-subscription", shopId] });
          queryClient.invalidateQueries({ queryKey: ["shop-subscription-history", shopId] });
          queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
          queryClient.invalidateQueries({ queryKey: ["subscription-plans", "active", shopId] });
          
          toast({
            title: "Payment Successful",
            description: "Your subscription has been activated successfully!",
          });
          
          // Switch to subscription tab to show the activated subscription
          setActiveTab("subscription");
          
          // Clean up URL - remove query parameters
          const newUrl = `/shops/manage/${shopId}`;
          window.history.replaceState({}, "", newUrl);
        })
        .catch((error: any) => {
          console.error("Payment verification error:", error);
          toast({
            title: "Payment Verification Failed",
            description: error?.response?.data || error?.message || "Failed to verify payment. Please contact support.",
            variant: "destructive",
          });
          // Still clean up URL even on error
          const newUrl = `/shops/manage/${shopId}`;
          window.history.replaceState({}, "", newUrl);
          setPaymentVerificationAttempted(false); // Allow retry
        });
    } else if (subscriptionStatus === "cancel") {
      toast({
        title: "Payment Cancelled",
        description: "Subscription payment was cancelled.",
        variant: "default",
      });
      // Clean up URL
      const newUrl = `/shops/manage/${shopId}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams, shopId, isNewShop, paymentVerificationAttempted, queryClient, router, toast]);

  // Fetch existing shop data if editing
  const {
    data: existingShop,
    isLoading: shopLoading,
    error: shopError,
  } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => shopService.getShopById(shopId),
    enabled: !isNewShop && !!shopId,
  });

  // Check if user can manage this shop
  const canManageShop = useMemo(() => {
    if (!user) return null; // Still loading user
    if (user.role === UserRole.ADMIN) return true;
    if (isNewShop) return user.role === UserRole.VENDOR || user.role === UserRole.CUSTOMER;
    // For existing shops, wait for shop data to load
    if (shopLoading) return null; // Still loading shop - don't make decision yet
    if (!existingShop) return false; // Shop not found or doesn't exist
    return existingShop.ownerId === user.id;
  }, [user, existingShop, isNewShop, shopLoading]);

  useEffect(() => {
    // Only redirect if we've finished loading (not loading) and user doesn't have permission
    // Don't redirect if we're still loading data
    if (!shopLoading && canManageShop === false && !isNewShop) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage this shop.",
        variant: "destructive",
      });
      router.push("/shops");
      return;
    }
  }, [canManageShop, shopLoading, isNewShop, toast, router]);

  useEffect(() => {
    // Only redirect on error if we're not still loading and it's a real error
    if (shopError && !shopLoading) {
      const errorMessage = shopError instanceof Error ? shopError.message : String(shopError);
      
      // Don't redirect on database type errors - these are fixable
      if (errorMessage.includes("operator does not exist") || 
          errorMessage.includes("bigint = uuid") ||
          errorMessage.includes("JDBC exception")) {
        toast({
          title: "Database Error",
          description: "There's a database configuration issue. Please contact support.",
          variant: "destructive",
        });
        // Don't redirect - let user see the error
        return;
      }
      
      toast({
        title: "Error Loading Shop",
        description: "Failed to load shop details. Please try again.",
        variant: "destructive",
      });
      router.push("/shops");
    }
  }, [shopError, shopLoading, toast, router]);

  const handleBack = () => {
    router.push("/shops");
  };

  const handleShopCreated = (shop: ShopDTO) => {
    queryClient.invalidateQueries({ queryKey: ["userShops"] });
    toast({
      title: "Shop Created Successfully",
      description: "Your shop has been created with pending status. Please connect your Stripe account to activate it.",
      variant: "default",
    });
    // Redirect to manage the newly created shop
    router.push(`/shops/manage/${shop.shopId}`);
  };

  const handleShopUpdated = (shop: ShopDTO) => {
    queryClient.invalidateQueries({ queryKey: ["userShops"] });
    queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
    toast({
      title: "Shop Updated Successfully",
      description: "Your shop information has been updated.",
      variant: "default",
    });
  };

  const handleStripeConnected = () => {
    queryClient.invalidateQueries({ queryKey: ["userShops"] });
    queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
    toast({
      title: "Stripe Account Connected",
      description: "Your Stripe account has been connected successfully. Your shop is now active!",
      variant: "default",
    });
  };

  if (shopLoading && !isNewShop) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shops
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <Store className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isNewShop ? "Create New Shop" : "Manage Shop"}
              </h1>
              <p className="text-muted-foreground">
                {isNewShop
                  ? "Set up your shop with basic information and payment processing"
                  : `Manage settings for ${existingShop?.name || "your shop"}`
                }
              </p>
            </div>
          </div>

          {!isNewShop && existingShop && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm font-medium">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                existingShop.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : existingShop.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}>
                {existingShop.status}
              </span>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="gap-2">
              <Store className="h-4 w-4" />
              Basic Information
            </TabsTrigger>
            <TabsTrigger
              value="stripe"
              className="gap-2"
              disabled={isNewShop}
            >
              <CreditCard className="h-4 w-4" />
              Stripe Account
              {!isNewShop && !existingShop?.stripeAccount && (
                <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  Required
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="subscription"
              className="gap-2"
              disabled={isNewShop}
            >
              <Package className="h-4 w-4" />
              Subscription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <BasicInfoTab
              shop={isNewShop ? null : (existingShop ?? null)}
              onShopCreated={handleShopCreated}
              onShopUpdated={handleShopUpdated}
              isNewShop={isNewShop}
            />
          </TabsContent>

          <TabsContent value="stripe" className="space-y-6">
            {!isNewShop && existingShop ? (
              <StripeAccountTab
                shop={existingShop}
                onStripeConnected={handleStripeConnected}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Create Shop First</h3>
                    <p className="text-muted-foreground">
                      Please create your shop with basic information before connecting a Stripe account.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            {!isNewShop && existingShop ? (
              <SubscriptionTab shop={existingShop} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Create Shop First</h3>
                    <p className="text-muted-foreground">
                      Please create your shop with basic information before managing subscriptions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function ShopManagementPage() {
  return (
    <ProtectedRoute allowedRoles={[UserRole.VENDOR, UserRole.CUSTOMER, UserRole.ADMIN]}>
      <ShopManagementContent />
    </ProtectedRoute>
  );
}