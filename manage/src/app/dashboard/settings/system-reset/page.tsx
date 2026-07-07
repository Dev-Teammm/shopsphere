"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  Package,
  ShoppingCart,
  Tag,
  Gift,
  Truck,
  DollarSign,
  FolderTree,
  Building2,
  Warehouse,
} from "lucide-react";
import apiClient from "@/lib/api-client";

interface SystemResetSelections {
  deleteProducts: boolean;
  deleteDiscounts: boolean;
  deleteOrders: boolean;
  deleteRewardSystems: boolean;
  deleteShippingCosts: boolean;
  deleteMoneyFlows: boolean;
  deleteCategories: boolean;
  deleteBrands: boolean;
  deleteWarehouses: boolean;
}

interface ResetStats {
  productsDeleted: number;
  discountsDeleted: number;
  ordersDeleted: number;
  rewardSystemsDeleted: number;
  shippingCostsDeleted: number;
  moneyFlowsDeleted: number;
  categoriesDeleted: number;
  brandsDeleted: number;
  warehousesDeleted: number;
  totalDeleted: number;
  executionTimeMs: number;
}

interface DeletionError {
  entityType: string;
  errorMessage: string;
  details: string;
}

interface SystemResetResponse {
  success: boolean;
  message: string;
  timestamp: string;
  stats: ResetStats;
  errors: DeletionError[];
}

export default function SystemResetPage() {
  const router = useRouter();
  const [selections, setSelections] = useState<SystemResetSelections>({
    deleteProducts: false,
    deleteDiscounts: false,
    deleteOrders: false,
    deleteRewardSystems: false,
    deleteShippingCosts: false,
    deleteMoneyFlows: false,
    deleteCategories: false,
    deleteBrands: false,
    deleteWarehouses: false,
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [resetResponse, setResetResponse] = useState<SystemResetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetOptions = [
    {
      key: "deleteProducts" as keyof SystemResetSelections,
      label: "Products",
      description: "All products with variants, images, videos, stocks, batches, cart items, and reviews",
      icon: Package,
      color: "text-green-500",
    },
    {
      key: "deleteOrders" as keyof SystemResetSelections,
      label: "Orders",
      description: "All orders with items, transactions, addresses, and delivery information",
      icon: ShoppingCart,
      color: "text-purple-500",
    },
    {
      key: "deleteDiscounts" as keyof SystemResetSelections,
      label: "Discounts",
      description: "All discount codes and promotional offers",
      icon: Tag,
      color: "text-green-500",
    },
    {
      key: "deleteRewardSystems" as keyof SystemResetSelections,
      label: "Reward Systems",
      description: "Loyalty programs, reward ranges, and user points",
      icon: Gift,
      color: "text-yellow-500",
    },
    {
      key: "deleteShippingCosts" as keyof SystemResetSelections,
      label: "Shipping Costs",
      description: "All shipping rate configurations",
      icon: Truck,
      color: "text-indigo-500",
    },
    {
      key: "deleteMoneyFlows" as keyof SystemResetSelections,
      label: "Money Flows",
      description: "Financial transaction records",
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      key: "deleteCategories" as keyof SystemResetSelections,
      label: "Categories",
      description: "Product categories and hierarchies",
      icon: FolderTree,
      color: "text-orange-500",
    },
    {
      key: "deleteBrands" as keyof SystemResetSelections,
      label: "Brands",
      description: "Product brands and manufacturers",
      icon: Building2,
      color: "text-pink-500",
    },
    {
      key: "deleteWarehouses" as keyof SystemResetSelections,
      label: "Warehouses",
      description: "Warehouse locations, stocks, and inventory",
      icon: Warehouse,
      color: "text-cyan-500",
    },
  ];

  const handleCheckboxChange = (key: keyof SystemResetSelections) => {
    setSelections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const hasSelections = () => {
    return Object.values(selections).some((value) => value);
  };

  const getSelectedCount = () => {
    return Object.values(selections).filter((value) => value).length;
  };

  const handleResetClick = () => {
    if (!hasSelections()) {
      setError("Please select at least one item to reset");
      return;
    }
    setError(null);
    setShowConfirmDialog(true);
  };

  const performReset = async () => {
    setShowConfirmDialog(false);
    setIsResetting(true);
    setError(null);

    try {
      const response = await apiClient.post<SystemResetResponse>(
        "/admin/system-reset/reset",
        selections
      );

      setResetResponse(response.data);
      setResetComplete(true);
    } catch (err: any) {
      console.error("Reset error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to perform system reset. Please try again."
      );
    } finally {
      setIsResetting(false);
    }
  };

  const handleReset = () => {
    setResetComplete(false);
    setResetResponse(null);
    setError(null);
    setSelections({
      deleteProducts: false,
      deleteDiscounts: false,
      deleteOrders: false,
      deleteRewardSystems: false,
      deleteShippingCosts: false,
      deleteMoneyFlows: false,
      deleteCategories: false,
      deleteBrands: false,
      deleteWarehouses: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/settings")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-destructive flex items-center gap-2">
            <Trash2 className="w-8 h-8" />
            System Reset
          </h1>
          <p className="text-muted-foreground mt-1">
            Permanently delete selected data from your system
          </p>
        </div>
      </div>

      {/* Warning Alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Critical Warning</AlertTitle>
        <AlertDescription>
          System reset operations are <strong>irreversible</strong> and will
          permanently delete all selected data and their related records. Always
          backup your database before proceeding.
        </AlertDescription>
      </Alert>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Display */}
      {resetComplete && resetResponse && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Reset Completed Successfully
            </CardTitle>
            <CardDescription>
              {resetResponse.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {resetResponse.stats.productsDeleted > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Products</p>
                  <p className="text-2xl font-bold text-green-600">
                    {resetResponse.stats.productsDeleted}
                  </p>
                </div>
              )}
              {resetResponse.stats.ordersDeleted > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Orders</p>
                  <p className="text-2xl font-bold text-green-600">
                    {resetResponse.stats.ordersDeleted}
                  </p>
                </div>
              )}
              {resetResponse.stats.discountsDeleted > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Discounts</p>
                  <p className="text-2xl font-bold text-green-600">
                    {resetResponse.stats.discountsDeleted}
                  </p>
                </div>
              )}
              {resetResponse.stats.rewardSystemsDeleted > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Reward Systems</p>
                  <p className="text-2xl font-bold text-green-600">
                    {resetResponse.stats.rewardSystemsDeleted}
                  </p>
                </div>
              )}
              {resetResponse.stats.shippingCostsDeleted > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Shipping Costs</p>
                  <p className="text-2xl font-bold text-green-600">
                    {resetResponse.stats.shippingCostsDeleted}
                  </p>
                </div>
              )}
              {resetResponse.stats.moneyFlowsDeleted > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Money Flows</p>
                  <p className="text-2xl font-bold text-green-600">
                    {resetResponse.stats.moneyFlowsDeleted}
                  </p>
                </div>
              )}
              {resetResponse.stats.categoriesDeleted > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Categories</p>
                  <p className="text-2xl font-bold text-green-600">
                    {resetResponse.stats.categoriesDeleted}
                  </p>
                </div>
              )}
              {resetResponse.stats.brandsDeleted > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Brands</p>
                  <p className="text-2xl font-bold text-green-600">
                    {resetResponse.stats.brandsDeleted}
                  </p>
                </div>
              )}
              {resetResponse.stats.warehousesDeleted > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Warehouses</p>
                  <p className="text-2xl font-bold text-green-600">
                    {resetResponse.stats.warehousesDeleted}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Deleted</p>
                <p className="text-3xl font-bold text-green-600">
                  {resetResponse.stats.totalDeleted}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Execution Time</p>
                <p className="text-lg font-semibold">
                  {(resetResponse.stats.executionTimeMs / 1000).toFixed(2)}s
                </p>
              </div>
            </div>

            {resetResponse.errors && resetResponse.errors.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Errors Encountered ({resetResponse.errors.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {resetResponse.errors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertTitle className="text-sm">
                          {error.entityType}
                        </AlertTitle>
                        <AlertDescription className="text-xs">
                          {error.errorMessage}
                          {error.details && ` (${error.details})`}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleReset} className="w-full">
              Perform Another Reset
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Selection Interface */}
      {!resetComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Items to Reset</span>
              {getSelectedCount() > 0 && (
                <Badge variant="destructive">
                  {getSelectedCount()} selected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Choose which data you want to permanently delete from the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {resetOptions.map((option) => (
                <Card
                  key={option.key}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selections[option.key]
                      ? "border-destructive bg-destructive/5"
                      : ""
                  }`}
                  onClick={() => handleCheckboxChange(option.key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={option.key}
                        checked={selections[option.key]}
                        onCheckedChange={() => handleCheckboxChange(option.key)}
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={option.key}
                          className="flex items-center gap-2 cursor-pointer font-semibold"
                        >
                          <option.icon className={`w-5 h-5 ${option.color}`} />
                          {option.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/settings")}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetClick}
              disabled={!hasSelections() || isResetting}
              className="gap-2"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Reset Selected Items
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Loading State */}
      {isResetting && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-destructive" />
                <p className="text-lg font-semibold">
                  Performing system reset...
                </p>
              </div>
              <Progress value={undefined} className="w-full" />
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Please wait</AlertTitle>
                <AlertDescription>
                  The system is deleting selected data using multithreading for
                  optimal performance. This may take a few moments depending on
                  the amount of data.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm System Reset
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              following items and all their related data:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <ul className="space-y-2">
              {resetOptions
                .filter((option) => selections[option.key])
                .map((option) => (
                  <li
                    key={option.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <option.icon className={`w-4 h-4 ${option.color}`} />
                    <span className="font-medium">{option.label}</span>
                  </li>
                ))}
            </ul>
          </div>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Make sure you have backed up your database before proceeding.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={performReset}>
              Yes, Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
