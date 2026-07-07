"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RotateCcw,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import {
  ReturnRequestDTO,
  ReturnStatus,
  ReturnRequestSearchParams,
  ReturnRequestFilters,
} from "@/types/return";
import returnService from "@/services/returnService";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import DeliveryAgentAssignmentModal from "@/components/DeliveryAgentAssignmentModal";
import deliveryAssignmentService from "@/lib/services/delivery-assignment-service";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { shopService } from "@/lib/services/shop-service";
import { useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import { useRouter } from "next/navigation";

function ReturnRequestsPageContent() {
  const [returnRequests, setReturnRequests] = useState<ReturnRequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | "ALL">("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<
    "ALL" | "REGISTERED" | "GUEST"
  >("ALL");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    denied: 0,
    completed: 0,
  });
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedReturnRequest, setSelectedReturnRequest] =
    useState<ReturnRequestDTO | null>(null);

  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shopSlug");
  const [shopId, setShopId] = useState<string | null>(null);
  const { user } = useAppSelector((state: RootState) => state.auth);
  const router = useRouter();

  // Fetch shop by slug to get shopId
  const { data: shopData, error: shopError } = useQuery({
    queryKey: ["shop", shopSlug],
    queryFn: () => {
      if (!shopSlug) return null;
      return shopService.getShopBySlug(shopSlug);
    },
    enabled: !!shopSlug,
  });

  // Handle shop fetch error
  useEffect(() => {
    if (shopError) {
      console.error("Failed to fetch shop:", shopError);
      toast.error("Shop not found or access denied");
      router.push("/shops");
    }
  }, [shopError, router]);

  useEffect(() => {
    if (shopData) {
      setShopId(shopData.shopId);
    }
  }, [shopData]);

  // Create filters object from current state
  const getCurrentFilters = useCallback(
    (): ReturnRequestFilters => ({
      status: statusFilter,
      customerType: customerTypeFilter,
      search: searchTerm,
      shopId: shopId || undefined,
    }),
    [statusFilter, customerTypeFilter, searchTerm, shopId],
  );

  const fetchReturnRequests = async () => {
    // For vendors, shopId is required
    if (user?.role === "VENDOR" && !shopId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const filters = getCurrentFilters();

      // Single API call with all filters and pagination
      const response = await returnService.getAllReturnRequests({
        page: currentPage,
        size: pageSize,
        sort: "submittedAt",
        direction: sortDirection,
        filters,
      });

      setReturnRequests(response.content || []);
      setTotalElements(response.totalElements || 0);

      // Fetch statistics with the same filters (excluding status to get all statuses)
      const stats = await returnService.getReturnStatistics({
        customerType: customerTypeFilter,
        search: searchTerm,
        shopId: shopId || undefined,
      });
      setStatistics(stats);
    } catch (error) {
      console.error("Failed to fetch return requests:", error);
      toast.error("Failed to load return requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnRequests();
  }, [currentPage, statusFilter, customerTypeFilter, sortDirection, shopId]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== "") {
        setCurrentPage(0);
        fetchReturnRequests();
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSearch = () => {
    setCurrentPage(0);
    fetchReturnRequests();
  };

  const handleRefresh = () => {
    fetchReturnRequests();
  };

  const handleSortChange = (direction: "ASC" | "DESC") => {
    setSortDirection(direction);
    setCurrentPage(0);
  };

  const getStatusBadge = (status: ReturnStatus) => {
    const statusConfig = {
      PENDING: {
        variant: "secondary" as const,
        icon: Clock,
        color: "text-yellow-600",
      },
      APPROVED: {
        variant: "default" as const,
        icon: CheckCircle,
        color: "text-green-600",
      },
      DENIED: {
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-red-600",
      },
      COMPLETED: {
        variant: "default" as const,
        icon: CheckCircle,
        color: "text-green-600",
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const calculateTotalRefundAmount = (returnRequest: ReturnRequestDTO) => {
    if (
      returnRequest.totalAmount !== undefined &&
      returnRequest.totalAmount !== null
    ) {
      return returnRequest.totalAmount;
    }
    return (returnRequest.returnItems || []).reduce(
      (total, item) => total + (item.totalPrice || 0),
      0,
    );
  };

  const handleAssignAgent = (returnRequest: ReturnRequestDTO) => {
    setSelectedReturnRequest(returnRequest);
    setAssignmentModalOpen(true);
  };

  const handleAssignmentComplete = async () => {
    try {
      toast.success(
        `Delivery agent assigned successfully to return request #${selectedReturnRequest!.id}`,
      );

      // Refresh the return requests list
      await fetchReturnRequests();

      // Close modal
      setAssignmentModalOpen(false);
      setSelectedReturnRequest(null);
    } catch (error: any) {
      console.error("Error refreshing return requests:", error);
      toast.error(
        "Assignment successful, but failed to refresh the list. Please refresh manually.",
      );
    }
  };

  const canAssignAgent = (returnRequest: ReturnRequestDTO) => {
    return returnRequest.status === "APPROVED";
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Return Requests</h1>
          <p className="text-muted-foreground">
            Manage and review customer return requests
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statistics.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.approved}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denied</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statistics.denied}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Active Filters Display */}
            {(statusFilter !== "ALL" ||
              customerTypeFilter !== "ALL" ||
              searchTerm) && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
                <span className="text-sm font-medium">Active filters:</span>
                {statusFilter !== "ALL" && (
                  <Badge variant="secondary">Status: {statusFilter}</Badge>
                )}
                {customerTypeFilter !== "ALL" && (
                  <Badge variant="secondary">
                    Customer: {customerTypeFilter}
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary">Search: "{searchTerm}"</Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setCustomerTypeFilter("ALL");
                    setSearchTerm("");
                    setCurrentPage(0);
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order number, customer name, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-2">
                <div className="min-w-[150px]">
                  <label className="text-sm font-medium mb-2 block">
                    Status
                  </label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(value as ReturnStatus | "ALL")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="DENIED">Denied</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <label className="text-sm font-medium mb-2 block">
                    Customer Type
                  </label>
                  <Select
                    value={customerTypeFilter}
                    onValueChange={(value) =>
                      setCustomerTypeFilter(
                        value as "ALL" | "REGISTERED" | "GUEST",
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Customers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Customers</SelectItem>
                      <SelectItem value="REGISTERED">Registered</SelectItem>
                      <SelectItem value="GUEST">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <label className="text-sm font-medium mb-2 block">
                    Sort Order
                  </label>
                  <Select
                    value={sortDirection}
                    onValueChange={(value) =>
                      handleSortChange(value as "ASC" | "DESC")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sort Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DESC">Latest First</SelectItem>
                      <SelectItem value="ASC">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSearch} className="lg:self-end">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Return Requests</CardTitle>
          <CardDescription>
            {totalElements} total return requests found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">
                  Loading return requests...
                </p>
                <p className="text-sm text-muted-foreground">
                  Please wait while we fetch the data
                </p>
              </div>
            </div>
          ) : (returnRequests || []).length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No return requests found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search criteria.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Return ID</TableHead>
                      <TableHead className="min-w-[140px]">
                        Order Number
                      </TableHead>
                      <TableHead className="min-w-[200px]">Customer</TableHead>
                      <TableHead className="min-w-[100px]">Items</TableHead>
                      <TableHead className="min-w-[120px]">
                        Refund Amount
                      </TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[140px]">
                        Delivery Agent
                      </TableHead>
                      <TableHead className="min-w-[160px]">Submitted</TableHead>
                      <TableHead className="min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnRequests.map((returnRequest) => (
                      <TableRow key={returnRequest.id}>
                        <TableCell className="font-mono text-sm">
                          #{String(returnRequest.id).slice(-8)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {returnRequest.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {returnRequest.customerName || "Guest User"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {returnRequest.customerEmail || "No email"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {(returnRequest.returnItems || []).length} item(s)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {formatCurrency(
                                calculateTotalRefundAmount(returnRequest),
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(returnRequest.status)}
                        </TableCell>
                        <TableCell>
                          {returnRequest.deliveryAgentName ? (
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium">
                                {returnRequest.deliveryAgentName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm">
                                {format(
                                  new Date(returnRequest.submittedAt),
                                  "MMM dd, yyyy",
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(
                                  new Date(returnRequest.submittedAt),
                                  { addSuffix: true },
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/returns/${returnRequest.id}${shopSlug ? `?shopSlug=${shopSlug}` : ""}`}
                            >
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </Link>
                            {canAssignAgent(returnRequest) && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAssignAgent(returnRequest)}
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                Assign Agent
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {returnRequests.map((returnRequest) => (
                  <Card key={returnRequest.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm">
                          #{String(returnRequest.id).slice(-8)}
                        </div>
                        {getStatusBadge(returnRequest.status)}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Order:
                          </span>
                          <span className="font-medium">
                            {returnRequest.orderNumber}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Customer:
                          </span>
                          <span className="text-sm">
                            {returnRequest.customerName || "Guest User"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Items:
                          </span>
                          <span className="text-sm">
                            {(returnRequest.returnItems || []).length} item(s)
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Refund:
                          </span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(
                              calculateTotalRefundAmount(returnRequest),
                            )}
                          </span>
                        </div>

                        {returnRequest.deliveryAgentName && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Delivery Agent:
                            </span>
                            <span className="text-sm flex items-center gap-1">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              {returnRequest.deliveryAgentName}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Submitted:
                          </span>
                          <span className="text-sm">
                            {formatDistanceToNow(
                              new Date(returnRequest.submittedAt),
                              { addSuffix: true },
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/returns/${returnRequest.id}`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                        {canAssignAgent(returnRequest) && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAssignAgent(returnRequest)}
                            className="flex-1"
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Assign Agent
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalElements > pageSize && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {currentPage * pageSize + 1} to{" "}
                {Math.min((currentPage + 1) * pageSize, totalElements)} of{" "}
                {totalElements} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage + 1} of{" "}
                  {Math.ceil(totalElements / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={(currentPage + 1) * pageSize >= totalElements}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Agent Assignment Modal */}
      <DeliveryAgentAssignmentModal
        open={assignmentModalOpen}
        onOpenChange={(open) => {
          setAssignmentModalOpen(open);
          if (!open) {
            setSelectedReturnRequest(null);
          }
        }}
        returnRequestId={Number(selectedReturnRequest?.id) || 0}
        returnRequestDetails={
          selectedReturnRequest
            ? {
                customerName:
                  selectedReturnRequest.customerName || "Guest User",
                orderNumber: selectedReturnRequest.orderNumber,
                submittedAt: selectedReturnRequest.submittedAt,
                reason: selectedReturnRequest.reason || "Return request",
              }
            : undefined
        }
        onAssignmentComplete={handleAssignmentComplete}
      />
    </div>
  );
}

export default function ReturnRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-6">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ReturnRequestsPageContent />
    </Suspense>
  );
}
