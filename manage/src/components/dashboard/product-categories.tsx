"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardResponseDTO } from "@/lib/types/dashboard";
import { Layers, Package } from "lucide-react";

interface ProductCategoriesProps {
  data: DashboardResponseDTO | undefined;
}

export function ProductCategories({ data }: ProductCategoriesProps) {
  if (!data) return null;

  const totalProducts = data.totalProducts || 0;

  return (
    <Card className="col-span-4 lg:col-span-2">
      <CardHeader className="border-b border-border/50 bg-primary/5">
        <CardTitle className="text-primary">Product Categories</CardTitle>
        <CardDescription>
          {totalProducts > 0
            ? `${totalProducts} products in catalog`
            : "No products yet"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {totalProducts > 0 ? (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Category Analytics</h3>
              <p className="text-muted-foreground text-sm">
                Detailed category performance data is available in the Analytics
                page.
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Visit{" "}
                <span className="text-primary font-medium">
                  Dashboard → Analytics
                </span>{" "}
                to view category breakdowns, top performing products, and
                detailed metrics.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium">No categories yet</h3>
            <p className="text-muted-foreground mt-1">
              Category distribution will appear here once you have products in
              categories.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
