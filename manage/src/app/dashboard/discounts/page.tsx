"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shopService } from "@/lib/services/shop-service";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Calendar,
  Clock,
  Edit,
  Eye,
  Plus,
  Search,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  discountService,
  DiscountDTO,
  CreateDiscountDTO,
} from "@/lib/services/discount-service";
import { toast } from "@/hooks/use-toast";
import { useToast } from "@/hooks/use-toast";
import { CreateDiscountForm } from "./components/CreateDiscountForm";
import { DiscountDetailsModal } from "./components/DiscountDetailsModal";
import { UpdateDiscountForm } from "./components/UpdateDiscountForm";

export default function DiscountsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const shopSlug = searchParams.get("shopSlug");
  const shopIdRef = useRef<string | null>(null);

  const [discounts, setDiscounts] = useState<DiscountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopLoading, setShopLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeOnly, setActiveOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountDTO | null>(
    null,
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<DiscountDTO | null>(
    null,
  );
  const [discountToUpdate, setDiscountToUpdate] = useState<DiscountDTO | null>(
    null,
  );

  // Fetch shopId from shopSlug
  useEffect(() => {
    const fetchShopId = async () => {
      if (!shopSlug) {
        toast({
          title: "Error",
          description: "Shop slug is required",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      try {
        setShopLoading(true);
        const shop = await shopService.getShopBySlug(shopSlug);
        shopIdRef.current = shop.shopId;
        // Store in sessionStorage for safety
        if (shop.shopId) {
          sessionStorage.setItem("selectedShopId", shop.shopId);
          sessionStorage.setItem("selectedShopSlug", shopSlug);
        }
      } catch (error: any) {
        console.error("Error fetching shop:", error);
        toast({
          title: "Error",
          description: "Failed to load shop information",
          variant: "destructive",
        });
        router.push("/dashboard");
      } finally {
        setShopLoading(false);
      }
    };

    fetchShopId();
  }, [shopSlug, router]);

  const fetchDiscounts = async () => {
    if (!shopIdRef.current) {
      return; // Wait for shopId to be loaded
    }

    try {
      setLoading(true);
      const response = await discountService.getAllDiscounts(
        shopIdRef.current,
        currentPage,
        pageSize,
        sortBy,
        sortDirection,
        activeOnly,
      );
      setDiscounts(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error: any) {
      console.error("Error fetching discounts:", error);

      // Handle different error formats
      let errorMessage = "Failed to fetch discounts";

      if (typeof error === "string") {
        errorMessage = error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopIdRef.current && !shopLoading) {
      fetchDiscounts();
    }
  }, [currentPage, pageSize, sortBy, sortDirection, activeOnly, shopLoading]);

  const handleCreateDiscount = async (discountData: CreateDiscountDTO) => {
    try {
      await discountService.createDiscount(discountData);
      toast({
        title: "Success",
        description: "Discount created successfully",
      });
      setShowCreateModal(false);
      fetchDiscounts();
    } catch (error: any) {
      console.error("Error creating discount:", error);

      // Handle different error formats
      let errorMessage = "Failed to create discount";

      if (typeof error === "string") {
        errorMessage = error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDiscount = async () => {
    if (!discountToDelete || !shopIdRef.current) return;

    try {
      await discountService.deleteDiscount(
        discountToDelete.discountId,
        shopIdRef.current,
      );
      toast({
        title: "Success",
        description: "Discount deleted successfully",
      });
      fetchDiscounts();
      setShowDeleteModal(false);
      setDiscountToDelete(null);
    } catch (error: any) {
      console.error("Error deleting discount:", error);

      // Handle different error formats
      let errorMessage = "Failed to delete discount";

      if (typeof error === "string") {
        errorMessage = error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const openDeleteModal = (discount: DiscountDTO) => {
    setDiscountToDelete(discount);
    setShowDeleteModal(true);
  };

  const openUpdateModal = (discount: DiscountDTO) => {
    setDiscountToUpdate(discount);
    setShowUpdateModal(true);
  };

  const handleUpdateDiscount = async (data: any) => {
    if (!discountToUpdate || !shopIdRef.current) return;

    try {
      await discountService.updateDiscount(
        discountToUpdate.discountId,
        shopIdRef.current,
        data,
      );
      toast({
        title: "Success",
        description: "Discount updated successfully",
      });
      fetchDiscounts();
      setShowUpdateModal(false);
      setDiscountToUpdate(null);
    } catch (error: any) {
      console.error("Error updating discount:", error);

      // Handle different error formats
      let errorMessage = "Failed to update discount";

      if (typeof error === "string") {
        errorMessage = error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (discount: DiscountDTO) => {
    setSelectedDiscount(discount);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDiscountStatus = (discount: DiscountDTO) => {
    const now = new Date();
    const startDate = new Date(discount.startDate);
    const endDate = discount.endDate ? new Date(discount.endDate) : null;

    // Check if discount is manually deactivated
    if (!discount.isActive) {
      return {
        label: "Inactive",
        variant: "secondary" as const,
        icon: <XCircle className="h-3 w-3 mr-1" />,
        description: "Manually deactivated",
      };
    }

    // Check if discount hasn't started yet (Scheduled)
    if (startDate > now) {
      return {
        label: "Scheduled",
        variant: "outline" as const,
        icon: <Clock className="h-3 w-3 mr-1" />,
        description: `Starts ${formatDate(discount.startDate)}`,
      };
    }

    // Check if discount has expired
    if (endDate && endDate < now) {
      return {
        label: "Expired",
        variant: "destructive" as const,
        icon: <XCircle className="h-3 w-3 mr-1" />,
        description: `Ended ${formatDate(endDate.toISOString())}`,
      };
    }

    // Discount is currently active
    return {
      label: "Active",
      variant: "default" as const,
      icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
      description: endDate
        ? `Until ${formatDate(endDate.toISOString())}`
        : "No end date",
    };
  };

  const getStatusBadge = (discount: DiscountDTO) => {
    const status = getDiscountStatus(discount);
    return (
      <div className="flex flex-col gap-1">
        <Badge variant={status.variant} className="flex items-center w-fit">
          {status.icon}
          {status.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {status.description}
        </span>
      </div>
    );
  };

  const getStatusCounts = () => {
    const counts = {
      scheduled: 0,
      active: 0,
      expired: 0,
      inactive: 0,
      total: discounts.length,
    };

    discounts.forEach((discount) => {
      const status = getDiscountStatus(discount);
      const label = status.label.toLowerCase();
      if (label === "scheduled") counts.scheduled++;
      else if (label === "active") counts.active++;
      else if (label === "expired") counts.expired++;
      else if (label === "inactive") counts.inactive++;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  const filteredDiscounts = discounts.filter((discount) => {
    // Search filter
    const matchesSearch =
      discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discount.discountCode?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === "all") return true;

    const status = getDiscountStatus(discount);
    return status.label.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discounts</h1>
          <p className="text-muted-foreground">
            Manage discounts and promotional offers
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button disabled={!shopIdRef.current || shopLoading}>
              <Plus className="mr-2 h-4 w-4" />
              Create Discount
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Discount</DialogTitle>
              <DialogDescription>
                Create a new discount for your products
              </DialogDescription>
            </DialogHeader>
            {shopIdRef.current && (
              <CreateDiscountForm
                onSubmit={handleCreateDiscount}
                shopId={shopIdRef.current}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "all" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setStatusFilter("all")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Discounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.total}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "scheduled" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setStatusFilter("scheduled")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statusCounts.scheduled}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Not started yet
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "active" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setStatusFilter("active")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statusCounts.active}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "expired" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setStatusFilter("expired")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statusCounts.expired}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Past end date</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "inactive" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setStatusFilter("inactive")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {statusCounts.inactive}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manually disabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search discounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Scheduled
                  </div>
                </SelectItem>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                  </div>
                </SelectItem>
                <SelectItem value="expired">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-3 w-3" />
                    Expired
                  </div>
                </SelectItem>
                <SelectItem value="inactive">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-3 w-3" />
                    Inactive
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="startDate">Start Date</SelectItem>
                <SelectItem value="endDate">End Date</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortDirection} onValueChange={setSortDirection}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Discounts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Discounts
                {statusFilter !== "all" || searchTerm ? (
                  <span className="text-muted-foreground">
                    {" "}
                    ({filteredDiscounts.length} of {totalElements})
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {" "}
                    ({totalElements})
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Manage your discount codes and promotional offers
                {(statusFilter !== "all" || searchTerm) && (
                  <span className="ml-2 text-primary">• Filters active</span>
                )}
              </CardDescription>
            </div>
            {(statusFilter !== "all" || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setSearchTerm("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {shopLoading || loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                {shopLoading
                  ? "Loading shop information..."
                  : "Loading discounts..."}
              </div>
            </div>
          ) : !shopIdRef.current ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Shop not found</h3>
              <p className="text-muted-foreground mb-4">
                Unable to load shop information. Please try again.
              </p>
            </div>
          ) : filteredDiscounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No discounts found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Create your first discount to get started."}
              </p>
              {(searchTerm || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchTerm("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDiscounts.map((discount) => (
                    <TableRow key={discount.discountId}>
                      <TableCell className="font-medium">
                        {discount.name}
                      </TableCell>
                      <TableCell>
                        {discount.discountCode ? (
                          <Badge variant="outline">
                            {discount.discountCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No code</span>
                        )}
                      </TableCell>
                      <TableCell>{discount.percentage}%</TableCell>
                      <TableCell>{getStatusBadge(discount)}</TableCell>
                      <TableCell>
                        {discount.usedCount} / {discount.usageLimit || "∞"}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(discount.startDate)}</div>
                          {discount.endDate && (
                            <div className="text-muted-foreground">
                              to {formatDate(discount.endDate)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(discount)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openUpdateModal(discount)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteModal(discount)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {currentPage * pageSize + 1} to{" "}
                  {Math.min((currentPage + 1) * pageSize, totalElements)} of{" "}
                  {totalElements} discounts
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount Details Modal */}
      {shopIdRef.current && (
        <DiscountDetailsModal
          discount={selectedDiscount}
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
          shopId={shopIdRef.current}
        />
      )}

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Discount</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the discount "
              {discountToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDiscount}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Discount</DialogTitle>
            <DialogDescription>
              Update the discount information below.
            </DialogDescription>
          </DialogHeader>
          {discountToUpdate && (
            <UpdateDiscountForm
              discount={discountToUpdate}
              onSubmit={handleUpdateDiscount}
              onCancel={() => {
                setShowUpdateModal(false);
                setDiscountToUpdate(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
