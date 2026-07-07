"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardResponseDTO } from "@/lib/types/dashboard";
import { PackageOpen, Package, AlertTriangle } from "lucide-react";

interface TopProductsProps {
  data: DashboardResponseDTO | undefined;
}

export function TopProducts({ data }: TopProductsProps) {
  if (!data) return null;

  const totalProducts = data.totalProducts || 0;
  const lowStockProducts = data.alerts?.lowStockProducts || 0;

  return (
    <Card className="col-span-4 lg:col-span-4">
      <CardHeader className="border-b border-border/50 bg-primary/5">
        <CardTitle className="text-primary">Product Overview</CardTitle>
        <CardDescription>
          {totalProducts > 0
            ? `Total products in catalog: ${totalProducts}`
            : "No products in catalog yet"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {totalProducts > 0 ? (
          <div className="space-y-6">
            {/* Product Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-md">
                <div className="text-2xl font-bold text-primary mb-1">
                  {totalProducts}
                </div>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>

              <div className="text-center p-4 bg-amber-50 rounded-md">
                <div className="text-2xl font-bold text-amber-600 mb-1">
                  {lowStockProducts}
                </div>
                <p className="text-sm text-amber-700">Low Stock</p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-md">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {totalProducts - lowStockProducts}
                </div>
                <p className="text-sm text-green-700">In Stock</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-primary/10 rounded-md text-center cursor-pointer hover:bg-primary/20 transition-colors">
                  <Package className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-primary">
                    Add Product
                  </p>
                </div>

                <div className="p-3 bg-amber-100 rounded-md text-center cursor-pointer hover:bg-amber-200 transition-colors">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-amber-700">
                    Manage Stock
                  </p>
                </div>
              </div>
            </div>

            {/* Product Status */}
            <div className="p-4 bg-muted/30 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Catalog Health</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    lowStockProducts === 0
                      ? "bg-green-100 text-green-700"
                      : lowStockProducts <= 5
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {lowStockProducts === 0
                    ? "Excellent"
                    : lowStockProducts <= 5
                    ? "Good"
                    : "Needs Attention"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {lowStockProducts === 0
                  ? "All products have sufficient stock levels."
                  : `${lowStockProducts} product${
                      lowStockProducts === 1 ? " needs" : "s need"
                    } stock attention.`}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PackageOpen className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium">No products yet</h3>
            <p className="text-muted-foreground mt-1">
              Start building your product catalog to see analytics here.
            </p>
            <div className="mt-4 p-3 bg-primary/10 rounded-md cursor-pointer hover:bg-primary/20 transition-colors">
              <Package className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-sm font-medium text-primary">
                Add Your First Product
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
