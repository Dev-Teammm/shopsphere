"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  RotateCcw,
  Package,
  User,
  MapPin,
  Calendar,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deliveryAgentReturnsService,
  DeliveryAgentReturnRequest,
  ReturnStatus,
  DeliveryStatus,
  ReturnRequestFilters,
} from "@/lib/services/delivery-agent-returns-service";
import { toast } from "sonner";

export default function DeliveryAgentReturnsPage() {
  const [filters, setFilters] = useState<ReturnRequestFilters>({
    page: 0,
    size: 10,
    sortBy: "createdAt",
    sortDirection: "desc",
    deliveryStatus: "ASSIGNED,PICKUP_SCHEDULED,PICKUP_IN_PROGRESS", // Default to incomplete statuses
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReturnStatus, setSelectedReturnStatus] = useState<string>("all");
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<string>("incomplete");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showStats, setShowStats] = useState(true);

  // Fetch return requests
  const {
    data: returnRequestsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["delivery-agent-returns", filters],
    queryFn: () => deliveryAgentReturnsService.getAssignedReturnRequests(filters),
    placeholderData: (previousData) => previousData,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["delivery-agent-stats"],
    queryFn: () => deliveryAgentReturnsService.getDeliveryAgentStats(),
  });

  // Apply filters
  const applyFilters = () => {
    const newFilters: ReturnRequestFilters = {
      ...filters,
      page: 0, // Reset to first page
      customerName: searchTerm || undefined,
      returnStatus: selectedReturnStatus !== "all" ? selectedReturnStatus : undefined,
      deliveryStatus: selectedDeliveryStatus === "incomplete" 
        ? "ASSIGNED,PICKUP_SCHEDULED,PICKUP_IN_PROGRESS" 
        : selectedDeliveryStatus !== "all" 
        ? selectedDeliveryStatus 
        : undefined,
    };

    // Apply date filters
    const today = new Date();
    switch (dateFilter) {
      case "today":
        newFilters.startDate = today.toISOString().split("T")[0];
        newFilters.endDate = today.toISOString().split("T")[0];
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        newFilters.startDate = yesterday.toISOString().split("T")[0];
        newFilters.endDate = yesterday.toISOString().split("T")[0];
        break;
      case "week":
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        newFilters.startDate = weekAgo.toISOString().split("T")[0];
        break;
      case "month":
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        newFilters.startDate = monthAgo.toISOString().split("T")[0];
        break;
    }

    setFilters(newFilters);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedReturnStatus("all");
    setSelectedDeliveryStatus("incomplete");
    setDateFilter("all");
    setFilters({
      page: 0,
      size: 10,
      sortBy: "createdAt",
      sortDirection: "desc",
      deliveryStatus: "ASSIGNED,PICKUP_SCHEDULED,PICKUP_IN_PROGRESS",
    });
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Failed to load return requests</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Return Requests</h1>
          <p className="text-muted-foreground">
            Manage your assigned return pickups
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            <RotateCcw className="mr-1 h-3 w-3" />
            {returnRequestsData?.totalElements || 0} Returns
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Hide Stats
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Show Stats
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {showStats && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssigned}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pickupScheduled}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pickupInProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pickupCompleted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="search">Search Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Return Status</Label>
              <Select value={selectedReturnStatus} onValueChange={setSelectedReturnStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="DENIED">Denied</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery Status</Label>
              <Select value={selectedDeliveryStatus} onValueChange={setSelectedDeliveryStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incomplete">Incomplete (Default)</SelectItem>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="PICKUP_SCHEDULED">Pickup Scheduled</SelectItem>
                  <SelectItem value="PICKUP_IN_PROGRESS">Pickup In Progress</SelectItem>
                  <SelectItem value="PICKUP_COMPLETED">Pickup Completed</SelectItem>
                  <SelectItem value="PICKUP_FAILED">Pickup Failed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="flex-1">
                <Filter className="mr-2 h-4 w-4" />
                Apply
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Return Requests</CardTitle>
          <CardDescription>
            Your assigned return pickup requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : returnRequestsData?.content.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <RotateCcw className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Return Requests</h3>
              <p className="text-muted-foreground text-center">
                No return requests match your current filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Order</TableHead>
                      <TableHead className="whitespace-nowrap">Customer</TableHead>
                      <TableHead className="whitespace-nowrap">Return Status</TableHead>
                      <TableHead className="whitespace-nowrap">Delivery Status</TableHead>
                      <TableHead className="whitespace-nowrap">Created</TableHead>
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnRequestsData?.content.map((returnRequest) => {
                      const returnStatusInfo = deliveryAgentReturnsService.getReturnStatusInfo(returnRequest.status);
                      const deliveryStatusInfo = deliveryAgentReturnsService.getDeliveryStatusInfo(returnRequest.deliveryStatus);
                      
                      return (
                        <TableRow key={returnRequest.id} className="hover:bg-muted/50">
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-medium">{returnRequest.orderNumber}</span>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(returnRequest.orderDate)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[250px]">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium whitespace-nowrap">{returnRequest.customerName}</span>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{returnRequest.customerEmail}</span>
                              </div>
                              {returnRequest.customerPhone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  {returnRequest.customerPhone}
                                </div>
                              )}
                              {returnRequest.customerAddress && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="line-clamp-2">{returnRequest.customerAddress}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge className={cn("text-xs", returnStatusInfo.color)}>
                              {returnStatusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge className={cn("text-xs", deliveryStatusInfo.color)}>
                              {deliveryStatusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {formatDate(returnRequest.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.location.href = `/delivery-agent/returns/${returnRequest.id}`;
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {returnRequestsData && returnRequestsData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {returnRequestsData.number * returnRequestsData.size + 1} to{" "}
                    {Math.min(
                      (returnRequestsData.number + 1) * returnRequestsData.size,
                      returnRequestsData.totalElements
                    )}{" "}
                    of {returnRequestsData.totalElements} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(returnRequestsData.number - 1)}
                      disabled={returnRequestsData.first}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {returnRequestsData.number + 1} of {returnRequestsData.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(returnRequestsData.number + 1)}
                      disabled={returnRequestsData.last}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
