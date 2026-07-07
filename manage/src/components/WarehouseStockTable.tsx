"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ChevronLeft,
  ChevronRight,
  Package,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import {
  warehouseStockService,
  WarehouseStockPageResponse,
} from "@/lib/services/warehouse-stock-service";
import { WarehouseStockDTO } from "@/lib/types/product";
import { useToast } from "@/hooks/use-toast";

interface WarehouseStockTableProps {
  productId: string;
  variantId?: number;
  title?: string;
}

export default function WarehouseStockTable({
  productId,
  variantId,
  title = "Warehouse Stock",
}: WarehouseStockTableProps) {
  const { toast } = useToast();
  const [data, setData] = useState<WarehouseStockPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState("warehouseName");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = { page, size, sort, direction };

      const response = variantId
        ? await warehouseStockService.getVariantWarehouseStock(
            productId,
            variantId,
            params
          )
        : await warehouseStockService.getProductWarehouseStock(
            productId,
            params
          );

      setData(response);
    } catch (error) {
      console.error("Error fetching warehouse stock:", error);
      toast({
        title: "Error",
        description: "Failed to fetch warehouse stock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, size, sort, direction]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSizeChange = (newSize: string) => {
    setSize(parseInt(newSize));
    setPage(0); // Reset to first page when changing size
  };

  const handleSortChange = (newSort: string) => {
    if (sort === newSort) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSort(newSort);
      setDirection("asc");
    }
    setPage(0); // Reset to first page when sorting
  };

  const getStockStatusBadge = (stock: WarehouseStockDTO) => {
    if (stock.isOutOfStock) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Out of Stock
        </Badge>
      );
    } else if (stock.isLowStock) {
      return (
        <Badge
          variant="secondary"
          className="flex items-center gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
        >
          <AlertTriangle className="h-3 w-3" />
          Low Stock
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="default"
          className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200"
        >
          <CheckCircle className="h-3 w-3" />
          In Stock
        </Badge>
      );
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

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">
              Loading warehouse stock...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.content.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Warehouse className="h-12 w-12 mx-auto mb-2" />
            <p>No warehouse stock information available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            {title}
            <Badge variant="outline" className="ml-2">
              {data.totalElements} total
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Show:</label>
              <Select value={size.toString()} onValueChange={handleSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {data.content.length} of {data.totalElements} entries
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSortChange("warehouseName")}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Warehouse
                    {sort === "warehouseName" && (
                      <span className="text-xs">
                        {direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSortChange("quantity")}
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Stock
                    {sort === "quantity" && (
                      <span className="text-xs">
                        {direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Status</TableHead>
                {variantId && <TableHead>Variant</TableHead>}
                <TableHead>Contact</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.content.map((stock) => (
                <TableRow key={stock.stockId}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{stock.warehouseName}</div>
                      <div className="text-sm text-muted-foreground">
                        {stock.warehouseAddress}, {stock.warehouseCity}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stock.warehouseState}, {stock.warehouseCountry}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{stock.quantity}</div>
                    <div className="text-xs text-muted-foreground">units</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{stock.lowStockThreshold}</div>
                    <div className="text-xs text-muted-foreground">
                      threshold
                    </div>
                  </TableCell>
                  <TableCell>{getStockStatusBadge(stock)}</TableCell>
                  {variantId && (
                    <TableCell>
                      {stock.isVariantBased ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {stock.variantName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {stock.variantSku}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">Product Level</Badge>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="space-y-1">
                      {stock.warehouseContactNumber && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {stock.warehouseContactNumber}
                        </div>
                      )}
                      {stock.warehouseEmail && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {stock.warehouseEmail}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDate(stock.updatedAt)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {data.page + 1} of {data.totalPages} ({data.totalElements}{" "}
            total entries)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={data.first || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={data.last || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
