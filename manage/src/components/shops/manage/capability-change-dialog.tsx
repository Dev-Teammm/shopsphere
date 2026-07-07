"use client";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Package, RotateCcw, FileQuestion, Truck } from "lucide-react";
import { ShopCapability } from "@/lib/services/subscription-service";

interface CapabilityChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  currentCapability: ShopCapability | undefined;
  newCapability: ShopCapability;
  pendingOperations: {
    pendingOrders: number;
    pendingReturns: number;
    pendingAppeals: number;
    pendingDeliveries: number;
    total: number;
  };
  isLoading?: boolean;
}

const capabilityLabels: Record<ShopCapability, string> = {
  VISUALIZATION_ONLY: "Visualization Only",
  PICKUP_ORDERS: "Pickup Orders",
  FULL_ECOMMERCE: "Full E-commerce",
  HYBRID: "Hybrid",
};

export function CapabilityChangeDialog({
  open,
  onOpenChange,
  onConfirm,
  currentCapability,
  newCapability,
  pendingOperations,
  isLoading = false,
}: CapabilityChangeDialogProps) {
  const hasPendingOperations = pendingOperations.total > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirm Capability Change
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            You are about to change your shop capability from{" "}
            <strong>{currentCapability ? capabilityLabels[currentCapability] : "Unknown"}</strong> to{" "}
            <strong>{capabilityLabels[newCapability]}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {hasPendingOperations ? (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> You have pending operations that must be completed before the transition can finalize.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Pending Operations:</h4>
                <div className="grid grid-cols-2 gap-3">
                  {pendingOperations.pendingOrders > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                      <Package className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium text-sm">
                          {pendingOperations.pendingOrders}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pending Orders
                        </div>
                      </div>
                    </div>
                  )}

                  {pendingOperations.pendingReturns > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                      <RotateCcw className="h-4 w-4 text-orange-600" />
                      <div>
                        <div className="font-medium text-sm">
                          {pendingOperations.pendingReturns}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Return Requests
                        </div>
                      </div>
                    </div>
                  )}

                  {pendingOperations.pendingAppeals > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                      <FileQuestion className="h-4 w-4 text-purple-600" />
                      <div>
                        <div className="font-medium text-sm">
                          {pendingOperations.pendingAppeals}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pending Appeals
                        </div>
                      </div>
                    </div>
                  )}

                  {pendingOperations.pendingDeliveries > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                      <Truck className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium text-sm">
                          {pendingOperations.pendingDeliveries}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Active Deliveries
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> These operations will be maintained within the system and must be completed successfully. 
                  During the transition period, your shop will maintain both capabilities until all pending operations are resolved.
                  <br />
                  <br />
                  <strong className="text-destructive">
                    Poor handling of these operations can risk your shop being suspended.
                  </strong>
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No pending operations found. The capability change will be applied immediately.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? "Processing..." : "Confirm Change"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
