"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardResponseDTO } from "@/lib/types/dashboard";
import { Clock, CheckCircle, Package, AlertCircle } from "lucide-react";

interface OrderStatusChartProps {
  data: DashboardResponseDTO | undefined;
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  if (!data) return null;

  const totalOrders = data.totalOrders || 0;
  const recentOrders = data.recentOrders || [];
  const pendingOrders = data.alerts?.pendingOrders || 0;

  // If no data, show empty state
  if (totalOrders === 0) {
    return (
      <Card className="col-span-4 lg:col-span-3">
        <CardHeader className="border-b border-border/50 bg-primary/5">
          <CardTitle className="text-primary">Order Overview</CardTitle>
          <CardDescription>No order data available</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <p>No orders have been placed yet.</p>
            <p className="mt-1 text-sm">
              Order information will appear here once orders are placed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/50 bg-primary/5">
        <CardTitle className="text-primary">Order Overview</CardTitle>
        <CardDescription>
          {totalOrders > 0 ? `${totalOrders} total orders` : "No orders yet"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-md">
              <div className="text-2xl font-bold text-primary">
                {totalOrders}
              </div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>

            <div className="text-center p-3 bg-muted/50 rounded-md">
              <div className="text-2xl font-bold text-amber-600">
                {pendingOrders}
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>

          {/* Recent Orders */}
          {recentOrders.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Recent Orders</h4>
              <div className="space-y-2">
                {recentOrders.slice(0, 3).map((order, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="text-sm font-medium">
                        #{order.orderId}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{order.owner}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-2">
            <div className="text-xs text-muted-foreground mb-2">
              Quick Actions
            </div>
            <div className="flex gap-2">
              <div className="flex-1 text-center p-2 bg-primary/10 rounded text-xs text-primary">
                View All Orders
              </div>
              <div className="flex-1 text-center p-2 bg-amber-100 rounded text-xs text-amber-700">
                Process Pending
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
