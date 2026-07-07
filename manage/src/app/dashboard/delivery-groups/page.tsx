"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Package,
  Search,
  Truck,
  User,
} from "lucide-react";
import {
  deliveryGroupsService,
  DeliveryGroupDTO,
} from "@/lib/services/delivery-groups-service";
import { toast } from "@/hooks/use-toast";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { shopService } from "@/lib/services/shop-service";

export default function DeliveryGroupsPage() {
  const [groups, setGroups] = useState<DeliveryGroupDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showSummaryCards, setShowSummaryCards] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const shopSlug = searchParams.get("shopSlug");

  // Fetch shop data to get shopId
  const { data: shopData, isLoading: shopLoading } = useQuery({
    queryKey: ["shop", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug,
  });

  const shopId = shopData?.shopId;

  // Redirect if no shopSlug is provided
  useEffect(() => {
    if (!shopSlug) {
      router.replace("/shops");
    }
  }, [shopSlug, router]);

  // Debounce search term for backend search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(0); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchGroups = async () => {
    if (!shopId) return;

    try {
      setLoading(true);
      const response = await deliveryGroupsService.getAllGroups(
        shopId,
        currentPage,
        pageSize,
        sortBy,
        sortDirection,
        debouncedSearch || undefined
      );
      setGroups(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error: any) {
      console.error("Error fetching delivery groups:", error);

      let errorMessage = "Failed to fetch delivery groups";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
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
    if (shopId) {
      fetchGroups();
    }
  }, [currentPage, pageSize, sortBy, sortDirection, debouncedSearch, shopId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (group: DeliveryGroupDTO) => {
    if (group.hasDeliveryStarted && group.deliveryStartedAt) {
      return (
        <Badge variant="default" className="flex items-center w-fit gap-1">
          <Truck className="h-3 w-3" />
          In Progress
        </Badge>
      );
    }
    if (group.scheduledAt) {
      return (
        <Badge variant="outline" className="flex items-center w-fit gap-1">
          <Clock className="h-3 w-3" />
          Scheduled
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center w-fit gap-1">
        <Package className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  // Client-side status filtering (backend handles search)
  const filteredGroups = groups.filter((group) => {
    // Status filter
    if (statusFilter === "all") return true;

    if (statusFilter === "inProgress") {
      return group.hasDeliveryStarted && group.deliveryStartedAt;
    }
    if (statusFilter === "scheduled") {
      return group.scheduledAt && !group.hasDeliveryStarted;
    }
    if (statusFilter === "pending") {
      return !group.scheduledAt && !group.hasDeliveryStarted;
    }

    return true;
  });

  // Calculate status counts from all groups (not filtered)
  const getStatusCounts = () => {
    const counts = {
      pending: 0,
      scheduled: 0,
      inProgress: 0,
      total: groups.length,
    };

    groups.forEach((group) => {
      if (group.hasDeliveryStarted && group.deliveryStartedAt) {
        counts.inProgress++;
      } else if (group.scheduledAt) {
        counts.scheduled++;
      } else {
        counts.pending++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setSearchTerm("");
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Delivery Groups
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage delivery groups and assignments
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSummaryCards(!showSummaryCards)}
          className="w-full sm:w-auto"
        >
          {showSummaryCards ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Summary
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show Summary
            </>
          )}
        </Button>
      </div>

      {/* Collapsible Status Summary Cards */}
      {showSummaryCards && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          {/* Mobile: Horizontal Scroll */}
          <div className="flex gap-3 overflow-x-auto pb-2 sm:hidden snap-x snap-mandatory scrollbar-hide">
            <Card
              className={`flex-shrink-0 w-[280px] cursor-pointer transition-all hover:shadow-md snap-start ${
                statusFilter === "all" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleStatusFilterChange("all")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Groups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts.total}</div>
              </CardContent>
            </Card>

            <Card
              className={`flex-shrink-0 w-[280px] cursor-pointer transition-all hover:shadow-md snap-start ${
                statusFilter === "pending" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleStatusFilterChange("pending")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {statusCounts.pending}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Not yet scheduled
                </p>
              </CardContent>
            </Card>

            <Card
              className={`flex-shrink-0 w-[280px] cursor-pointer transition-all hover:shadow-md snap-start ${
                statusFilter === "scheduled" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleStatusFilterChange("scheduled")}
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
                  Ready for delivery
                </p>
              </CardContent>
            </Card>

            <Card
              className={`flex-shrink-0 w-[280px] cursor-pointer transition-all hover:shadow-md snap-start ${
                statusFilter === "inProgress" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleStatusFilterChange("inProgress")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {statusCounts.inProgress}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently delivering
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Desktop: Grid */}
          <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                statusFilter === "all" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleStatusFilterChange("all")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Groups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts.total}</div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                statusFilter === "pending" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleStatusFilterChange("pending")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {statusCounts.pending}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Not yet scheduled
                </p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                statusFilter === "scheduled" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleStatusFilterChange("scheduled")}
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
                  Ready for delivery
                </p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                statusFilter === "inProgress" ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleStatusFilterChange("inProgress")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {statusCounts.inProgress}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently delivering
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    Pending
                  </div>
                </SelectItem>
                <SelectItem value="scheduled">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Scheduled
                  </div>
                </SelectItem>
                <SelectItem value="inProgress">
                  <div className="flex items-center gap-2">
                    <Truck className="h-3 w-3" />
                    In Progress
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created Date</SelectItem>
                <SelectItem value="deliveryGroupName">Name</SelectItem>
                <SelectItem value="scheduledAt">Scheduled Date</SelectItem>
                <SelectItem value="deliveryStartedAt">Started Date</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortDirection} onValueChange={setSortDirection}>
              <SelectTrigger className="w-full sm:w-[120px]">
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

      {/* Groups Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base md:text-lg">
                Delivery Groups
                {statusFilter !== "all" || debouncedSearch ? (
                  <span className="text-muted-foreground text-sm md:text-base">
                    {" "}
                    ({filteredGroups.length}
                    {debouncedSearch ? ` of ${totalElements}` : ""})
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm md:text-base">
                    {" "}
                    ({totalElements})
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                View and manage all delivery groups
                {(statusFilter !== "all" || debouncedSearch) && (
                  <span className="ml-2 text-primary">• Filters active</span>
                )}
              </CardDescription>
            </div>
            {(statusFilter !== "all" || debouncedSearch) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="w-full sm:w-auto"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                Loading delivery groups...
              </div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
              <h3 className="text-base md:text-lg font-semibold mb-2">
                No delivery groups found
              </h3>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                {debouncedSearch || statusFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "No delivery groups have been created yet."}
              </p>
              {(debouncedSearch || statusFilter !== "all") && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">
                        Group Name
                      </TableHead>
                      <TableHead className="min-w-[200px] hidden md:table-cell">
                        Description
                      </TableHead>
                      <TableHead className="min-w-[150px]">
                        Delivery Agent
                      </TableHead>
                      <TableHead className="min-w-[80px]">Orders</TableHead>
                      <TableHead className="min-w-[120px]">Status</TableHead>
                      <TableHead className="min-w-[100px] hidden lg:table-cell">
                        Created
                      </TableHead>
                      <TableHead className="min-w-[100px] hidden lg:table-cell">
                        Scheduled
                      </TableHead>
                      <TableHead className="min-w-[100px] hidden xl:table-cell">
                        Started
                      </TableHead>
                      <TableHead className="min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.map((group: DeliveryGroupDTO) => (
                      <TableRow key={group.deliveryGroupId}>
                        <TableCell className="font-medium">
                          {group.deliveryGroupName}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="max-w-xs truncate">
                            {group.deliveryGroupDescription || (
                              <span className="text-muted-foreground">
                                No description
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {group.delivererName ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">
                                {group.delivererName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Not assigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{group.orderCount}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(group)}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm">
                            {formatDateShort(group.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm">
                            {group.scheduledAt ? (
                              formatDateShort(group.scheduledAt)
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="text-sm">
                            {group.deliveryStartedAt ? (
                              formatDateShort(group.deliveryStartedAt)
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              router.push(
                                `/dashboard/delivery-groups/${group.deliveryGroupId}?shopSlug=${shopSlug}`
                              );
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Showing {currentPage * pageSize + 1} to{" "}
                  {Math.min((currentPage + 1) * pageSize, totalElements)} of{" "}
                  {totalElements} groups
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0 || loading}
                    className="hidden sm:inline-flex"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 0 || loading}
                  >
                    Previous
                  </Button>
                  <span className="text-xs sm:text-sm px-2">
                    Page {currentPage + 1} of {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1 || loading}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1 || loading}
                    className="hidden sm:inline-flex"
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
