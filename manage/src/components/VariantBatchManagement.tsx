"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package, CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  stockBatchService,
  StockBatch,
  CreateStockBatchRequest,
  UpdateStockBatchRequest,
} from "@/lib/services/stock-batch-service";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface VariantBatchManagementProps {
  variantId: number;
  variantName: string;
  warehouseStocks?: Array<{
    stockId: number;
    warehouseId: number;
    warehouseName: string;
    stockQuantity: number;
  }>;
  onBatchUpdate: () => void;
}

export function VariantBatchManagement({
  variantId,
  variantName,
  warehouseStocks = [],
  onBatchUpdate,
}: VariantBatchManagementProps) {
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<StockBatch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState<CreateStockBatchRequest>({
    stockId: 0,
    batchNumber: "",
    manufactureDate: "",
    expiryDate: "",
    quantity: 0,
    supplierName: "",
    supplierBatchNumber: "",
  });

  const [createFormTimes, setCreateFormTimes] = useState({
    manufactureTime: "",
    expiryTime: "",
  });

  const [editForm, setEditForm] = useState<UpdateStockBatchRequest>({
    batchNumber: "",
    manufactureDate: "",
    expiryDate: "",
    quantity: 0,
    supplierName: "",
    supplierBatchNumber: "",
  });

  const [editFormTimes, setEditFormTimes] = useState({
    manufactureTime: "",
    expiryTime: "",
  });

  useEffect(() => {
    fetchBatches();
  }, [variantId]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const data = await stockBatchService.getBatchesByVariantId(variantId);
      setBatches(data);
    } catch (error: any) {
      console.error("Error fetching batches:", error);
      toast({
        title: "Error",
        description: "Failed to fetch batches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!createForm.stockId || createForm.stockId === 0) {
        toast({
          title: "Validation Error",
          description: "Please select a warehouse",
          variant: "destructive",
        });
        return;
      }

      if (!createForm.batchNumber.trim()) {
        toast({
          title: "Validation Error",
          description: "Batch number is required",
          variant: "destructive",
        });
        return;
      }

      if (createForm.quantity <= 0) {
        toast({
          title: "Validation Error",
          description: "Quantity must be greater than 0",
          variant: "destructive",
        });
        return;
      }

      // Require manufacture and expiry dates when assigning batches to a warehouse
      if (!createForm.manufactureDate) {
        toast({
          title: "Validation Error",
          description: "Manufacture date is required",
          variant: "destructive",
        });
        return;
      }

      if (!createForm.expiryDate) {
        toast({
          title: "Validation Error",
          description: "Expiry date is required",
          variant: "destructive",
        });
        return;
      }

      // Prepare the request data with proper date/time formatting
      const requestData = {
        stockId: createForm.stockId,
        batchNumber: createForm.batchNumber.trim(),
        manufactureDate:
          createForm.manufactureDate && createFormTimes.manufactureTime
            ? `${createForm.manufactureDate}T${createFormTimes.manufactureTime}:00`
            : createForm.manufactureDate
              ? `${createForm.manufactureDate}T00:00:00`
              : undefined,
        expiryDate:
          createForm.expiryDate && createFormTimes.expiryTime
            ? `${createForm.expiryDate}T${createFormTimes.expiryTime}:00`
            : createForm.expiryDate
              ? `${createForm.expiryDate}T00:00:00`
              : undefined,
        quantity: createForm.quantity,
        supplierName: createForm.supplierName || undefined,
        supplierBatchNumber: createForm.supplierBatchNumber || undefined,
      };

      console.log("Creating batch with data:", requestData);

      await stockBatchService.createBatch(requestData);
      toast({
        title: "Success",
        description: "Batch created successfully",
      });
      setIsCreateOpen(false);
      setCreateForm({
        stockId: 0,
        batchNumber: "",
        manufactureDate: "",
        expiryDate: "",
        quantity: 0,
        supplierName: "",
        supplierBatchNumber: "",
      });
      setCreateFormTimes({
        manufactureTime: "",
        expiryTime: "",
      });
      fetchBatches();
      onBatchUpdate();
    } catch (error: any) {
      console.error("Error creating batch:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to create batch",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBatch = async () => {
    if (!editingBatch) return;

    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!editForm.batchNumber.trim()) {
        toast({
          title: "Validation Error",
          description: "Batch number is required",
          variant: "destructive",
        });
        return;
      }

      // Require manufacture and expiry dates for updates too
      if (!editForm.manufactureDate) {
        toast({
          title: "Validation Error",
          description: "Manufacture date is required",
          variant: "destructive",
        });
        return;
      }

      if (!editForm.expiryDate) {
        toast({
          title: "Validation Error",
          description: "Expiry date is required",
          variant: "destructive",
        });
        return;
      }

      // Prepare the request data with proper date/time formatting
      const requestData = {
        ...editForm,
        batchNumber: editForm.batchNumber.trim(),
        manufactureDate:
          editForm.manufactureDate && editFormTimes.manufactureTime
            ? `${editForm.manufactureDate}T${editFormTimes.manufactureTime}:00`
            : editForm.manufactureDate
              ? `${editForm.manufactureDate}T00:00:00`
              : undefined,
        expiryDate:
          editForm.expiryDate && editFormTimes.expiryTime
            ? `${editForm.expiryDate}T${editFormTimes.expiryTime}:00`
            : editForm.expiryDate
              ? `${editForm.expiryDate}T00:00:00`
              : undefined,
      };

      await stockBatchService.updateBatch(editingBatch.id, requestData);
      toast({
        title: "Success",
        description: "Batch updated successfully",
      });
      setIsEditOpen(false);
      setEditingBatch(null);
      fetchBatches();
      onBatchUpdate();
    } catch (error: any) {
      console.error("Error updating batch:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update batch",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBatch = (batch: StockBatch) => {
    setEditingBatch(batch);
    setEditForm({
      batchNumber: batch.batchNumber,
      manufactureDate: batch.manufactureDate
        ? format(new Date(batch.manufactureDate), "yyyy-MM-dd")
        : "",
      expiryDate: batch.expiryDate
        ? format(new Date(batch.expiryDate), "yyyy-MM-dd")
        : "",
      quantity: batch.quantity,
      supplierName: batch.supplierName || "",
      supplierBatchNumber: batch.supplierBatchNumber || "",
    });
    // Extract time from date strings if they exist
    const manufactureTime = batch.manufactureDate
      ? new Date(batch.manufactureDate).toTimeString().slice(0, 5)
      : "";
    const expiryTime = batch.expiryDate
      ? new Date(batch.expiryDate).toTimeString().slice(0, 5)
      : "";
    setEditFormTimes({
      manufactureTime,
      expiryTime,
    });
    setIsEditOpen(true);
  };

  const handleDeleteBatch = async (batchId: number) => {
    if (!confirm("Are you sure you want to delete this batch?")) return;

    try {
      await stockBatchService.deleteBatch(batchId);
      toast({
        title: "Success",
        description: "Batch deleted successfully",
      });
      fetchBatches();
      onBatchUpdate();
    } catch (error: any) {
      console.error("Error deleting batch:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete batch",
        variant: "destructive",
      });
    }
  };

  const getBatchStatusBadge = (batch: StockBatch) => {
    if (batch.isRecalled) {
      return <Badge variant="destructive">Recalled</Badge>;
    }
    if (batch.isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (batch.isEmpty) {
      return <Badge variant="secondary">Empty</Badge>;
    }
    if (batch.isExpiringSoon) {
      return (
        <Badge variant="outline" className="text-yellow-600">
          Expiring Soon
        </Badge>
      );
    }
    if (batch.isAvailable) {
      return (
        <Badge variant="outline" className="text-green-600">
          Active
        </Badge>
      );
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  // Group batches by warehouse
  const batchesByWarehouse = batches.reduce(
    (acc, batch) => {
      const warehouseId = batch.warehouseId;
      if (!acc[warehouseId]) {
        acc[warehouseId] = {
          warehouseName: batch.warehouseName,
          batches: [],
        };
      }
      acc[warehouseId].batches.push(batch);
      return acc;
    },
    {} as Record<number, { warehouseName: string; batches: StockBatch[] }>,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Batch Management - {variantName}
            </CardTitle>
            <Button
              onClick={() => setIsCreateOpen(true)}
              disabled={loading || warehouseStocks.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Batch
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading batches...</p>
            </div>
          ) : Object.keys(batchesByWarehouse).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(batchesByWarehouse).map(
                ([warehouseId, { warehouseName, batches }]) => (
                  <div key={warehouseId} className="space-y-4">
                    <h4 className="font-semibold text-sm border-b pb-2">
                      {warehouseName} ({batches.length} batches)
                    </h4>
                    <div className="grid gap-3">
                      {batches.map((batch) => (
                        <div
                          key={batch.id}
                          className="flex items-center justify-between p-4 bg-muted/20 rounded-md border"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">
                                {batch.batchNumber}
                              </span>
                              {getBatchStatusBadge(batch)}
                              <span className="text-sm font-semibold text-primary">
                                {batch.quantity} units
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {batch.manufactureDate && (
                                <span>
                                  Mfg:{" "}
                                  {format(
                                    new Date(batch.manufactureDate),
                                    "MMM dd, yyyy",
                                  )}
                                </span>
                              )}
                              {batch.expiryDate && (
                                <span>
                                  Exp:{" "}
                                  {format(
                                    new Date(batch.expiryDate),
                                    "MMM dd, yyyy",
                                  )}
                                </span>
                              )}
                              {batch.supplierName && (
                                <span>Supplier: {batch.supplierName}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditBatch(batch)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteBatch(batch.id)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No Batches Found</h3>
              <p className="text-muted-foreground mb-6">
                This variant doesn't have any stock batches yet.
              </p>
              {warehouseStocks.length > 0 ? (
                <Button onClick={() => setIsCreateOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Batch
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Assign this variant to warehouses first to create batches.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Batch Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="warehouse">Warehouse *</Label>
              <select
                id="warehouse"
                value={createForm.stockId}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    stockId: Number(e.target.value),
                  })
                }
                className="w-full mt-1 px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value={0}>Select a warehouse</option>
                {warehouseStocks.map((stock) => (
                  <option key={stock.stockId} value={stock.stockId}>
                    {stock.warehouseName} ({stock.stockQuantity} units
                    available)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="batchNumber">Batch Number *</Label>
              <Input
                id="batchNumber"
                value={createForm.batchNumber}
                onChange={(e) =>
                  setCreateForm({ ...createForm, batchNumber: e.target.value })
                }
                placeholder="Enter batch number"
              />
            </div>

            <div>
              <Label htmlFor="manufactureDate">Manufacture Date</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !createForm.manufactureDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {createForm.manufactureDate ? (
                        format(new Date(createForm.manufactureDate), "PPP")
                      ) : (
                        <span>Pick a date (optional)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        createForm.manufactureDate
                          ? new Date(createForm.manufactureDate)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          const dateStr = format(date, "yyyy-MM-dd");
                          setCreateForm({
                            ...createForm,
                            manufactureDate: dateStr,
                          });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={createFormTimes.manufactureTime}
                  onChange={(e) =>
                    setCreateFormTimes({
                      ...createFormTimes,
                      manufactureTime: e.target.value,
                    })
                  }
                  className="w-32"
                  placeholder="Time (optional)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !createForm.expiryDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {createForm.expiryDate ? (
                        format(new Date(createForm.expiryDate), "PPP")
                      ) : (
                        <span>Pick a date (optional)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        createForm.expiryDate
                          ? new Date(createForm.expiryDate)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          const dateStr = format(date, "yyyy-MM-dd");
                          setCreateForm({
                            ...createForm,
                            expiryDate: dateStr,
                          });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={createFormTimes.expiryTime}
                  onChange={(e) =>
                    setCreateFormTimes({
                      ...createFormTimes,
                      expiryTime: e.target.value,
                    })
                  }
                  className="w-32"
                  placeholder="Time (optional)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={createForm.quantity}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    quantity: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="supplierName">Supplier Name</Label>
              <Input
                id="supplierName"
                value={createForm.supplierName}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    supplierName: e.target.value,
                  })
                }
                placeholder="Enter supplier name"
              />
            </div>

            <div>
              <Label htmlFor="supplierBatchNumber">Supplier Batch Number</Label>
              <Input
                id="supplierBatchNumber"
                value={createForm.supplierBatchNumber}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    supplierBatchNumber: e.target.value,
                  })
                }
                placeholder="Enter supplier batch number"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateBatch} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Batch"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Batch Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="editBatchNumber">Batch Number *</Label>
              <Input
                id="editBatchNumber"
                value={editForm.batchNumber}
                onChange={(e) =>
                  setEditForm({ ...editForm, batchNumber: e.target.value })
                }
                placeholder="Enter batch number"
              />
            </div>

            <div>
              <Label htmlFor="editManufactureDate">Manufacture Date</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !editForm.manufactureDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editForm.manufactureDate ? (
                        format(new Date(editForm.manufactureDate), "PPP")
                      ) : (
                        <span>Pick a date (optional)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        editForm.manufactureDate
                          ? new Date(editForm.manufactureDate)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          const dateStr = format(date, "yyyy-MM-dd");
                          setEditForm({
                            ...editForm,
                            manufactureDate: dateStr,
                          });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={editFormTimes.manufactureTime}
                  onChange={(e) =>
                    setEditFormTimes({
                      ...editFormTimes,
                      manufactureTime: e.target.value,
                    })
                  }
                  className="w-32"
                  placeholder="Time (optional)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="editExpiryDate">Expiry Date</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !editForm.expiryDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editForm.expiryDate ? (
                        format(new Date(editForm.expiryDate), "PPP")
                      ) : (
                        <span>Pick a date (optional)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        editForm.expiryDate
                          ? new Date(editForm.expiryDate)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          const dateStr = format(date, "yyyy-MM-dd");
                          setEditForm({
                            ...editForm,
                            expiryDate: dateStr,
                          });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={editFormTimes.expiryTime}
                  onChange={(e) =>
                    setEditFormTimes({
                      ...editFormTimes,
                      expiryTime: e.target.value,
                    })
                  }
                  className="w-32"
                  placeholder="Time (optional)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="editQuantity">Quantity *</Label>
              <Input
                id="editQuantity"
                type="number"
                min="0"
                value={editForm.quantity}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    quantity: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="editSupplierName">Supplier Name</Label>
              <Input
                id="editSupplierName"
                value={editForm.supplierName}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    supplierName: e.target.value,
                  })
                }
                placeholder="Enter supplier name"
              />
            </div>

            <div>
              <Label htmlFor="editSupplierBatchNumber">
                Supplier Batch Number
              </Label>
              <Input
                id="editSupplierBatchNumber"
                value={editForm.supplierBatchNumber}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    supplierBatchNumber: e.target.value,
                  })
                }
                placeholder="Enter supplier batch number"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateBatch} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Batch"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
