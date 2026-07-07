"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  ShopDTO,
  StripeAccountDTO,
  shopService,
} from "@/lib/services/shop-service";

interface StripeAccountTabProps {
  shop: ShopDTO;
  onStripeConnected: () => void;
}

export function StripeAccountTab({
  shop,
  onStripeConnected,
}: StripeAccountTabProps) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  // Mock query to check Stripe account status - in real implementation, this would call an API
  const { data: stripeAccount, isLoading } = useQuery({
    queryKey: ["stripeAccount", shop.shopId],
    queryFn: async () => {
      // This would be replaced with actual API call to check Stripe account status
      return shop.stripeAccount || null;
    },
    enabled: !!shop.shopId,
  });

  const connectStripeMutation = useMutation({
    mutationFn: async () => {
      // Send empty object - backend will generate all mock credentials
      const stripeAccountData: Partial<StripeAccountDTO> = {};

      return shopService.connectStripeAccount(
        shop.shopId,
        stripeAccountData as StripeAccountDTO,
      );
    },
    onSuccess: (data) => {
      toast({
        title: "Stripe Account Connected",
        description:
          "Your mock Stripe account has been successfully created. Your shop is now active!",
        variant: "default",
      });
      onStripeConnected();
      setIsConnecting(false);
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description:
          error.message ||
          "Failed to connect Stripe account. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
    },
  });

  const handleConnectStripe = () => {
    setIsConnecting(true);

    // In a real implementation, this would redirect to Stripe OAuth
    // For demo purposes, we'll simulate the connection
    const stripeOAuthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID}&scope=read_write&redirect_uri=${encodeURIComponent(window.location.origin + "/api/stripe/callback")}&state=${shop.shopId}`;

    // For demo, we'll just call the mutation
    // In production, you'd redirect to: window.location.href = stripeOAuthUrl;
    connectStripeMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white gap-1">
            <AlertCircle className="h-3 w-3" />
            Pending Verification
          </Badge>
        );
      case "restricted":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 text-white gap-1">
            <AlertCircle className="h-3 w-3" />
            Restricted
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {status}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Account Connection
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to enable payment processing for your
            shop. This is required to activate your shop and start accepting
            payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {stripeAccount ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Stripe Account Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Account ID: {stripeAccount.stripeAccountId}
                    </p>
                  </div>
                </div>
                {getStatusBadge(stripeAccount.accountStatus || "unknown")}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Charges Enabled</p>
                  <div className="flex items-center gap-2">
                    {stripeAccount.chargesEnabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {stripeAccount.chargesEnabled ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Payouts Enabled</p>
                  <div className="flex items-center gap-2">
                    {stripeAccount.payoutsEnabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {stripeAccount.payoutsEnabled ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {stripeAccount.businessName && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">
                    Business Information
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {stripeAccount.businessName && (
                      <p>Business Name: {stripeAccount.businessName}</p>
                    )}
                    {stripeAccount.businessUrl && (
                      <p>Business URL: {stripeAccount.businessUrl}</p>
                    )}
                    {stripeAccount.supportEmail && (
                      <p>Support Email: {stripeAccount.supportEmail}</p>
                    )}
                    {stripeAccount.businessPhone && (
                      <p>Business Phone: {stripeAccount.businessPhone}</p>
                    )}
                  </div>
                </div>
              )}

              {stripeAccount.bankName && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">
                    Bank Account Information
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Bank Name: {stripeAccount.bankName}</p>
                    {stripeAccount.bankLast4 && (
                      <p>Account Ending: ****{stripeAccount.bankLast4}</p>
                    )}
                    {stripeAccount.routingNumber && (
                      <p>Routing Number: {stripeAccount.routingNumber}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900 mb-2">
                    Mock Credentials (Development Only)
                  </p>
                  <p className="text-xs text-green-700">
                    These are generated mock credentials for development and testing purposes.
                    In production, this would be replaced with real Stripe OAuth integration.
                  </p>
                  <div className="mt-2 text-xs text-green-800">
                    <p><strong>Stripe Account ID:</strong> {stripeAccount.stripeAccountId}</p>
                    <p><strong>Status:</strong> {stripeAccount.accountStatus}</p>
                    <p><strong>Country:</strong> {stripeAccount.country || 'US'}</p>
                    <p><strong>Currency:</strong> {stripeAccount.currency || 'USD'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    // In real implementation, this would redirect to Stripe Express Dashboard
                    window.open("https://dashboard.stripe.com/", "_blank");
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Stripe Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-6">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-yellow-600" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold">
                  Connect Your Stripe Account
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  To start accepting payments and activate your shop, you need
                  to connect a Stripe account. This secure connection allows you
                  to process payments and receive payouts.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-green-900">
                        Secure Connection
                      </p>
                      <p className="text-green-700">
                        Your financial data remains secure with Stripe's
                        industry-leading security standards.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleConnectStripe}
                  disabled={isConnecting}
                  size="lg"
                  className="gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Connect Stripe Account
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  By connecting your Stripe account, you agree to Stripe's Terms
                  of Service. You'll be redirected to Stripe to complete the
                  setup process.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {shop.status === "PENDING" && !stripeAccount && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">
                  Shop Activation Required
                </p>
                <p className="text-sm text-yellow-700">
                  Your shop is currently in pending status. Connect your Stripe
                  account above to activate it and start accepting orders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
