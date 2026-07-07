"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Truck,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  shippingCostService,
  ShippingCostDTO,
} from "@/lib/services/shipping-cost-service";
import { ShippingCostFilters } from "@/lib/types/shipping";
import { useToast } from "@/hooks/use-toast";
import { CreateShippingCostForm } from "@/components/shipping/CreateShippingCostForm";
import { EditShippingCostForm } from "@/components/shipping/EditShippingCostForm";
import { useSearchParams } from "next/navigation";
import { shopService } from "@/lib/services/shop-service";
import { formatCurrency } from "@/lib/utils";

export default function ShippingCostsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shopSlug");

  const {
    data: shopData,
    isLoading: isLoadingShop,
    isError: isErrorShop,
  } = useQuery({
    queryKey: ["shop", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug,
  });

  const shopId = shopData?.shopId;

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [filters, setFilters] = useState<ShippingCostFilters>({});
  const [selectedShippingCost, setSelectedShippingCost] =
    useState<ShippingCostDTO | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch shipping costs with pagination and filters
  const {
    data: shippingCostsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["shipping-costs", shopId, page, size, filters],
    queryFn: () => {
      if (filters.search) {
        return shippingCostService.searchShippingCosts(
          filters.search,
          page,
          size,
          shopId!,
        );
      }
      return shippingCostService.getAllShippingCosts(page, size, shopId!);
    },
    enabled: !!shopSlug && !!shopId && !isLoadingShop && !isErrorShop,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      shippingCostService.deleteShippingCost(id, shopId!),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shipping cost deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["shipping-costs"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete shipping cost",
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (id: number) =>
      shippingCostService.toggleShippingCostStatus(id, shopId!),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shipping cost status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["shipping-costs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update shipping cost",
        variant: "destructive",
      });
    },
  });

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPage(0);
  };

  const handleStatusFilter = (isActive: string) => {
    setFilters((prev) => ({
      ...prev,
      isActive: isActive === "all" ? undefined : isActive === "active",
    }));
    setPage(0);
  };

  const handleEdit = (shippingCost: ShippingCostDTO) => {
    setSelectedShippingCost(shippingCost);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (shippingCost: ShippingCostDTO) => {
    setSelectedShippingCost(shippingCost);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleActive = (shippingCost: ShippingCostDTO) => {
    toggleActiveMutation.mutate(shippingCost.id);
  };

  const formatCurrencyDisplay = (amount?: number) => {
    if (amount === undefined || amount === null) return "N/A";
    return formatCurrency(amount);
  };

  const formatNumber = (value?: number, decimals: number = 2) => {
    if (value === undefined || value === null) return "N/A";
    return value.toFixed(decimals);
  };

  if (!shopSlug) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Missing shopSlug. Please open this page from a shop context.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoadingShop || !shopId) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Loading shop information…</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load shipping costs. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping Costs</h1>
          <p className="text-muted-foreground">
            Manage shipping cost configurations for different regions
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Shipping Cost
        </Button>
      </div>

      {/* Single Active Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Only one shipping cost configuration can be active at a time.
          Activating a new configuration will automatically deactivate the
          currently active one.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter shipping costs by region and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search shipping costs..."
                  value={filters.search || ""}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={
                filters.isActive === undefined
                  ? "all"
                  : filters.isActive
                    ? "active"
                    : "inactive"
              }
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Costs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Cost Configurations</CardTitle>
          <CardDescription>
            {shippingCostsData?.totalElements || 0} total configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Base Fee</TableHead>
                      <TableHead>Distance Cost</TableHead>
                      <TableHead>Weight Cost</TableHead>
                      <TableHead>Free Shipping</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shippingCostsData?.content?.map((shippingCost) => (
                      <TableRow key={shippingCost.id}>
                        <TableCell className="font-medium">
                          {shippingCost.name}
                        </TableCell>
                        <TableCell>
                          {formatCurrencyDisplay(shippingCost.baseFee)}
                        </TableCell>
                        <TableCell>
                          {formatCurrencyDisplay(shippingCost.distanceKmCost)}
                          /km
                        </TableCell>
                        <TableCell>
                          {formatCurrencyDisplay(shippingCost.weightKgCost)}/kg
                        </TableCell>
                        <TableCell>
                          {formatCurrencyDisplay(
                            shippingCost.freeShippingThreshold,
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={shippingCost.isActive}
                              onCheckedChange={() =>
                                handleToggleActive(shippingCost)
                              }
                              disabled={toggleActiveMutation.isPending}
                            />
                            {shippingCost.isActive ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(shippingCost)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(shippingCost)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {shippingCostsData && shippingCostsData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {page * size + 1} to{" "}
                    {Math.min(
                      (page + 1) * size,
                      shippingCostsData.totalElements,
                    )}{" "}
                    of {shippingCostsData.totalElements} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= shippingCostsData.totalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Shipping Cost</DialogTitle>
            <DialogDescription>
              Add a new shipping cost configuration for a specific region.
            </DialogDescription>
          </DialogHeader>
          <CreateShippingCostForm
            shopId={shopId}
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["shipping-costs"] });
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Shipping Cost</DialogTitle>
            <DialogDescription>
              Update the shipping cost configuration.
            </DialogDescription>
          </DialogHeader>
          {selectedShippingCost && (
            <EditShippingCostForm
              shippingCost={selectedShippingCost}
              shopId={shopId}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedShippingCost(null);
                queryClient.invalidateQueries({ queryKey: ["shipping-costs"] });
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedShippingCost(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Shipping Cost</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedShippingCost?.name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedShippingCost &&
                deleteMutation.mutate(selectedShippingCost.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
