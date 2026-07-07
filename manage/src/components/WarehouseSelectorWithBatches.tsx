"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  warehouseService,
  WarehouseDTO,
} from "@/lib/services/warehouse-service";
import { shopService } from "@/lib/services/shop-service";
import { useSearchParams } from "next/navigation";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Trash2,
  Warehouse,
  AlertTriangle,
  Loader2,
  Package,
  CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface WarehouseStockWithBatches {
  warehouseId: number;
  warehouseName: string;
  stockQuantity: number;
  lowStockThreshold: number;
  batches: Array<{
    batchNumber: string;
    manufactureDate?: string;
    expiryDate?: string;
    quantity: number;
    supplierName?: string;
    supplierBatchNumber?: string;
  }>;
}

interface WarehouseSelectorWithBatchesProps {
  warehouseStocks: WarehouseStockWithBatches[];
  onWarehouseStocksChange: (stocks: WarehouseStockWithBatches[]) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
}

export function WarehouseSelectorWithBatches({
  warehouseStocks,
  onWarehouseStocksChange,
  disabled = false,
  title = "Warehouse Stock Assignment with Batches",
  description = "Assign stock quantities with batch details to warehouses for this product",
}: WarehouseSelectorWithBatchesProps) {
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shopSlug");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseDTO | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);

  const {
    data: shopData,
    isLoading: isLoadingShop,
    isError: isErrorShop,
  } = useQuery({
    queryKey: ["shop", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug && isDialogOpen, // only fetch when dialog opens
  });

  const shopId = shopData?.shopId;

  // Batch form state
  const [batches, setBatches] = useState<
    Array<{
      batchNumber: string;
      manufactureDate?: string;
      expiryDate?: string;
      quantity: number;
      supplierName?: string;
      supplierBatchNumber?: string;
    }>
  >([]);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<{
    warehouse?: string;
    batches?: Array<{
      batchNumber?: string;
      quantity?: string;
      manufactureDate?: string;
      expiryDate?: string;
    }>;
  }>({});

  // Fetch warehouses with pagination and search
  const {
    data: warehousesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["warehouses", shopId, currentPage, pageSize, searchTerm],
    queryFn: () => {
      if (searchTerm.trim()) {
        return warehouseService.searchWarehouses(
          searchTerm.trim(),
          currentPage,
          pageSize,
          shopId,
        );
      }
      return warehouseService.getWarehouses(currentPage, pageSize, shopId);
    },
    enabled:
      isDialogOpen && !!shopSlug && !isLoadingShop && !!shopId && !isErrorShop,
  });

  const handleAddBatch = () => {
    setBatches([
      ...batches,
      {
        batchNumber: "",
        quantity: 0,
        supplierName: "",
        supplierBatchNumber: "",
      },
    ]);
  };

  const handleRemoveBatch = (index: number) => {
    setBatches(batches.filter((_, i) => i !== index));
  };

  const handleBatchChange = (index: number, field: string, value: any) => {
    const updatedBatches = [...batches];
    updatedBatches[index] = { ...updatedBatches[index], [field]: value };
    setBatches(updatedBatches);

    // Clear validation errors for this field
    if (validationErrors.batches?.[index]) {
      const updatedErrors = { ...validationErrors };
      if (updatedErrors.batches) {
        updatedErrors.batches[index] = {
          ...updatedErrors.batches[index],
          [field]: undefined,
        };

        // Also clear related date validation errors
        if (field === "manufactureDate" || field === "expiryDate") {
          // Clear both date errors when either date changes as they depend on each other
          updatedErrors.batches[index].manufactureDate = undefined;
          updatedErrors.batches[index].expiryDate = undefined;
        }
      }
      setValidationErrors(updatedErrors);
    }
  };

  const validateForm = () => {
    const errors: typeof validationErrors = {};

    // Validate warehouse selection
    if (!selectedWarehouse) {
      errors.warehouse = "Please select a warehouse";
    }

    // Validate batches
    if (batches.length === 0) {
      errors.warehouse = errors.warehouse || "Please add at least one batch";
    } else {
      errors.batches = [];
      batches.forEach((batch, index) => {
        const batchErrors: {
          batchNumber?: string;
          quantity?: string;
          manufactureDate?: string;
          expiryDate?: string;
        } = {};

        if (!batch.batchNumber.trim()) {
          batchErrors.batchNumber = "Batch number is required";
        }

        if (batch.quantity <= 0) {
          batchErrors.quantity = "Quantity must be greater than 0";
        }

        // Require and validate manufacture date
        if (!batch.manufactureDate) {
          batchErrors.manufactureDate = "Manufacture date is required";
        } else {
          const mfgDate = new Date(batch.manufactureDate);
          const now = new Date();

          if (mfgDate > now) {
            batchErrors.manufactureDate =
              "Manufacture date cannot be in the future";
          }
        }

        // Require and validate expiry date
        if (!batch.expiryDate) {
          batchErrors.expiryDate = "Expiry date is required";
        } else {
          const expDate = new Date(batch.expiryDate);
          const now = new Date();

          if (expDate < now) {
            batchErrors.expiryDate = "Expiry date cannot be in the past";
          }

          // If both dates are provided, ensure expiry is after manufacture
          if (batch.manufactureDate) {
            const mfgDate = new Date(batch.manufactureDate);
            if (expDate <= mfgDate) {
              batchErrors.expiryDate =
                "Expiry date must be after manufacture date";
            }
          }
        }

        errors.batches![index] = batchErrors;
      });
    }

    setValidationErrors(errors);

    // Check if there are any errors
    const hasWarehouseError = !!errors.warehouse;
    const hasBatchErrors = errors.batches?.some(
      (batchError) =>
        batchError.batchNumber ||
        batchError.quantity ||
        batchError.manufactureDate ||
        batchError.expiryDate,
    );

    return !hasWarehouseError && !hasBatchErrors;
  };

  const handleAddWarehouse = () => {
    if (!validateForm()) {
      return;
    }

    // Check if warehouse is already added (selectedWarehouse is guaranteed to be non-null by validation)
    const existingStock = warehouseStocks.find(
      (stock) => stock.warehouseId === selectedWarehouse!.id,
    );

    if (existingStock) {
      // Update existing stock
      const updatedStocks = warehouseStocks.map((stock) =>
        stock.warehouseId === selectedWarehouse!.id
          ? {
              ...stock,
              batches,
              lowStockThreshold,
              stockQuantity: batches.reduce(
                (sum, batch) => sum + batch.quantity,
                0,
              ),
            }
          : stock,
      );
      onWarehouseStocksChange(updatedStocks);
    } else {
      // Add new stock
      const newStock: WarehouseStockWithBatches = {
        warehouseId: selectedWarehouse!.id,
        warehouseName: selectedWarehouse!.name,
        batches,
        lowStockThreshold,
        stockQuantity: batches.reduce((sum, batch) => sum + batch.quantity, 0),
      };
      onWarehouseStocksChange([...warehouseStocks, newStock]);
    }

    // Reset form
    setSelectedWarehouse(null);
    setBatches([]);
    setLowStockThreshold(5);
    setValidationErrors({});
    setIsDialogOpen(false);
  };

  const handleRemoveWarehouse = (warehouseId: number) => {
    const updatedStocks = warehouseStocks.filter(
      (stock) => stock.warehouseId !== warehouseId,
    );
    onWarehouseStocksChange(updatedStocks);
  };

  const totalStock = warehouseStocks.reduce(
    (sum, stock) => sum + stock.stockQuantity,
    0,
  );

  const totalBatches = warehouseStocks.reduce(
    (sum, stock) => sum + stock.batches.length,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Warehouse className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {disabled && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Warehouse selection is disabled when product variants are present.
              Stock will be managed at the variant level instead.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              {warehouseStocks.length} Warehouse
              {warehouseStocks.length !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary">Total Stock: {totalStock}</Badge>
            <Badge variant="outline">Total Batches: {totalBatches}</Badge>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={disabled} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Warehouse with Batches
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>
                  Select Warehouse and Configure Batches
                </DialogTitle>
                <DialogDescription>
                  Choose a warehouse and configure batch details for this
                  product.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 overflow-y-auto max-h-[70vh]">
                {/* Warehouse Selection */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">
                    Select Warehouse
                  </Label>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search warehouses..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(0);
                      }}
                      className="pl-10"
                    />
                  </div>

                  {/* Warehouse List */}
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading warehouses...</span>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center py-8">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        <span className="ml-2 text-destructive">
                          Failed to load warehouses
                        </span>
                      </div>
                    ) : warehousesData?.content?.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <Warehouse className="h-6 w-6 text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">
                          No warehouses found
                        </span>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {warehousesData?.content?.map((warehouse) => (
                            <TableRow
                              key={warehouse.id}
                              className={`cursor-pointer hover:bg-muted/50 ${
                                selectedWarehouse?.id === warehouse.id
                                  ? "bg-muted"
                                  : ""
                              }`}
                              onClick={() => {
                                setSelectedWarehouse(warehouse);
                                // Clear warehouse validation error when selecting
                                if (validationErrors.warehouse) {
                                  setValidationErrors((prev) => ({
                                    ...prev,
                                    warehouse: undefined,
                                  }));
                                }
                              }}
                            >
                              <TableCell>
                                <div className="font-medium">
                                  {warehouse.name}
                                </div>
                                {warehouse.description && (
                                  <div className="text-sm text-muted-foreground">
                                    {warehouse.description}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{warehouse.city}</div>
                                <div className="text-sm text-muted-foreground">
                                  {warehouse.country}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    warehouse.isActive ? "default" : "secondary"
                                  }
                                >
                                  {warehouse.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWarehouse(warehouse);
                                    // Clear warehouse validation error when selecting
                                    if (validationErrors.warehouse) {
                                      setValidationErrors((prev) => ({
                                        ...prev,
                                        warehouse: undefined,
                                      }));
                                    }
                                  }}
                                >
                                  Select
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Warehouse validation error */}
                  {validationErrors.warehouse && (
                    <div className="text-sm text-destructive mt-2">
                      {validationErrors.warehouse}
                    </div>
                  )}
                </div>

                {/* Batch Configuration */}
                {selectedWarehouse && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                      <Label className="text-sm font-medium">
                        Selected: {selectedWarehouse.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWarehouse.city}, {selectedWarehouse.country}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="lowStockThreshold">
                          Low Stock Threshold
                        </Label>
                        <Input
                          id="lowStockThreshold"
                          type="number"
                          min="0"
                          value={lowStockThreshold}
                          onChange={(e) =>
                            setLowStockThreshold(Number(e.target.value))
                          }
                          placeholder="Enter threshold"
                        />
                      </div>
                    </div>

                    {/* Batch Management */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Batches</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddBatch}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Batch
                        </Button>
                      </div>

                      {batches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No batches added yet</p>
                          <p className="text-sm">
                            Click "Add Batch" to create your first batch
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {batches.map((batch, index) => (
                            <div
                              key={index}
                              className="p-4 border rounded-lg bg-background"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium">
                                  Batch {index + 1}
                                </h4>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveBatch(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`batchNumber-${index}`}>
                                    Batch Number *
                                  </Label>
                                  <Input
                                    id={`batchNumber-${index}`}
                                    value={batch.batchNumber}
                                    onChange={(e) =>
                                      handleBatchChange(
                                        index,
                                        "batchNumber",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Enter batch number"
                                    required
                                    className={
                                      validationErrors.batches?.[index]
                                        ?.batchNumber
                                        ? "border-destructive"
                                        : ""
                                    }
                                  />
                                  {validationErrors.batches?.[index]
                                    ?.batchNumber && (
                                    <div className="text-sm text-destructive mt-1">
                                      {
                                        validationErrors.batches[index]
                                          .batchNumber
                                      }
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`quantity-${index}`}>
                                    Quantity *
                                  </Label>
                                  <Input
                                    id={`quantity-${index}`}
                                    type="number"
                                    min="1"
                                    value={batch.quantity}
                                    onChange={(e) =>
                                      handleBatchChange(
                                        index,
                                        "quantity",
                                        Number(e.target.value),
                                      )
                                    }
                                    placeholder="Enter quantity"
                                    required
                                    className={
                                      validationErrors.batches?.[index]
                                        ?.quantity
                                        ? "border-destructive"
                                        : ""
                                    }
                                  />
                                  {validationErrors.batches?.[index]
                                    ?.quantity && (
                                    <div className="text-sm text-destructive mt-1">
                                      {validationErrors.batches[index].quantity}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`manufactureDate-${index}`}>
                                    Manufacture Date & Time
                                  </Label>
                                  <div className="space-y-2">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant={"outline"}
                                          className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !batch.manufactureDate &&
                                              "text-muted-foreground",
                                          )}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {batch.manufactureDate ? (
                                            format(
                                              new Date(batch.manufactureDate),
                                              "PPP 'at' p",
                                            )
                                          ) : (
                                            <span>Pick a date (optional)</span>
                                          )}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0">
                                        <Calendar
                                          mode="single"
                                          selected={
                                            batch.manufactureDate
                                              ? new Date(batch.manufactureDate)
                                              : undefined
                                          }
                                          onSelect={(date) => {
                                            if (date) {
                                              // Keep existing time if available, otherwise set to current time
                                              const existingDateTime =
                                                batch.manufactureDate
                                                  ? new Date(
                                                      batch.manufactureDate,
                                                    )
                                                  : new Date();
                                              const newDateTime = new Date(
                                                date,
                                              );
                                              newDateTime.setHours(
                                                existingDateTime.getHours(),
                                              );
                                              newDateTime.setMinutes(
                                                existingDateTime.getMinutes(),
                                              );

                                              handleBatchChange(
                                                index,
                                                "manufactureDate",
                                                format(
                                                  newDateTime,
                                                  "yyyy-MM-dd'T'HH:mm:ss",
                                                ),
                                              );
                                            }
                                          }}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <div className="flex gap-2">
                                      <Input
                                        type="time"
                                        placeholder="Select time"
                                        value={
                                          batch.manufactureDate
                                            ? format(
                                                new Date(batch.manufactureDate),
                                                "HH:mm",
                                              )
                                            : ""
                                        }
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            // If no date is selected, use today's date
                                            const date = batch.manufactureDate
                                              ? new Date(batch.manufactureDate)
                                              : new Date();
                                            const [hours, minutes] =
                                              e.target.value.split(":");
                                            date.setHours(
                                              parseInt(hours),
                                              parseInt(minutes),
                                            );

                                            handleBatchChange(
                                              index,
                                              "manufactureDate",
                                              format(date, "yyyy-MM-dd'T'HH:mm:ss"),
                                            );
                                          }
                                        }}
                                        className="flex-1"
                                      />
                                      {batch.manufactureDate && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            handleBatchChange(
                                              index,
                                              "manufactureDate",
                                              undefined,
                                            );
                                          }}
                                        >
                                          Clear
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  {validationErrors.batches?.[index]
                                    ?.manufactureDate && (
                                    <div className="text-sm text-destructive mt-1">
                                      {
                                        validationErrors.batches[index]
                                          .manufactureDate
                                      }
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`expiryDate-${index}`}>
                                    Expiry Date & Time
                                  </Label>
                                  <div className="space-y-2">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant={"outline"}
                                          className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !batch.expiryDate &&
                                              "text-muted-foreground",
                                          )}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {batch.expiryDate ? (
                                            format(
                                              new Date(batch.expiryDate),
                                              "PPP 'at' p",
                                            )
                                          ) : (
                                            <span>Pick a date (optional)</span>
                                          )}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0">
                                        <Calendar
                                          mode="single"
                                          selected={
                                            batch.expiryDate
                                              ? new Date(batch.expiryDate)
                                              : undefined
                                          }
                                          onSelect={(date) => {
                                            if (date) {
                                              // Keep existing time if available, otherwise set to end of day
                                              const existingDateTime =
                                                batch.expiryDate
                                                  ? new Date(batch.expiryDate)
                                                  : new Date();
                                              const newDateTime = new Date(
                                                date,
                                              );
                                              if (batch.expiryDate) {
                                                newDateTime.setHours(
                                                  existingDateTime.getHours(),
                                                );
                                                newDateTime.setMinutes(
                                                  existingDateTime.getMinutes(),
                                                );
                                              } else {
                                                // Default to end of day for expiry
                                                newDateTime.setHours(23, 59);
                                              }

                                              handleBatchChange(
                                                index,
                                                "expiryDate",
                                                format(
                                                  newDateTime,
                                                  "yyyy-MM-dd'T'HH:mm:ss",
                                                ),
                                              );
                                            }
                                          }}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <div className="flex gap-2">
                                      <Input
                                        type="time"
                                        placeholder="Select time"
                                        value={
                                          batch.expiryDate
                                            ? format(
                                                new Date(batch.expiryDate),
                                                "HH:mm",
                                              )
                                            : ""
                                        }
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            // If no date is selected, use today's date
                                            const date = batch.expiryDate
                                              ? new Date(batch.expiryDate)
                                              : new Date();
                                            const [hours, minutes] =
                                              e.target.value.split(":");
                                            date.setHours(
                                              parseInt(hours),
                                              parseInt(minutes),
                                            );

                                            handleBatchChange(
                                              index,
                                              "expiryDate",
                                              format(date, "yyyy-MM-dd'T'HH:mm:ss"),
                                            );
                                          }
                                        }}
                                        className="flex-1"
                                      />
                                      {batch.expiryDate && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            handleBatchChange(
                                              index,
                                              "expiryDate",
                                              undefined,
                                            );
                                          }}
                                        >
                                          Clear
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  {validationErrors.batches?.[index]
                                    ?.expiryDate && (
                                    <div className="text-sm text-destructive mt-1">
                                      {
                                        validationErrors.batches[index]
                                          .expiryDate
                                      }
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor={`supplierName-${index}`}>
                                    Supplier Name
                                  </Label>
                                  <Input
                                    id={`supplierName-${index}`}
                                    value={batch.supplierName || ""}
                                    onChange={(e) =>
                                      handleBatchChange(
                                        index,
                                        "supplierName",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Enter supplier name"
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor={`supplierBatchNumber-${index}`}
                                  >
                                    Supplier Batch Number
                                  </Label>
                                  <Input
                                    id={`supplierBatchNumber-${index}`}
                                    value={batch.supplierBatchNumber || ""}
                                    onChange={(e) =>
                                      handleBatchChange(
                                        index,
                                        "supplierBatchNumber",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Enter supplier batch number"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddWarehouse}
                  disabled={!selectedWarehouse || batches.length === 0}
                >
                  Add Warehouse with Batches
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Current Warehouse Assignments */}
        {warehouseStocks.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Assignments</Label>
            <div className="space-y-2">
              {warehouseStocks.map((stock) => (
                <div key={stock.warehouseId} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium">{stock.warehouseName}</div>
                      <div className="text-sm text-muted-foreground">
                        Warehouse ID: {stock.warehouseId}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          Stock: {stock.stockQuantity}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Threshold: {stock.lowStockThreshold}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Batches: {stock.batches.length}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveWarehouse(stock.warehouseId)}
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Show batch details */}
                  {stock.batches.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">
                        Batches:
                      </div>
                      {stock.batches.map((batch, index) => (
                        <div
                          key={index}
                          className="text-xs bg-muted/50 p-2 rounded"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">
                              {batch.batchNumber}
                            </span>
                            <span>Qty: {batch.quantity}</span>
                          </div>
                          {batch.supplierName && (
                            <div className="text-muted-foreground">
                              Supplier: {batch.supplierName}
                            </div>
                          )}
                          {batch.expiryDate && (
                            <div className="text-muted-foreground">
                              Expires:{" "}
                              {new Date(batch.expiryDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {warehouseStocks.length === 0 && !disabled && (
          <div className="text-center py-8 text-muted-foreground">
            <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No warehouses assigned yet</p>
            <p className="text-sm">
              Click "Add Warehouse with Batches" to assign stock to warehouses
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
