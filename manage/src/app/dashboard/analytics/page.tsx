"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import { useSearchParams } from "next/navigation";
import { dashboardService } from "@/lib/services/dashboard-service";
import { moneyFlowService } from "@/lib/services/money-flow-service";
import { shopService } from "@/lib/services/shop-service";
import { UserRole } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarIcon,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  AnalyticsResponseDTO,
  AnalyticsRequestDTO,
} from "@/lib/types/dashboard";
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { MoneyFlowType } from "@/lib/types/money-flow";

// Analytics metric card component
function MetricCard({
  title,
  value,
  icon,
  description,
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="p-1 bg-primary/10 rounded-lg text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && trendValue && (
          <div
            className={`flex items-center mt-2 text-xs ${
              trend === "up"
                ? "text-green-600"
                : trend === "down"
                ? "text-red-600"
                : "text-muted-foreground"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : trend === "down" ? (
              <TrendingDown className="h-3 w-3 mr-1" />
            ) : null}
            {trendValue > 0 ? "+" : ""}
            {trendValue}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick filter options for money flow
type QuickFilter = "24h" | "7d" | "30d" | "90d" | "1y" | "custom";

export default function AnalyticsPage() {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === UserRole.ADMIN;
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shopSlug");

  // Date range state
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of current month
    to: new Date(), // Today
  });

  // Money flow date range state
  const [moneyFlowDateRange, setMoneyFlowDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Quick filter state
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("30d");

  // Get shop ID from slug for shop-scoped analytics
  const { data: shop } = useQuery({
    queryKey: ["shop-by-slug", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug,
  });

  // Analytics request
  const analyticsRequest: AnalyticsRequestDTO = {
    startDate: dateRange.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
    endDate: dateRange.to
      ? format(dateRange.to, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
    shopId: shop?.shopId, // Include shopId for shop-scoped analytics
  };

  // Fetch analytics data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics", analyticsRequest, shopSlug],
    queryFn: () => dashboardService.getAnalyticsData(analyticsRequest),
    enabled: !!dateRange.from && !!dateRange.to,
  });

  // Fetch money flow data
  const {
    data: moneyFlowData,
    isLoading: moneyFlowLoading,
    error: moneyFlowError,
    refetch: refetchMoneyFlow,
  } = useQuery({
    queryKey: [
      "moneyFlow",
      format(moneyFlowDateRange.from, "yyyy-MM-dd'T'HH:mm:ss"),
      format(moneyFlowDateRange.to, "yyyy-MM-dd'T'HH:mm:ss"),
    ],
    queryFn: () =>
      moneyFlowService.getMoneyFlow(
        format(moneyFlowDateRange.from, "yyyy-MM-dd'T'HH:mm:ss"),
        format(moneyFlowDateRange.to, "yyyy-MM-dd'T'HH:mm:ss")
      ),
    enabled: !!moneyFlowDateRange.from && !!moneyFlowDateRange.to,
  });

  // Fetch current balance
  const { data: currentBalance } = useQuery({
    queryKey: ["moneyFlowBalance"],
    queryFn: () => moneyFlowService.getCurrentBalance(),
  });

  const handleDateChange = (from: Date | undefined, to: Date | undefined) => {
    setDateRange({ from, to });
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleQuickFilterChange = (filter: QuickFilter) => {
    setQuickFilter(filter);
    const now = new Date();
    let from: Date;

    switch (filter) {
      case "24h":
        from = subDays(now, 1);
        break;
      case "7d":
        from = subDays(now, 7);
        break;
      case "30d":
        from = subDays(now, 30);
        break;
      case "90d":
        from = subDays(now, 90);
        break;
      case "1y":
        from = subYears(now, 1);
        break;
      default:
        return;
    }

    setMoneyFlowDateRange({ from, to: now });
  };

  const handleMoneyFlowDateChange = (
    from: Date | undefined,
    to: Date | undefined
  ) => {
    if (from && to) {
      setMoneyFlowDateRange({ from, to });
      setQuickFilter("custom");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-2">
          <h2 className="text-2xl font-semibold">
            Failed to load analytics data
          </h2>
          <p className="text-muted-foreground">
            Please try again later or contact support if the issue persists.
          </p>
          <Button onClick={handleRefresh} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            {shopSlug 
              ? `Detailed shop performance metrics and insights for ${shop?.name || "this shop"}`
              : "Detailed store performance metrics and insights"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => handleDateChange(range?.from, range?.to)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handleRefresh} variant="outline" size="icon">
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {data && (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {isAdmin && data.totalRevenue !== null && (
              <MetricCard
                title="Total Revenue"
                value={formatCurrency(data.totalRevenue)}
                icon={<CreditCard className="h-4 w-4" />}
                description={shopSlug ? "Shop period revenue" : "Period revenue"}
                trend={
                  data.totalRevenueVsPercent && data.totalRevenueVsPercent > 0
                    ? "up"
                    : "down"
                }
                trendValue={
                  data.totalRevenueVsPercent
                    ? Math.abs(data.totalRevenueVsPercent)
                    : undefined
                }
              />
            )}

            <MetricCard
              title="Total Orders"
              value={data.totalOrders}
              icon={<ShoppingCart className="h-4 w-4" />}
              description={shopSlug ? "Shop period orders" : "Period orders"}
              trend={
                data.totalOrdersVsPercent && data.totalOrdersVsPercent > 0
                  ? "up"
                  : "down"
              }
              trendValue={
                data.totalOrdersVsPercent
                  ? Math.abs(data.totalOrdersVsPercent)
                  : undefined
              }
            />

            <MetricCard
              title="New Customers"
              value={data.newCustomers}
              icon={<Users className="h-4 w-4" />}
              description={shopSlug ? "Shop period customers" : "Period signups"}
              trend={
                data.newCustomersVsPercent && data.newCustomersVsPercent > 0
                  ? "up"
                  : "down"
              }
              trendValue={
                data.newCustomersVsPercent
                  ? Math.abs(data.newCustomersVsPercent)
                  : undefined
              }
            />

            <MetricCard
              title="Active Products"
              value={data.activeProducts}
              icon={<Package className="h-4 w-4" />}
              description={shopSlug ? "Shop active products" : "Available products"}
              trend={
                data.activeProductsVsPercent && data.activeProductsVsPercent > 0
                  ? "up"
                  : "down"
              }
              trendValue={
                data.activeProductsVsPercent
                  ? Math.abs(data.activeProductsVsPercent)
                  : undefined
              }
            />

            {/* New Shop Members - only show for shop-scoped analytics */}
            {shopSlug && data.newShopMembers !== undefined && (
              <MetricCard
                title="New Shop Members"
                value={data.newShopMembers}
                icon={<Users className="h-4 w-4" />}
                description="New employees & delivery agents"
                trend={
                  data.newShopMembersVsPercent && data.newShopMembersVsPercent > 0
                    ? "up"
                    : "down"
                }
                trendValue={
                  data.newShopMembersVsPercent
                    ? Math.abs(data.newShopMembersVsPercent)
                    : undefined
                }
              />
            )}
          </div>

          {/* Top Products */}
          {data.topProducts && data.topProducts.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>
                  {shopSlug 
                    ? `Best selling products for this shop in the selected period`
                    : "Best selling products in the selected period"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.topProducts.map((product, index) => (
                    <div
                      key={product.productId}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.totalSalesCount} units sold
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-primary">
                          {formatCurrency(product.totalSalesAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Money Flow Graph */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Money Flow Tracking
                  </CardTitle>
                  <CardDescription>
                    {shopSlug 
                      ? `Shop income trend - green line rises with revenue, falls with expenses (${moneyFlowData?.granularity || "loading..."} granularity)`
                      : `Monthly income trend - green line rises with revenue, falls with expenses (${moneyFlowData?.granularity || "loading..."} granularity)`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={quickFilter}
                    onValueChange={(value) =>
                      handleQuickFilterChange(value as QuickFilter)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">Last Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>

                  {quickFilter === "custom" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {format(moneyFlowDateRange.from, "MMM dd")} -{" "}
                          {format(moneyFlowDateRange.to, "MMM dd")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={moneyFlowDateRange.from}
                          selected={{
                            from: moneyFlowDateRange.from,
                            to: moneyFlowDateRange.to,
                          }}
                          onSelect={(range) =>
                            handleMoneyFlowDateChange(range?.from, range?.to)
                          }
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Current Balance Display */}
              {currentBalance !== undefined && (
                <div className="mb-6 p-4 bg-primary/5 rounded-md border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Current Balance
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(currentBalance)}
                      </p>
                    </div>
                    <Wallet className="h-12 w-12 text-primary/30" />
                  </div>
                </div>
              )}

              {moneyFlowLoading && (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              )}

              {moneyFlowError && (
                <div className="flex flex-col items-center justify-center h-[400px] text-center gap-2">
                  <p className="text-muted-foreground">
                    Failed to load money flow data
                  </p>
                  <Button
                    onClick={() => refetchMoneyFlow()}
                    variant="outline"
                    size="sm"
                  >
                    Try Again
                  </Button>
                </div>
              )}

              {moneyFlowData &&
                moneyFlowData.aggregations &&
                moneyFlowData.aggregations.length > 0 && (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-900">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowUpCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            Total Inflow
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {formatCurrency(
                            moneyFlowData.aggregations.reduce(
                              (sum, agg) => sum + agg.totalInflow,
                              0
                            )
                          )}
                        </p>
                      </div>

                      <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowDownCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <p className="text-sm font-medium text-red-900 dark:text-red-100">
                            Total Outflow
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                          {formatCurrency(
                            moneyFlowData.aggregations.reduce(
                              (sum, agg) => sum + agg.totalOutflow,
                              0
                            )
                          )}
                        </p>
                      </div>

                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-900">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            Net Balance
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {formatCurrency(
                            moneyFlowData.aggregations.reduce(
                              (sum, agg) => sum + agg.netBalance,
                              0
                            )
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="h-[450px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={moneyFlowData.aggregations.map((agg) => {
                            // Format period label based on granularity
                            let displayPeriod = agg.period;
                            const granularity = moneyFlowData.granularity;
                            
                            try {
                              if (granularity === 'minute') {
                                // Format: "HH:MM"
                                const parts = agg.period.split(' ');
                                displayPeriod = parts[1] || agg.period;
                              } else if (granularity === 'hour') {
                                // Format: "HH:00" or "Mon HH:00"
                                const parts = agg.period.split(' ');
                                displayPeriod = parts[1] || agg.period;
                              } else if (granularity === 'day') {
                                // Format: "Mon DD" or "MM-DD"
                                const date = new Date(agg.period);
                                displayPeriod = format(date, 'MMM dd');
                              } else if (granularity === 'week') {
                                // Format: "Week NN"
                                displayPeriod = agg.period.replace('W', 'Week ');
                              } else if (granularity === 'month') {
                                // Format: "Jan 2024"
                                const [year, month] = agg.period.split('-');
                                const date = new Date(parseInt(year), parseInt(month) - 1);
                                displayPeriod = format(date, 'MMM yyyy');
                              } else if (granularity === 'year') {
                                displayPeriod = agg.period;
                              }
                            } catch (e) {
                              displayPeriod = agg.period;
                            }
                            
                            return {
                              period: displayPeriod,
                              originalPeriod: agg.period,
                              inflow: agg.totalInflow,
                              outflow: agg.totalOutflow,
                              net: agg.netBalance,
                              transactions: agg.transactions,
                            };
                          })}
                          margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorNet"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#2563eb"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#2563eb"
                                stopOpacity={0.05}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis
                            dataKey="period"
                            tick={{ fontSize: 11, fill: '#666' }}
                            angle={-35}
                            textAnchor="end"
                            height={70}
                            stroke="rgba(0,0,0,0.3)"
                            tickLine={{ stroke: 'rgba(0,0,0,0.2)' }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#666' }}
                            tickFormatter={(value) => {
                              const absValue = Math.abs(value);
                              if (absValue >= 1000) {
                                return `$${(value / 1000).toFixed(0)}k`;
                              }
                              return `$${value.toLocaleString()}`;
                            }}
                            stroke="rgba(0,0,0,0.3)"
                            tickLine={{ stroke: 'rgba(0,0,0,0.2)' }}
                            axisLine={{ stroke: 'rgba(0,0,0,0.3)' }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-background border border-border rounded-md shadow-lg p-4 max-w-sm">
                                    <p className="font-semibold mb-2 text-green-600">
                                      {data.originalPeriod || data.period}
                                    </p>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex items-center justify-between gap-4">
                                        <span className="flex items-center gap-1 text-green-600">
                                          <ArrowUpCircle className="h-3 w-3" />
                                          Inflow:
                                        </span>
                                        <span className="font-medium">
                                          {formatCurrency(data.inflow || 0)}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4">
                                        <span className="flex items-center gap-1 text-red-600">
                                          <ArrowDownCircle className="h-3 w-3" />
                                          Outflow:
                                        </span>
                                        <span className="font-medium">
                                          {formatCurrency(data.outflow || 0)}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4 pt-1 border-t">
                                        <span className="font-medium">
                                          Net Balance:
                                        </span>
                                        <span
                                          className={`font-bold ${
                                            data.net >= 0
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }`}
                                        >
                                          {formatCurrency(data.net || 0)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Show detailed transactions for minute/hour granularity */}
                                    {data.transactions &&
                                      data.transactions.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                          <p className="text-xs font-semibold mb-2">
                                            Transactions:
                                          </p>
                                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                            {data.transactions.map(
                                              (transaction: any) => (
                                                <div
                                                  key={transaction.id}
                                                  className="text-xs p-2 bg-muted/50 rounded"
                                                >
                                                  <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                      <p className="font-medium truncate">
                                                        {transaction.description}
                                                      </p>
                                                      <p className="text-muted-foreground text-[10px]">
                                                        {format(
                                                          new Date(
                                                            transaction.createdAt
                                                          ),
                                                          "HH:mm:ss"
                                                        )}
                                                      </p>
                                                    </div>
                                                    <div className="text-right">
                                                      <p
                                                        className={`font-semibold ${
                                                          transaction.type ===
                                                          MoneyFlowType.IN
                                                            ? "text-green-600"
                                                            : "text-red-600"
                                                        }`}
                                                      >
                                                        {transaction.type ===
                                                        MoneyFlowType.IN
                                                          ? "+"
                                                          : "-"}
                                                        {formatCurrency(
                                                          transaction.amount
                                                        )}
                                                      </p>
                                                      <p className="text-[10px] text-muted-foreground">
                                                        Bal:{" "}
                                                        {formatCurrency(
                                                          transaction.remainingBalance
                                                        )}
                                                      </p>
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend 
                            wrapperStyle={{
                              paddingTop: '10px',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          />
                          <Area
                            type="natural"
                            dataKey="net"
                            stroke="#2563eb"
                            strokeWidth={3}
                            fill="url(#colorNet)"
                            dot={{
                              fill: "#2563eb",
                              strokeWidth: 2,
                              r: 6,
                              stroke: "#fff",
                            }}
                            activeDot={{
                              r: 8,
                              fill: "#2563eb",
                              stroke: "#fff",
                              strokeWidth: 2,
                            }}
                            name="Net Balance ($)"
                            animationDuration={2000}
                            animationEasing="ease-in-out"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}

              {moneyFlowData &&
                (!moneyFlowData.aggregations ||
                  moneyFlowData.aggregations.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center gap-2">
                    <Wallet className="h-16 w-16 text-muted-foreground" />
                    <h3 className="text-lg font-medium">
                      No Money Flow Data Available
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Money flow data will appear here once transactions are
                      recorded.
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Category Performance */}
          {data.categoryPerformance && data.categoryPerformance.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>
                  {shopSlug 
                    ? `Product categories ranked by performance for this shop`
                    : "Product categories ranked by performance"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.categoryPerformance.map((category, index) => (
                    <div
                      key={category.categoryId}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{category.categoryName}</p>
                          <p className="text-sm text-muted-foreground">
                            Category revenue
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-primary">
                          {formatCurrency(category.revenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {category.revenuePercent?.toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Data State */}
          {(!data.topProducts || data.topProducts.length === 0) &&
            (!data.categoryPerformance ||
              data.categoryPerformance.length === 0) && (
              <Card className="text-center py-12">
                <CardContent>
                  <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Analytics Data Available
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Analytics data will appear here once you have sufficient
                    activity in the selected period.
                  </p>
                  <Button onClick={handleRefresh} variant="outline">
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  );
}
