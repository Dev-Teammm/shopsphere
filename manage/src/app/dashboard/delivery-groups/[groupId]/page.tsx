"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  deliveryGroupsService,
  DeliveryGroupDTO,
} from "@/lib/services/delivery-groups-service";
import { useQuery } from "@tanstack/react-query";
import { shopService } from "@/lib/services/shop-service";
import { formatCurrency } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Package,
  User,
  Calendar,
  Clock,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function DeliveryGroupDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const groupId = Number(params.groupId);
  const shopSlug = searchParams.get("shopSlug");

  // Fetch shop data to get shopId
  const { data: shopData } = useQuery({
    queryKey: ["shop", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug,
  });

  const [group, setGroup] = useState<DeliveryGroupDTO | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchGroupDetails();
    fetchOrders();
  }, [groupId, currentPage, pageSize]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const data = await deliveryGroupsService.getGroupById(groupId);
      setGroup(data);
    } catch (error: any) {
      console.error("Error fetching group details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch group details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await deliveryGroupsService.getOrdersForGroup(
        groupId,
        currentPage,
        pageSize,
      );
      setOrders(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setOrdersLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!group) return null;

    if (group.hasDeliveryFinished) {
      return (
        <Badge
          variant="default"
          className="flex items-center w-fit gap-1 bg-green-600"
        >
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    }
    if (group.hasDeliveryStarted && group.deliveryStartedAt) {
      return (
        <Badge
          variant="default"
          className="flex items-center w-fit gap-1 bg-green-600"
        >
          <Truck className="h-3 w-3" />
          In Progress
        </Badge>
      );
    }
    if (group.scheduledAt) {
      return (
        <Badge
          variant="default"
          className="flex items-center w-fit gap-1 bg-yellow-600"
        >
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const formatCurrencyDisplay = (amount?: number) => {
    if (!amount) return "N/A";
    return formatCurrency(amount);
  };

  const getOrderStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: any; className?: string }
    > = {
      PENDING: { label: "Pending", variant: "secondary" },
      CONFIRMED: {
        label: "Confirmed",
        variant: "default",
        className: "bg-green-600",
      },
      PROCESSING: {
        label: "Processing",
        variant: "default",
        className: "bg-purple-600",
      },
      READY_FOR_DELIVERY: {
        label: "Ready",
        variant: "default",
        className: "bg-yellow-600",
      },
      OUT_FOR_DELIVERY: {
        label: "Out for Delivery",
        variant: "default",
        className: "bg-orange-600",
      },
      DELIVERED: {
        label: "Delivered",
        variant: "default",
        className: "bg-green-600",
      },
      CANCELLED: { label: "Cancelled", variant: "destructive" },
      REFUNDED: { label: "Refunded", variant: "outline" },
    };

    const config = statusMap[status] || { label: status, variant: "secondary" };
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Group Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The delivery group you're looking for doesn't exist.
            </p>
            <Button
              onClick={() =>
                router.push(
                  `/dashboard/delivery-groups${
                    shopSlug ? `?shopSlug=${shopSlug}` : ""
                  }`,
                )
              }
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(
                `/dashboard/delivery-groups${
                  shopSlug ? `?shopSlug=${shopSlug}` : ""
                }`,
              )
            }
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">
            {group.deliveryGroupName}
          </h1>
          <p className="text-muted-foreground">
            Delivery Group #{group.deliveryGroupId}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Group Information */}
      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
          <CardDescription>Details about this delivery group</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Group Name */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Group Name
              </label>
              <p className="text-base font-semibold mt-1">
                {group.deliveryGroupName}
              </p>
            </div>

            {/* Description */}
            {group.deliveryGroupDescription && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Description
                </label>
                <p className="text-base mt-1">
                  {group.deliveryGroupDescription}
                </p>
              </div>
            )}

            {/* Assigned Deliverer */}
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned Deliverer
              </label>
              <p className="text-base font-semibold mt-1">
                {group.delivererName || "Not Assigned"}
              </p>
              {group.delivererEmail && (
                <p className="text-sm text-muted-foreground">
                  {group.delivererEmail}
                </p>
              )}
            </div>

            {/* Total Orders */}
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Orders
              </label>
              <p className="text-base font-semibold mt-1">
                {group.orderCount || 0} orders
              </p>
            </div>

            {/* Created At */}
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created At
              </label>
              <p className="text-base mt-1">{formatDate(group.createdAt)}</p>
            </div>

            {/* Scheduled At */}
            {group.scheduledAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Scheduled At
                </label>
                <p className="text-base mt-1">
                  {formatDate(group.scheduledAt)}
                </p>
              </div>
            )}

            {/* Delivery Started At */}
            {group.deliveryStartedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Delivery Started At
                </label>
                <p className="text-base mt-1">
                  {formatDate(group.deliveryStartedAt)}
                </p>
              </div>
            )}

            {/* Delivery Finished At */}
            {group.deliveryFinishedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Delivery Finished At
                </label>
                <p className="text-base mt-1">
                  {formatDate(group.deliveryFinishedAt)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Orders in this Group</CardTitle>
              <CardDescription>
                {totalElements} order{totalElements !== 1 ? "s" : ""} in this
                delivery group
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3">Loading orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders</h3>
              <p className="text-muted-foreground">
                This delivery group doesn't have any orders yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Items
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Total Amount
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden xl:table-cell">
                        Created At
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {order.customerName}
                            </div>
                            {order.customerEmail && (
                              <div className="text-sm text-muted-foreground hidden sm:block">
                                {order.customerEmail}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {order.totalItems || 0} item
                          {order.totalItems !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {formatCurrencyDisplay(order.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {getOrderStatusBadge(order.status)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/orders/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
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
                  {totalElements} orders
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0 || ordersLoading}
                    className="hidden sm:inline-flex"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentPage === 0 || ordersLoading}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">
                      Page {currentPage + 1} of {totalPages || 1}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(totalPages - 1, prev + 1),
                      )
                    }
                    disabled={currentPage >= totalPages - 1 || ordersLoading}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1 || ordersLoading}
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
