"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  warehouseService,
  WarehouseDTO,
} from "@/lib/services/warehouse-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Search,
  MapPin,
  Package,
  Building2,
  Phone,
  Mail,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { shopService } from "@/lib/services/shop-service";

export default function WarehousesPage() {
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseDTO | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // Extract shopSlug from URL
  const shopSlug = searchParams.get("shopSlug");

  // Fetch shop by slug to get shopId
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

  // Redirect to shops page if shopSlug is missing or shop fetch fails
  useEffect(() => {
    if (shopSlug) {
      if (isErrorShop || (!isLoadingShop && !shopData)) {
        toast({
          title: "Error",
          description: "Shop not found. Redirecting to shops page.",
          variant: "destructive",
        });
        router.push("/shops");
      }
    } else {
      // If no shopSlug, redirect to shops page
      router.push("/shops");
    }
  }, [shopSlug, isLoadingShop, isErrorShop, shopData, router]);

  const {
    data: warehousesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["warehouses", page, size, searchQuery, shopId],
    queryFn: () => {
      if (searchQuery.trim()) {
        return warehouseService.searchWarehouses(
          searchQuery,
          page,
          size,
          shopId,
        );
      }
      return warehouseService.getWarehouses(page, size, shopId);
    },
    enabled: !isLoadingShop && (shopSlug ? !!shopId : true),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => warehouseService.deleteWarehouse(id),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Warehouse deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete warehouse",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (warehouse: WarehouseDTO) => {
    if (
      window.confirm(`Are you sure you want to delete "${warehouse.name}"?`)
    ) {
      deleteMutation.mutate(warehouse.id);
    }
  };

  const handleViewProducts = (warehouse: WarehouseDTO) => {
    const url = `/dashboard/warehouses/${warehouse.id}/products${shopSlug ? `?shopSlug=${shopSlug}` : ""}`;
    router.push(url);
  };

  const handleEdit = (warehouse: WarehouseDTO) => {
    const url = `/dashboard/warehouses/${warehouse.id}/edit${shopSlug ? `?shopSlug=${shopSlug}` : ""}`;
    router.push(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatAddress = (warehouse: WarehouseDTO) => {
    return `${warehouse.address}, ${warehouse.city}, ${warehouse.country}`;
  };

  // Show loading state while fetching shop data
  if (isLoadingShop || (shopSlug && !shopId)) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load warehouses. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouses</h1>
          <p className="text-muted-foreground">
            Manage your warehouse locations and inventory
          </p>
        </div>
        <Button
          onClick={() =>
            router.push(
              `/dashboard/warehouses/create${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
            )
          }
          disabled={isLoadingShop || (shopSlug ? !shopId : false)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search warehouses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Warehouses
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehousesData?.totalElements || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Warehouses
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehousesData?.content?.filter((w) => w.isActive).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehousesData?.content?.reduce(
                (sum, w) => sum + w.productCount,
                0,
              ) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warehouses Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : warehousesData?.content?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No warehouses found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? "No warehouses match your search criteria."
                : "Get started by creating your first warehouse."}
            </p>
            <Button
              onClick={() =>
                router.push(
                  `/dashboard/warehouses/create${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
                )
              }
              disabled={isLoadingShop || (shopSlug ? !shopId : false)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Warehouse
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehousesData?.content?.map((warehouse) => (
            <Card
              key={warehouse.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {warehouse.description || "No description"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleViewProducts(warehouse)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Products
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(warehouse)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(warehouse)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Address */}
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    {formatAddress(warehouse)}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  {warehouse.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{warehouse.phone}</span>
                    </div>
                  )}
                  {warehouse.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{warehouse.email}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge
                      variant={warehouse.isActive ? "default" : "secondary"}
                    >
                      {warehouse.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">
                      {warehouse.productCount} products
                    </Badge>
                  </div>
                  {warehouse.capacity && (
                    <span className="text-sm text-muted-foreground">
                      Capacity: {warehouse.capacity}
                    </span>
                  )}
                </div>

                {/* Created Date */}
                <div className="text-xs text-muted-foreground">
                  Created: {formatDate(warehouse.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {warehousesData && warehousesData.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {warehousesData.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= warehousesData.totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
