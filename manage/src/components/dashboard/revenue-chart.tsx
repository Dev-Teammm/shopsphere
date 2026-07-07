"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardResponseDTO } from "@/lib/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import { Info, TrendingUp, TrendingDown } from "lucide-react";

interface RevenueChartProps {
  data: DashboardResponseDTO | undefined;
  isAdmin: boolean;
}

export function RevenueChart({ data, isAdmin }: RevenueChartProps) {
  // If no data or not admin, don't render this component
  if (!data || !isAdmin) return null;

  // Check if user has access to revenue data
  const hasRevenueAccess = data.totalRevenue !== null;

  if (!hasRevenueAccess) {
    return (
      <Card>
        <CardHeader className="border-b border-border/50 bg-primary/5">
          <CardTitle className="text-primary">Revenue Overview</CardTitle>
          <CardDescription>Revenue data not available</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <div className="flex justify-center mb-2">
              <Info className="h-6 w-6" />
            </div>
            <p>Revenue data is not available for your role.</p>
            <p className="mt-1 text-sm">Contact an administrator for access.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/50 bg-primary/5">
        <CardTitle className="text-primary">Revenue Overview</CardTitle>
        <CardDescription>Total revenue summary</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {formatCurrency(data.totalRevenue || 0)}
            </div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {data.totalOrders || 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Revenue per Order</span>
            <span className="text-lg font-semibold">
              {data.totalOrders > 0
                ? formatCurrency((data.totalRevenue || 0) / data.totalOrders)
                : formatCurrency(0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
