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
  DialogTrigger,
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

interface BatchManagementProps {
  stockId: number;
  warehouseName: string;
  productName: string;
  onBatchUpdate: () => void;
}

export function BatchManagement({
  stockId,
  warehouseName,
  productName,
  onBatchUpdate,
}: BatchManagementProps) {
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<StockBatch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState<CreateStockBatchRequest>({
    stockId: stockId,
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
  }, [stockId]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const data = await stockBatchService.getBatchesByStock(stockId);
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

      // Prepare the request data with proper date/time formatting
      const requestData = {
        stockId: stockId,
        batchNumber: createForm.batchNumber.trim(),
        manufactureDate:
          createForm.manufactureDate && createFormTimes.manufactureTime
            ? `${createForm.manufactureDate}T${createFormTimes.manufactureTime}:00`
            : createForm.manufactureDate &&
                !createForm.manufactureDate.includes("T")
              ? `${createForm.manufactureDate}T00:00:00`
              : createForm.manufactureDate || undefined,
        expiryDate:
          createForm.expiryDate && createFormTimes.expiryTime
            ? `${createForm.expiryDate}T${createFormTimes.expiryTime}:00`
            : createForm.expiryDate && !createForm.expiryDate.includes("T")
              ? `${createForm.expiryDate}T00:00:00`
              : createForm.expiryDate || undefined,
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
        stockId: stockId,
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

      // Combine date and time for submission
      const formData = {
        ...editForm,
        batchNumber: editForm.batchNumber.trim(),
        manufactureDate:
          editForm.manufactureDate && editFormTimes.manufactureTime
            ? `${editForm.manufactureDate}T${editFormTimes.manufactureTime}:00`
            : editForm.manufactureDate &&
                !editForm.manufactureDate.includes("T")
              ? `${editForm.manufactureDate}T00:00:00`
              : editForm.manufactureDate,
        expiryDate:
          editForm.expiryDate && editFormTimes.expiryTime
            ? `${editForm.expiryDate}T${editFormTimes.expiryTime}:00`
            : editForm.expiryDate && !editForm.expiryDate.includes("T")
              ? `${editForm.expiryDate}T00:00:00`
              : editForm.expiryDate,
      };

      console.log("Updating batch with data:", formData);

      await stockBatchService.updateBatch(editingBatch.id, formData);
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
        description: error?.response?.data?.error || "Failed to update batch",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batchId: number) => {
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
        description: "Failed to delete batch",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (batch: StockBatch) => {
    setEditingBatch(batch);
    setEditForm({
      batchNumber: batch.batchNumber,
      manufactureDate: batch.manufactureDate,
      expiryDate: batch.expiryDate,
      quantity: batch.quantity,
      supplierName: batch.supplierName || "",
      supplierBatchNumber: batch.supplierBatchNumber || "",
    });
    // Extract date and time from the batch data
    const extractDateAndTime = (dateTimeStr: string | null) => {
      if (!dateTimeStr) return { date: "", time: "" };

      try {
        // If the string already contains a T followed by another T or duplicate patterns,
        // take only the first valid ISO-8601 part
        let cleanStr = dateTimeStr;
        if (cleanStr.includes("T")) {
          const parts = cleanStr.split("T");
          if (parts.length > 2) {
            // It's malformed like 2026-01-30T14:49:00T14:49:00
            cleanStr = `${parts[0]}T${parts[1]}`;
          }
        }

        const dateObj = new Date(cleanStr);
        if (isNaN(dateObj.getTime())) return { date: "", time: "" };

        const date = format(dateObj, "yyyy-MM-dd");
        const time = format(dateObj, "HH:mm");
        return { date, time };
      } catch (error) {
        return { date: "", time: "" };
      }
    };

    const manufactureDateTime = extractDateAndTime(batch.manufactureDate);
    const expiryDateTime = extractDateAndTime(batch.expiryDate);

    setEditFormTimes({
      manufactureTime: manufactureDateTime.time,
      expiryTime: expiryDateTime.time,
    });
    setIsEditOpen(true);
  };

  const getStatusColor = (batch: StockBatch) => {
    // Check if the batch is expired based on current date
    const isActuallyExpired =
      batch.expiryDate && new Date(batch.expiryDate) < new Date();
    const status = isActuallyExpired ? "EXPIRED" : batch.status;

    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "EXPIRED":
        return "bg-red-100 text-red-800";
      case "EMPTY":
        return "bg-gray-100 text-gray-800";
      case "RECALLED":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const totalQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading batches...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Batch Management
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Batch</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="batchNumber">Batch Number *</Label>
                  <Input
                    id="batchNumber"
                    value={createForm.batchNumber}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        batchNumber: e.target.value,
                      })
                    }
                    placeholder="Enter batch number"
                    required
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
                            !createForm.manufactureDate &&
                              "text-muted-foreground",
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
                  <Label htmlFor="supplierBatchNumber">
                    Supplier Batch Number
                  </Label>
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
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateBatch} disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Batch"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">
            Total Quantity:{" "}
            <span className="font-semibold">{totalQuantity}</span>
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No batches found. Create your first batch to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => {
              const isActuallyExpired =
                batch.expiryDate && new Date(batch.expiryDate) < new Date();
              const displayStatus = isActuallyExpired
                ? "EXPIRED"
                : batch.status;

              return (
                <div key={batch.id} className="border rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{batch.batchNumber}</span>
                      <Badge className={getStatusColor(batch)}>
                        {displayStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(batch)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteBatch(batch.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="ml-2 font-medium">{batch.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Manufacture Date:
                      </span>
                      <span className="ml-2">
                        {new Date(batch.manufactureDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Expiry Date:
                      </span>
                      <span
                        className={cn(
                          "ml-2",
                          isActuallyExpired && "text-destructive font-semibold",
                        )}
                      >
                        {new Date(batch.expiryDate).toLocaleDateString()}
                        {isActuallyExpired && " (EXPIRED)"}
                      </span>
                    </div>
                    {batch.supplierName && (
                      <div>
                        <span className="text-muted-foreground">Supplier:</span>
                        <span className="ml-2">{batch.supplierName}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
                  required
                />
              </div>
              <div>
                <Label htmlFor="editManufactureDate">Manufacture Date *</Label>
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
                          <span>Pick a date</span>
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
                <Label htmlFor="editExpiryDate">Expiry Date *</Label>
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
                          <span>Pick a date</span>
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
                    setEditForm({ ...editForm, supplierName: e.target.value })
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateBatch} disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Batch"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
