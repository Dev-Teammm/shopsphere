"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  subscriptionService,
  SubscriptionPlan,
  ShopSubscription,
} from "@/lib/services/subscription-service";
import { ShopDTO } from "@/lib/services/shop-service";
import {
  Package,
  Users,
  Warehouse,
  Truck,
  Check,
  X,
  Clock,
  Calendar,
  CreditCard,
  Loader2,
  Gift,
  Ban,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SubscriptionTabProps {
  shop: ShopDTO;
}

export function SubscriptionTab({ shop }: SubscriptionTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subscribingPlanId, setSubscribingPlanId] = useState<number | null>(
    null,
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Fetch available plans filtered by shop's capability
  // getActivePlansForShop already filters by shop's primaryCapability and includes freemiumConsumed status
  const {
    data: matchingPlans,
    isLoading: plansLoading,
    isFetching: plansFetching,
  } = useQuery({
    queryKey: [
      "subscription-plans",
      "active",
      shop.shopId,
      shop.primaryCapability,
    ],
    queryFn: () => subscriptionService.getAllPlans(true, shop.shopId),
    enabled: !!shop.shopId, // Only fetch if shop exists
  });

  // Fetch all other active plans (for "Discover other plans" section)
  const { data: allActivePlans, isLoading: allPlansLoading } = useQuery({
    queryKey: ["subscription-plans", "all-active"],
    queryFn: () => subscriptionService.getAllPlans(true),
    enabled: !!shop.shopId && !!shop.primaryCapability,
  });

  // Filter plans: matching vs non-matching
  // Only set plans after data has been fetched (not undefined)
  const plans = matchingPlans ?? [];
  const otherPlans = (allActivePlans ?? []).filter(
    (plan) => plan.capability !== shop.primaryCapability,
  );

  // Determine if we should show loading state
  // Show loading if: query is loading OR data hasn't been fetched yet (undefined)
  // Use isLoading for initial load, isFetching for refetches
  const isPlansLoading =
    plansLoading || (plansFetching && matchingPlans === undefined);
  const hasPlansData = matchingPlans !== undefined; // Data has been fetched at least once

  // Fetch current subscription
  const { data: activeSubscription, isLoading: activeLoading } = useQuery({
    queryKey: ["shop-subscription", shop.shopId],
    queryFn: () => subscriptionService.getActiveSubscription(shop.shopId),
  });

  // Fetch subscription history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["shop-subscription-history", shop.shopId],
    queryFn: () => subscriptionService.getSubscriptionHistory(shop.shopId),
  });

  // Note: freemiumConsumed is now included in plans data from backend

  // Check if subscription system is enabled
  const { data: isSystemEnabled, isLoading: systemStatusLoading } = useQuery({
    queryKey: ["subscription-system-status"],
    queryFn: subscriptionService.isSystemEnabled,
  });

  // Payment verification mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: (sessionId: string) =>
      subscriptionService.verifyPayment(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shop-subscription", shop.shopId],
      });
      queryClient.invalidateQueries({
        queryKey: ["shop-subscription-history", shop.shopId],
      });
      queryClient.invalidateQueries({ queryKey: ["shop", shop.shopId] });
      toast({
        title: "Payment Successful",
        description: "Your subscription has been activated successfully!",
      });
      // Clean up URL
      router.replace(`/shops/manage/${shop.shopId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Verification Failed",
        description:
          error?.response?.data ||
          error?.message ||
          "Failed to verify payment. Please contact support.",
        variant: "destructive",
      });
    },
  });

  // Note: Payment verification is handled at the page level to ensure it runs
  // regardless of which tab is active. This useEffect is kept as a backup.
  // The page-level handler will switch to this tab after successful verification.

  // Freemium subscription mutation
  const freemiumMutation = useMutation({
    mutationFn: ({ planId }: { planId: number }) =>
      subscriptionService.subscribeShop(shop.shopId, planId, false),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shop-subscription", shop.shopId],
      });
      queryClient.invalidateQueries({
        queryKey: ["shop-subscription-history", shop.shopId],
      });
      queryClient.invalidateQueries({ queryKey: ["shop", shop.shopId] });
      queryClient.invalidateQueries({
        queryKey: ["shop-freemium-consumed", shop.shopId],
      });
      toast({
        title: "Free Trial Started",
        description: "Your free trial has been activated successfully!",
      });
      setSubscribingPlanId(null);
    },
    onError: (error: any) => {
      // Extract error message from backend response
      let errorMessage = "Failed to start free trial. Please try again.";
      let errorTitle = "Subscription Failed";

      if (error?.response?.data) {
        // Backend returns error message as string or in a message field
        if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Check error type for appropriate title
      if (
        errorMessage.toLowerCase().includes("capability") ||
        errorMessage.toLowerCase().includes("compatible")
      ) {
        errorTitle = "Capability Mismatch";
      } else if (
        errorMessage.toLowerCase().includes("free trial") ||
        errorMessage.toLowerCase().includes("freemium") ||
        errorMessage.toLowerCase().includes("already used")
      ) {
        errorTitle = "Free Trial Unavailable";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 6000, // Show for 6 seconds for important messages
      });
      setSubscribingPlanId(null);
    },
  });

  // Paid subscription checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: ({ planId, platform }: { planId: number; platform: string }) =>
      subscriptionService.createCheckoutSession(shop.shopId, planId, platform),
    onSuccess: (checkoutUrl) => {
      // Redirect to Stripe checkout
      window.location.href = checkoutUrl;
    },
    onError: (error: any) => {
      let errorMessage =
        error?.response?.data ||
        error?.message ||
        "Failed to create checkout session. Please try again.";
      let errorTitle = "Checkout Failed";

      // Extract error message properly
      if (error?.response?.data) {
        if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }

      // Check if it's a capability mismatch error
      if (
        errorMessage.toLowerCase().includes("capability") ||
        errorMessage.toLowerCase().includes("compatible")
      ) {
        errorTitle = "Capability Mismatch";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 6000,
      });
      setSubscribingPlanId(null);
    },
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: () => subscriptionService.cancelSubscription(shop.shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shop-subscription", shop.shopId],
      });
      queryClient.invalidateQueries({
        queryKey: ["shop-subscription-history", shop.shopId],
      });
      queryClient.invalidateQueries({ queryKey: ["shop", shop.shopId] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description:
          error?.response?.data ||
          error?.message ||
          "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle auto-renew mutation
  const toggleAutoRenewMutation = useMutation({
    mutationFn: (autoRenew: boolean) =>
      subscriptionService.toggleAutoRenew(shop.shopId, autoRenew),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shop-subscription", shop.shopId],
      });
      toast({
        title: "Auto-Renew Updated",
        description: "Your auto-renewal setting has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description:
          error?.response?.data ||
          error?.message ||
          "Failed to update auto-renew. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (plan: SubscriptionPlan) => {
    // Validate capability match before subscribing
    if (shop.primaryCapability && plan.capability !== shop.primaryCapability) {
      toast({
        title: "Capability Mismatch",
        description: `This plan is for ${plan.capability.replace(/_/g, " ")} shops, but your shop is set to ${shop.primaryCapability.replace(/_/g, " ")}. Please update your shop capability first or select a matching plan.`,
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    if (!shop.primaryCapability) {
      toast({
        title: "Shop Capability Required",
        description:
          "Please set your shop capability first before subscribing to a plan.",
        variant: "destructive",
      });
      return;
    }

    setSubscribingPlanId(plan.id);

    if (plan.isFreemium) {
      // Handle freemium subscription
      freemiumMutation.mutate({ planId: plan.id });
    } else {
      // Handle paid subscription - create checkout session
      checkoutMutation.mutate({ planId: plan.id, platform: "web" });
    }
  };

  const handleCancelSubscription = () => {
    cancelMutation.mutate();
  };

  const handleToggleAutoRenew = (checked: boolean) => {
    toggleAutoRenewMutation.mutate(checked);
  };

  // Show loading state while checking system status (after all hooks are declared)
  if (systemStatusLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Checking subscription system status...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render plan card component
  const renderPlanCard = (plan: SubscriptionPlan, isMatching: boolean) => {
    const isFreemium = plan.isFreemium;
    const freemiumConsumed = plan.freemiumConsumed || false;
    const isCurrentPlan = activeSubscription?.planId === plan.id;
    const hasActiveSubscription = activeSubscription?.status === "ACTIVE";
    const canSubscribe =
      !isCurrentPlan &&
      !hasActiveSubscription &&
      !freemiumConsumed &&
      isMatching;
    const capabilityMismatch =
      !isMatching && plan.capability !== shop.primaryCapability;

    return (
      <Card key={plan.id} className="flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription className="mt-1">
                {isFreemium
                  ? "Free Trial"
                  : `${plan.currency} ${plan.price.toFixed(2)} / ${plan.durationInDays} days`}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-1 items-end">
              {isFreemium && (
                <Badge variant="secondary" className="gap-1">
                  <Gift className="h-3 w-3" />
                  Freemium
                </Badge>
              )}
              {plan.capability && (
                <Badge variant="outline" className="text-xs">
                  {plan.capability.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          <p className="text-sm text-muted-foreground min-h-[40px]">
            {plan.description || "No description provided."}
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 opacity-70" />
              <span>
                Products:{" "}
                {plan.maxProducts === -1 ? "Unlimited" : plan.maxProducts}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 opacity-70" />
              <span>
                Warehouses:{" "}
                {plan.maxWarehouses === -1 ? "Unlimited" : plan.maxWarehouses}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 opacity-70" />
              <span>
                Employees:{" "}
                {plan.maxEmployees === -1 ? "Unlimited" : plan.maxEmployees}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 opacity-70" />
              <span>
                Delivery Agents:{" "}
                {plan.maxDeliveryAgents === -1
                  ? "Unlimited"
                  : plan.maxDeliveryAgents}
              </span>
            </div>
          </div>

          {capabilityMismatch && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
              <p className="font-medium">Capability Mismatch</p>
              <p className="text-xs mt-1">
                This plan is for {plan.capability.replace(/_/g, " ")} shops.
                Update your shop capability to subscribe.
              </p>
            </div>
          )}

          {freemiumConsumed && isFreemium && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <p className="font-medium">Free trial already used</p>
              <p className="text-xs mt-1">
                You can only use one free trial per shop.
              </p>
            </div>
          )}

          {hasActiveSubscription && !isCurrentPlan && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p className="font-medium">Active subscription required</p>
              <p className="text-xs mt-1">
                Cancel your current subscription to switch plans.
              </p>
            </div>
          )}

          <Button
            className="w-full mt-4"
            onClick={() => handleSubscribe(plan)}
            disabled={
              subscribingPlanId === plan.id ||
              freemiumMutation.isPending ||
              checkoutMutation.isPending ||
              !canSubscribe ||
              capabilityMismatch
            }
            variant={isFreemium ? "default" : "default"}
          >
            {subscribingPlanId === plan.id ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isFreemium ? "Activating..." : "Processing..."}
              </>
            ) : isCurrentPlan ? (
              "Current Plan"
            ) : capabilityMismatch ? (
              "Update Shop Capability"
            ) : freemiumConsumed && isFreemium ? (
              "Already Used"
            ) : hasActiveSubscription && !isCurrentPlan ? (
              "Cancel Current Plan First"
            ) : isFreemium ? (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Use for Free
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Subscribe
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (!isSystemEnabled) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Subscription System Disabled
            </h3>
            <p className="text-muted-foreground">
              The subscription system is currently disabled. Please contact
              support for more information.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>
            Your active subscription plan and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : activeSubscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {activeSubscription.planName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activeSubscription.planId &&
                      (matchingPlans || [])?.find(
                        (p) => p.id === activeSubscription.planId,
                      )?.description}
                  </p>
                </div>
                <Badge
                  className={
                    activeSubscription.status === "ACTIVE"
                      ? "bg-green-500"
                      : activeSubscription.status === "EXPIRED"
                        ? "bg-gray-500"
                        : "bg-red-500"
                  }
                >
                  {activeSubscription.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Start Date:</span>
                  <p className="font-medium">
                    {format(
                      new Date(activeSubscription.startDate),
                      "MMM dd, yyyy",
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date:</span>
                  <p className="font-medium">
                    {format(
                      new Date(activeSubscription.endDate),
                      "MMM dd, yyyy",
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <p className="font-medium">
                    USD {activeSubscription.amountPaid?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Auto Renew:</span>
                  <p className="font-medium">
                    {activeSubscription.autoRenew ? (
                      <Check className="h-4 w-4 text-green-500 inline" />
                    ) : (
                      <X className="h-4 w-4 text-gray-500 inline" />
                    )}
                  </p>
                </div>
              </div>

              {/* Subscription Actions */}
              {activeSubscription.status === "ACTIVE" && (
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-renew">Auto Renew</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically renew this subscription when it expires
                      </p>
                    </div>
                    <Switch
                      id="auto-renew"
                      checked={activeSubscription.autoRenew || false}
                      onCheckedChange={handleToggleAutoRenew}
                      disabled={toggleAutoRenewMutation.isPending}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={cancelMutation.isPending}
                    className="w-full"
                  >
                    {cancelMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <Ban className="mr-2 h-4 w-4" />
                        Cancel Subscription
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active subscription</p>
              <p className="text-sm text-muted-foreground mt-2">
                Subscribe to a plan below to activate your shop
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans for Shop Capability */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            {shop.primaryCapability
              ? `Plans compatible with your shop capability: ${shop.primaryCapability.replace(/_/g, " ")}`
              : "Choose a subscription plan for your shop"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPlansLoading ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Loading subscription plans...
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          ) : hasPlansData && plans.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium mb-2">
                No Plans Available
              </p>
              <p className="text-sm text-muted-foreground">
                {shop.primaryCapability
                  ? `No subscription plans are currently available for ${shop.primaryCapability.replace(/_/g, " ")} shops. Please contact support or update your shop capability.`
                  : "No subscription plans are available. Please set your shop capability first."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => renderPlanCard(plan, true))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discover Other Plans */}
      {allActivePlans !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle>Discover Other Plans</CardTitle>
            <CardDescription>
              Plans for different shop capabilities. Update your shop capability
              to subscribe to these plans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allPlansLoading ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Loading other plans...
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </div>
            ) : otherPlans.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {otherPlans.map((plan) => renderPlanCard(plan, false))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No other plans available for different capabilities.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subscription History */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription History</CardTitle>
          <CardDescription>
            Past and present subscriptions for this shop
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{sub.planName}</h4>
                      <Badge
                        variant={
                          sub.status === "ACTIVE"
                            ? "default"
                            : sub.status === "EXPIRED"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {sub.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(sub.startDate), "MMM dd, yyyy")} -{" "}
                          {format(new Date(sub.endDate), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <div>
                        Amount: USD {sub.amountPaid?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No subscription history available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? Your
              subscription will remain active until the end of the current
              billing period, but it will not auto-renew.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
