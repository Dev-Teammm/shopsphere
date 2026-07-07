"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Trash2,
  Edit,
  Package,
  CalendarIcon,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Warehouse,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  stockBatchService,
  StockBatch,
} from "@/lib/services/stock-batch-service";
import { format } from "date-fns";

interface WarehouseStock {
  warehouseId: number;
  warehouseName: string;
  warehouseLocation?: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  stockId?: number;
}

interface WarehouseStockWithBatchesProps {
  variantId: number;
  variantName: string;
  warehouseStocks: WarehouseStock[];
}

interface BatchFormData {
  stockId: number;
  batchNumber: string;
  quantity: number;
  manufactureDate?: string;
  expiryDate?: string;
  supplierName?: string;
  supplierBatchNumber?: string;
}

export function WarehouseStockWithBatches({
  variantId,
  variantName,
  warehouseStocks,
}: WarehouseStockWithBatchesProps) {
  const { toast } = useToast();
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<number>>(
    new Set(),
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null,
  );
  const [formData, setFormData] = useState<BatchFormData>({
    stockId: 0,
    batchNumber: "",
    quantity: 1,
    manufactureDate: "",
    expiryDate: "",
    supplierName: "",
    supplierBatchNumber: "",
  });

  const [formTimes, setFormTimes] = useState({
    manufactureTime: "",
    expiryTime: "",
  });

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await stockBatchService.getBatchesByVariantId(variantId);
      setBatches(response);
    } catch (error: any) {
      console.error("Error fetching variant batches:", error);
      toast({
        title: "Error",
        description: "Failed to fetch batches for this variant",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (variantId) {
      fetchBatches();
    }
  }, [variantId]);

  const batchesByWarehouse = batches.reduce(
    (acc, batch) => {
      const warehouseId = batch.warehouseId;
      if (!acc[warehouseId]) {
        acc[warehouseId] = [];
      }
      acc[warehouseId].push(batch);
      return acc;
    },
    {} as Record<number, StockBatch[]>,
  );

  const toggleWarehouse = (warehouseId: number) => {
    const newExpanded = new Set(expandedWarehouses);
    if (newExpanded.has(warehouseId)) {
      newExpanded.delete(warehouseId);
    } else {
      newExpanded.add(warehouseId);
    }
    setExpandedWarehouses(newExpanded);
  };

  const handleCreateBatch = async (warehouseId: number) => {
    setSelectedWarehouseId(warehouseId);
    setFormData({
      stockId: 0,
      batchNumber: "",
      quantity: 1,
      manufactureDate: "",
      expiryDate: "",
      supplierName: "",
      supplierBatchNumber: "",
    });
    setFormTimes({
      manufactureTime: "",
      expiryTime: "",
    });
    setIsCreateModalOpen(true);
  };

  const extractDateAndTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return { date: "", time: "" };
    try {
      let cleanStr = dateTimeStr;
      if (cleanStr.includes("T")) {
        const parts = cleanStr.split("T");
        if (parts.length > 2) {
          cleanStr = `${parts[0]}T${parts[1]}`;
        }
      }
      const dateObj = new Date(cleanStr);
      if (isNaN(dateObj.getTime())) return { date: "", time: "" };
      return {
        date: format(dateObj, "yyyy-MM-dd"),
        time: format(dateObj, "HH:mm"),
      };
    } catch (error) {
      return { date: "", time: "" };
    }
  };

  const handleEditBatch = (batch: StockBatch) => {
    setSelectedBatch(batch);
    const manufactureDateTime = extractDateAndTime(batch.manufactureDate);
    const expiryDateTime = extractDateAndTime(batch.expiryDate);

    setFormData({
      stockId: Number(batch.stockId),
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      manufactureDate: manufactureDateTime.date,
      expiryDate: expiryDateTime.date,
      supplierName: batch.supplierName || "",
      supplierBatchNumber: batch.supplierBatchNumber || "",
    });

    setFormTimes({
      manufactureTime: manufactureDateTime.time,
      expiryTime: expiryDateTime.time,
    });

    setIsEditModalOpen(true);
  };

  const submitCreateBatch = async () => {
    if (!formData.batchNumber || formData.quantity <= 0 || !selectedWarehouseId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await stockBatchService.createBatchForVariant(variantId, selectedWarehouseId, {
        batchNumber: String(formData.batchNumber).trim(),
        quantity: Number(formData.quantity),
        manufactureDate: formData.manufactureDate && formTimes.manufactureTime
          ? `${formData.manufactureDate}T${formTimes.manufactureTime}:00`
          : formData.manufactureDate && !formData.manufactureDate.includes("T")
            ? `${formData.manufactureDate}T00:00:00`
            : formData.manufactureDate || undefined,
        expiryDate: formData.expiryDate && formTimes.expiryTime
          ? `${formData.expiryDate}T${formTimes.expiryTime}:00`
          : formData.expiryDate && !formData.expiryDate.includes("T")
            ? `${formData.expiryDate}T00:00:00`
            : formData.expiryDate || undefined,
        supplierName: formData.supplierName || undefined,
        supplierBatchNumber: formData.supplierBatchNumber || undefined,
      });

      toast({ title: "Success", description: "Batch created successfully" });
      setIsCreateModalOpen(false);
      await fetchBatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to create batch",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitEditBatch = async () => {
    if (!selectedBatch) return;
    try {
      setLoading(true);
      await stockBatchService.updateBatch(selectedBatch.id, {
        batchNumber: String(formData.batchNumber).trim(),
        quantity: Number(formData.quantity),
        manufactureDate: formData.manufactureDate && formTimes.manufactureTime
          ? `${formData.manufactureDate}T${formTimes.manufactureTime}:00`
          : formData.manufactureDate && !formData.manufactureDate.includes("T")
            ? `${formData.manufactureDate}T00:00:00`
            : formData.manufactureDate || undefined,
        expiryDate: formData.expiryDate && formTimes.expiryTime
          ? `${formData.expiryDate}T${formTimes.expiryTime}:00`
          : formData.expiryDate && !formData.expiryDate.includes("T")
            ? `${formData.expiryDate}T00:00:00`
            : formData.expiryDate || undefined,
        supplierName: formData.supplierName || undefined,
        supplierBatchNumber: formData.supplierBatchNumber || undefined,
      });

      toast({ title: "Success", description: "Batch updated successfully" });
      setIsEditModalOpen(false);
      await fetchBatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update batch",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId: number) => {
    try {
      setLoading(true);
      await stockBatchService.deleteBatch(batchId);
      toast({ title: "Success", description: "Batch deleted successfully" });
      await fetchBatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete batch",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBatchStatusBadge = (batch: StockBatch) => {
    const isActuallyExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
    if (batch.isRecalled) return <Badge variant="destructive" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Recalled</Badge>;
    if (batch.isExpired || isActuallyExpired) return <Badge variant="destructive" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
    if (batch.isEmpty) return <Badge variant="secondary" className="text-xs"><Package className="w-3 h-3 mr-1" />Empty</Badge>;
    if (batch.isExpiringSoon) return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" />Expiring Soon</Badge>;
    if (batch.isAvailable) return <Badge variant="outline" className="text-xs text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Inactive</Badge>;
  };

  return (
    <div className="space-y-3">
      {warehouseStocks.map((stock) => {
        const warehouseBatches = batchesByWarehouse[stock.warehouseId] || [];
        const isExpanded = expandedWarehouses.has(stock.warehouseId);
        const activeBatches = warehouseBatches.filter((b) => b.isAvailable);

        return (
          <div key={stock.warehouseId} className="border rounded-md overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={() => toggleWarehouse(stock.warehouseId)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <Warehouse className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium text-sm">{stock.warehouseName}</div>
                      {stock.warehouseLocation && <div className="text-xs text-muted-foreground">{stock.warehouseLocation}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={cn("font-semibold text-sm", stock.isLowStock ? "text-yellow-600" : "text-green-600")}>{stock.stockQuantity} units</div>
                      <div className="text-xs text-muted-foreground">Threshold: {stock.lowStockThreshold}</div>
                    </div>
                    {warehouseBatches.length > 0 && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">{warehouseBatches.length} batch{warehouseBatches.length !== 1 ? "es" : ""}</div>
                        <div className="text-xs text-muted-foreground">{activeBatches.length} active</div>
                      </div>
                    )}
                    <div className={cn("w-3 h-3 rounded-full", stock.isLowStock ? "bg-yellow-500" : "bg-green-500")} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 border-t bg-background">
                  <div className="flex items-center justify-between mb-4">
                    <h6 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Stock Batches</h6>
                    <Button size="sm" onClick={() => handleCreateBatch(stock.warehouseId)} className="bg-green-600 hover:bg-green-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />Add Batch
                    </Button>
                  </div>
                  {warehouseBatches.length > 0 ? (
                    <div className="space-y-3">
                      {warehouseBatches.map((batch) => {
                        const isActuallyExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                        return (
                          <div key={batch.id} className="flex items-center justify-between p-3 bg-muted/10 rounded-md border hover:bg-muted/20 transition-colors">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-sm">{batch.batchNumber}</span>
                                {getBatchStatusBadge(batch)}
                                <span className="text-sm font-semibold text-green-600">{batch.quantity} units</span>
                              </div>
                              {isActuallyExpired && batch.expiryDate && (
                                <div className="text-xs text-destructive font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />Expired on {new Date(batch.expiryDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditBatch(batch)} className="text-green-600 hover:bg-green-50">
                                <Edit className="w-3 h-3 mr-1" />Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteBatch(batch.id)} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-3 h-3 mr-1" />Delete
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-md">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No batches found</p>
                      <Button size="sm" variant="outline" onClick={() => handleCreateBatch(stock.warehouseId)} className="mt-4">
                        <Plus className="w-4 h-4 mr-2" />Create First Batch
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>Add a new stock batch for {variantName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Batch Number *</Label>
              <Input value={formData.batchNumber} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })} />
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Manufacture Date</Label>
                <Input type="date" value={formData.manufactureDate} onChange={(e) => setFormData({ ...formData, manufactureDate: e.target.value })} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={formTimes.manufactureTime} onChange={(e) => setFormTimes({ ...formTimes, manufactureTime: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={formTimes.expiryTime} onChange={(e) => setFormTimes({ ...formTimes, expiryTime: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Supplier Name</Label>
              <Input value={formData.supplierName} onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={submitCreateBatch} disabled={loading}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
            <DialogDescription>Update batch {selectedBatch?.batchNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Batch Number *</Label>
              <Input value={formData.batchNumber} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })} />
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Manufacture Date</Label>
                <Input type="date" value={formData.manufactureDate} onChange={(e) => setFormData({ ...formData, manufactureDate: e.target.value })} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={formTimes.manufactureTime} onChange={(e) => setFormTimes({ ...formTimes, manufactureTime: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={formTimes.expiryTime} onChange={(e) => setFormTimes({ ...formTimes, expiryTime: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={submitEditBatch} disabled={loading}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
