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
import {
  UsersIcon,
  PackageIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  AlertTriangleIcon,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  className?: string;
}

function StatCard({
  title,
  value,
  description,
  icon,
  className = "",
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-1 bg-primary/10 rounded-lg text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsCardsProps {
  data: DashboardResponseDTO | undefined;
  isAdmin: boolean;
}

export function StatsCards({ data, isAdmin }: StatsCardsProps) {
  if (!data) return null;

  // Check if user has access to revenue data (ADMIN only)
  const hasRevenueAccess = data.totalRevenue !== null;

  // Cards that show data available from the backend DashboardResponseDTO
  const availableCards = [
    <StatCard
      key="total-orders"
      title="Total Orders"
      value={data.totalOrders || 0}
      description="All orders placed"
      icon={<ShoppingCartIcon className="h-4 w-4" />}
    />,
    <StatCard
      key="total-products"
      title="Total Products"
      value={data.totalProducts || 0}
      description="Product catalog size"
      icon={<PackageIcon className="h-4 w-4" />}
    />,
    <StatCard
      key="total-customers"
      title="Total Customers"
      value={data.totalCustomers || 0}
      description="Registered customers"
      icon={<UsersIcon className="h-4 w-4" />}
    />,
    <StatCard
      key="pending-orders"
      title="Pending Orders"
      value={data.alerts?.pendingOrders || 0}
      description="Orders awaiting processing"
      icon={<ShoppingCartIcon className="h-4 w-4" />}
      className={
        (data.alerts?.pendingOrders || 0) > 0 ? "border-amber-200" : ""
      }
    />,
    <StatCard
      key="low-stock"
      title="Low Stock"
      value={data.alerts?.lowStockProducts || 0}
      description="Products with low inventory"
      icon={<AlertTriangleIcon className="h-4 w-4" />}
      className={
        (data.alerts?.lowStockProducts || 0) > 0 ? "border-red-200" : ""
      }
    />,
  ];

  // Admin-only revenue card
  const adminCards =
    isAdmin && hasRevenueAccess
      ? [
          <StatCard
            key="total-revenue"
            title="Total Revenue"
            value={formatCurrency(data.totalRevenue || 0)}
            description="All-time earnings"
            icon={<CreditCardIcon className="h-4 w-4" />}
          />,
        ]
      : [];

  // Combine all applicable cards
  const allCards = [...availableCards, ...adminCards];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
      {allCards}
    </div>
  );
}
