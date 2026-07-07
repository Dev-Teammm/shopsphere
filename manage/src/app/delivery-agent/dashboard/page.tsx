"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Truck,
  Package,
  CheckCircle,
  MapPin,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Square,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  deliveryAgentService,
  DeliveryGroupDto,
  OrderDTO,
} from "@/lib/services/delivery-agent-service";
import { type DeliveryAgentDashboard } from "@/lib/services/delivery-agent-service";

export default function DeliveryAgentDashboard() {
  const [dashboardData, setDashboardData] =
    useState<DeliveryAgentDashboard | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [groupOrders, setGroupOrders] = useState<Record<number, OrderDTO[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
    groupId: number;
  } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await deliveryAgentService.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersForGroup = async (groupId: number) => {
    try {
      setLoadingOrders(groupId);
      const orders = await deliveryAgentService.getOrdersForGroup(groupId);
      setGroupOrders((prev) => ({
        ...prev,
        [groupId]: orders,
      }));
    } catch (err) {
      console.error("Error fetching orders for group:", err);
    } finally {
      setLoadingOrders(null);
    }
  };

  const toggleGroupExpansion = (groupId: number) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
    } else {
      setExpandedGroupId(groupId);
      if (!groupOrders[groupId]) {
        fetchOrdersForGroup(groupId);
      }
    }
  };

  const startDelivery = async (groupId: number) => {
    try {
      setActionLoading(groupId);
      setActionResult(null);

      const result = await deliveryAgentService.startDelivery(groupId);

      setActionResult({
        success: true,
        message: result.message || "Delivery started successfully!",
        groupId: groupId,
      });

      // Refresh dashboard data to show updated status
      await fetchDashboardData();
    } catch (error: any) {
      setActionResult({
        success: false,
        message: error.message || "Failed to start delivery",
        groupId: groupId,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const finishDelivery = async (groupId: number) => {
    try {
      setActionLoading(groupId);
      setActionResult(null);

      const result = await deliveryAgentService.finishDelivery(groupId);

      setActionResult({
        success: true,
        message: result.message || "Delivery finished successfully!",
        groupId: groupId,
      });

      // Refresh dashboard data to show updated status
      await fetchDashboardData();
    } catch (error: any) {
      setActionResult({
        success: false,
        message: error.message || "Failed to finish delivery",
        groupId: groupId,
      });
    } finally {
      setActionLoading(null);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
          <p className="text-muted-foreground">
            Here's your delivery dashboard overview
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Truck className="mr-1 h-3 w-3" />
          Active Agent
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.stats.totalGroups}
            </div>
            <p className="text-xs text-muted-foreground">All time deliveries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.stats.completedGroups}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.stats.totalOrders}
            </div>
            <p className="text-xs text-muted-foreground">Orders delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Result */}
      {actionResult && (
        <div
          className={`p-4 rounded-md border ${
            actionResult.success
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionResult.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <Square className="h-5 w-5" />
            )}
            <p className="font-medium">{actionResult.message}</p>
          </div>
        </div>
      )}

      {/* Current Delivery Groups */}
      {dashboardData.currentGroups.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Current Delivery Groups</h2>
          {dashboardData.currentGroups.map((group) => (
            <Card key={group.deliveryGroupId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      {group.deliveryGroupName}
                    </CardTitle>
                    <CardDescription>
                      {group.deliveryGroupDescription}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800"
                    >
                      {group.hasDeliveryStarted ? "In Progress" : "Active"}
                    </Badge>
                    {!group.hasDeliveryStarted && (
                      <Button
                        size="sm"
                        onClick={() => startDelivery(group.deliveryGroupId)}
                        disabled={actionLoading === group.deliveryGroupId}
                        className="flex items-center gap-1"
                      >
                        {actionLoading === group.deliveryGroupId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Start Delivery
                      </Button>
                    )}
                    {group.hasDeliveryStarted && !group.hasDeliveryFinished && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => finishDelivery(group.deliveryGroupId)}
                        disabled={actionLoading === group.deliveryGroupId}
                        className="flex items-center gap-1"
                      >
                        {actionLoading === group.deliveryGroupId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                        Finish Delivery
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created: {formatDate(group.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {group.memberCount} orders
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleGroupExpansion(group.deliveryGroupId)
                      }
                      className="flex items-center gap-1"
                      disabled={loadingOrders === group.deliveryGroupId}
                    >
                      {loadingOrders === group.deliveryGroupId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : expandedGroupId === group.deliveryGroupId ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Hide Orders
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          View Orders
                        </>
                      )}
                    </Button>
                  </div>

                  {expandedGroupId === group.deliveryGroupId && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                      <Separator />
                      <div className="space-y-3">
                        {groupOrders[group.deliveryGroupId]?.map((order) => (
                          <div
                            key={order.id}
                            className="rounded-md border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => {
                              window.location.href = `/delivery-agent/orders/${order.id}`;
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {order.orderNumber}
                                  </span>
                                </div>
                                <Badge variant="outline">{order.status}</Badge>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {formatCurrency(order.totalAmount)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {order.items.length} item
                                  {order.items.length !== 1 ? "s" : ""}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {order.customerName}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {order.shippingAddress.streetAddress},{" "}
                                {order.shippingAddress.city}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Groups */}
      {dashboardData.completedGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recent Completed Groups
            </CardTitle>
            <CardDescription>
              Your recent delivery group completions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.completedGroups.map((group) => (
                <div
                  key={group.deliveryGroupId}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium">
                        {group.deliveryGroupName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {group.deliveryGroupDescription}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {group.memberCount} orders
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(group.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Current Group State */}
      {dashboardData.currentGroups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No Active Delivery Group
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have any active delivery groups assigned at the moment.
              Check back later or contact your supervisor for new assignments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
