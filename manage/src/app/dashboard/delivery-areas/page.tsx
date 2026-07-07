"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  deliveryAreaService,
  DeliveryArea,
  CountryDeliveryAreas,
  CreateDeliveryAreaRequest,
  UpdateDeliveryAreaRequest,
} from "@/lib/services/delivery-area-service";
import { shopService } from "@/lib/services/shop-service";
import { warehouseService, WarehouseDTO } from "@/lib/services/warehouse-service";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  MapPin,
  Navigation,
  Loader2,
  Globe,
  Folder,
  FolderOpen,
} from "lucide-react";

// Tree Node Component for displaying delivery areas
function TreeNode({
  area,
  level = 0,
  expandedNodes,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddChild,
  shopId,
}: {
  area: DeliveryArea;
  level?: number;
  expandedNodes: Set<number>;
  onToggleExpand: (id: number) => void;
  onEdit: (area: DeliveryArea) => void;
  onDelete: (area: DeliveryArea) => void;
  onAddChild: (parent: DeliveryArea) => void;
  shopId: string;
}) {
  const hasChildren = area.children && area.children.length > 0;
  const isExpanded = expandedNodes.has(area.id);
  const indent = level * 24;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group"
        )}
        style={{ paddingLeft: `${indent + 12}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onToggleExpand(area.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-6" />
        )}

        {/* Folder Icon */}
        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )
        ) : (
          <MapPin className="h-4 w-4 text-muted-foreground ml-1" />
        )}

        {/* Area Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{area.name}</span>
            {!area.isActive && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
            {area.childrenCount !== undefined && area.childrenCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {area.childrenCount} {area.childrenCount === 1 ? "child" : "children"}
              </Badge>
            )}
          </div>
          {area.description && (
            <p className="text-sm text-muted-foreground truncate">{area.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              Warehouse: {area.warehouseName}
            </span>
            {area.depth !== undefined && (
              <span className="text-xs text-muted-foreground">• Depth: {area.depth}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onAddChild(area)}
            title="Add sub-area"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(area)}
            title="Edit area"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(area)}
            title="Delete area"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Render Children */}
      {hasChildren && isExpanded && (
        <div>
          {area.children!.map((child) => (
            <TreeNode
              key={child.id}
              area={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              shopId={shopId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DeliveryAreasPage() {
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shopSlug");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);
  const [deletingArea, setDeletingArea] = useState<DeliveryArea | null>(null);
  const [parentArea, setParentArea] = useState<DeliveryArea | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateDeliveryAreaRequest>({
    name: "",
    description: "",
    country: "",
    warehouseId: 0,
    parentId: undefined,
  });

  // Get shop ID from slug
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["shop-by-slug", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug,
  });

  // Get warehouses for the shop
  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses", shop?.shopId],
    queryFn: () => warehouseService.getWarehouses(0, 100, shop!.shopId),
    enabled: !!shop?.shopId,
  });

  // Get countries with delivery areas
  const {
    data: countriesData,
    isLoading: countriesLoading,
  } = useQuery({
    queryKey: ["delivery-areas-countries", shop?.shopId],
    queryFn: () => deliveryAreaService.getCountriesWithDeliveryAreas(shop!.shopId),
    enabled: !!shop?.shopId,
  });

  // Get delivery areas with filters and pagination
  const {
    data: areasData,
    isLoading: areasLoading,
  } = useQuery({
    queryKey: [
      "delivery-areas",
      shop?.shopId,
      searchQuery,
      selectedCountry,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      deliveryAreaService.getDeliveryAreas(shop!.shopId, {
        searchQuery: searchQuery || undefined,
        country: selectedCountry || undefined,
        page: currentPage,
        size: pageSize,
        sortBy: "name",
        sortDirection: "ASC",
      }),
    enabled: !!shop?.shopId,
  });

  // Get delivery areas tree for selected country (when no search filter, for tree view)
  const {
    data: areasTreeData,
    isLoading: areasTreeLoading,
  } = useQuery({
    queryKey: ["delivery-areas-tree", shop?.shopId, selectedCountry],
    queryFn: () =>
      deliveryAreaService.getDeliveryAreasTreeByCountry(shop!.shopId, selectedCountry!),
    enabled: !!shop?.shopId && !!selectedCountry && !searchQuery,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateDeliveryAreaRequest) =>
      deliveryAreaService.createDeliveryArea(shop!.shopId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-areas-countries", shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ["delivery-areas-tree", shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ["delivery-areas", shop?.shopId] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Delivery area created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create delivery area.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ areaId, data }: { areaId: number; data: UpdateDeliveryAreaRequest }) =>
      deliveryAreaService.updateDeliveryArea(shop!.shopId, areaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-areas-countries", shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ["delivery-areas-tree", shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ["delivery-areas", shop?.shopId] });
      setIsEditDialogOpen(false);
      setEditingArea(null);
      resetForm();
      toast({
        title: "Success",
        description: "Delivery area updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update delivery area.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (areaId: number) =>
      deliveryAreaService.deleteDeliveryArea(shop!.shopId, areaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-areas-countries", shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ["delivery-areas-tree", shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ["delivery-areas", shop?.shopId] });
      setIsDeleteDialogOpen(false);
      setDeletingArea(null);
      toast({
        title: "Success",
        description: "Delivery area deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete delivery area.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleToggleExpand = (id: number) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleExpandAll = () => {
    if (!areasTreeData) return;
    const allIds = new Set<number>();
    const collectIds = (areas: DeliveryArea[]) => {
      areas.forEach((area) => {
        if (area.children && area.children.length > 0) {
          allIds.add(area.id);
          collectIds(area.children);
        }
      });
    };
    collectIds(areasTreeData);
    setExpandedNodes(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  const handleCreateClick = (parent?: DeliveryArea) => {
    setParentArea(parent || null);
    if (parent) {
      setFormData({
        name: "",
        description: "",
        country: parent.country,
        warehouseId: parent.warehouseId,
        parentId: parent.id,
      });
    } else {
      resetForm();
    }
    setIsCreateDialogOpen(true);
  };

  const handleEditClick = (area: DeliveryArea) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      description: area.description || "",
      country: area.country,
      warehouseId: area.warehouseId,
      parentId: area.parentId,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (area: DeliveryArea) => {
    setDeletingArea(area);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateSubmit = () => {
    if (!formData.name || !formData.country || !formData.warehouseId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdateSubmit = () => {
    if (!editingArea || !formData.name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      areaId: editingArea.id,
      data: {
        name: formData.name,
        description: formData.description,
        parentId: formData.parentId || null,
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (deletingArea) {
      deleteMutation.mutate(deletingArea.id);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      country: "",
      warehouseId: 0,
      parentId: undefined,
    });
    setParentArea(null);
  };

  // Get warehouses for selected country
  const warehousesForCountry = warehousesData?.content.filter(
    (w) => w.country.toLowerCase() === formData.country.toLowerCase()
  ) || [];

  if (shopLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!shop) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Navigation className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Shop Not Found</h3>
            <p className="text-muted-foreground">
              Please select a shop to view delivery areas.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Areas</h1>
          <p className="text-muted-foreground">
            Manage delivery areas and sub-areas for {shop.name}
          </p>
        </div>
        <Button onClick={() => handleCreateClick()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Delivery Area
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or description..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(0); // Reset to first page on search
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setCurrentPage(0);
                    }
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={selectedCountry || "ALL"}
                onValueChange={(value) => {
                  setSelectedCountry(value === "ALL" ? null : value);
                  setExpandedNodes(new Set());
                  setCurrentPage(0); // Reset to first page on filter change
                }}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Countries</SelectItem>
                  {countriesData?.map((c) => (
                    <SelectItem key={c.country} value={c.country}>
                      {c.country}
                      {c.deliversEverywhere && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Delivers Everywhere)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={handleExpandAll}
                className="flex-1"
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                onClick={handleCollapseAll}
                className="flex-1"
              >
                Collapse All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Countries and Delivery Areas Tree */}
      {countriesLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      ) : searchQuery ? (
        // Show filtered list when search is applied
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {selectedCountry ? selectedCountry : "All Countries"}
                </CardTitle>
                <CardDescription>
                  {searchQuery && `Searching for: "${searchQuery}"`}
                  {selectedCountry && !searchQuery && `Filtered by country: ${selectedCountry}`}
                  {areasData && `Showing ${areasData.content.length} of ${areasData.totalElements} areas`}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateClick()}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Area
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {areasLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : areasData && areasData.content.length > 0 ? (
              <>
                <div className="space-y-1 border rounded-lg p-2">
                  {areasData.content.map((area) => (
                    <TreeNode
                      key={area.id}
                      area={area}
                      expandedNodes={expandedNodes}
                      onToggleExpand={handleToggleExpand}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      onAddChild={handleCreateClick}
                      shopId={shop.shopId}
                    />
                  ))}
                </div>
                {/* Pagination */}
                {areasData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {areasData.number * areasData.size + 1} to{" "}
                      {Math.min(
                        (areasData.number + 1) * areasData.size,
                        areasData.totalElements
                      )}{" "}
                      of {areasData.totalElements} areas
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={areasData.first || areasLoading}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={areasData.last || areasLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Delivery Areas Found</p>
                <p className="text-sm mb-4">
                  {searchQuery
                    ? `No areas match your search "${searchQuery}"`
                    : selectedCountry
                    ? `This shop delivers everywhere in ${selectedCountry}`
                    : "No delivery areas found"}
                </p>
                <Button onClick={() => handleCreateClick()} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Delivery Area
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : selectedCountry ? (
        // Show tree for selected country when no search
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {selectedCountry}
                </CardTitle>
                <CardDescription>
                  {areasTreeData && areasTreeData.length > 0
                    ? `${areasTreeData.length} root area${areasTreeData.length === 1 ? "" : "s"}`
                    : "No delivery areas defined - delivers everywhere in this country"}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateClick()}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Root Area
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {areasTreeLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : areasTreeData && areasTreeData.length > 0 ? (
              <div className="space-y-1 border rounded-lg p-2">
                {areasTreeData.map((area) => (
                  <TreeNode
                    key={area.id}
                    area={area}
                    expandedNodes={expandedNodes}
                    onToggleExpand={handleToggleExpand}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onAddChild={handleCreateClick}
                    shopId={shop.shopId}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Delivery Areas</p>
                <p className="text-sm mb-4">
                  This shop delivers everywhere in {selectedCountry}
                </p>
                <Button onClick={() => handleCreateClick()} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Delivery Area
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Show all countries
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {countriesData?.map((country) => (
            <Card
              key={country.country}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedCountry(country.country)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {country.country}
                </CardTitle>
                <CardDescription>
                  {country.hasWarehouse ? "Has warehouse" : "No warehouse"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {country.deliversEverywhere ? (
                    <Badge variant="secondary" className="w-full justify-center">
                      Delivers Everywhere
                    </Badge>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Areas:</span>
                        <span className="font-medium">{country.totalAreasCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Root Areas:</span>
                        <span className="font-medium">
                          {country.rootAreas?.length || 0}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {parentArea ? "Create Sub-Area" : "Create Delivery Area"}
            </DialogTitle>
            <DialogDescription>
              {parentArea
                ? `Create a sub-area under "${parentArea.name}"`
                : "Create a new delivery area. The warehouse must be in the same country."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Area Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Dodoma, Dar es Salaam"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            {!parentArea && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="country">
                    Country <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        country: value,
                        warehouseId: 0,
                      });
                    }}
                  >
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countriesData?.map((c) => (
                        <SelectItem key={c.country} value={c.country}>
                          {c.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse">
                    Warehouse <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.warehouseId ? String(formData.warehouseId) : ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, warehouseId: parseInt(value) })
                    }
                    disabled={!formData.country || warehousesForCountry.length === 0}
                  >
                    <SelectTrigger id="warehouse">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehousesForCountry.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name} - {w.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.country && warehousesForCountry.length === 0 && (
                    <p className="text-sm text-destructive">
                      No warehouses found in {formData.country}
                    </p>
                  )}
                </div>
              </>
            )}
            {parentArea && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Parent:</strong> {parentArea.name}
                  <br />
                  <strong>Country:</strong> {parentArea.country}
                  <br />
                  <strong>Warehouse:</strong> {parentArea.warehouseName}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Delivery Area</DialogTitle>
            <DialogDescription>
              Update the delivery area details. You can change the parent to reorganize the tree.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Area Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            {editingArea && (
              <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
                <p>
                  <strong>Country:</strong> {editingArea.country}
                </p>
                <p>
                  <strong>Warehouse:</strong> {editingArea.warehouseName}
                </p>
                <p>
                  <strong>Current Parent:</strong>{" "}
                  {editingArea.parentName || "Root (no parent)"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSubmit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Delivery Area
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingArea?.name}</strong>?
              <br />
              <br />
              This will also delete all sub-areas under this area.
              <br />
              <strong className="text-destructive">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingArea(null);
              }}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
