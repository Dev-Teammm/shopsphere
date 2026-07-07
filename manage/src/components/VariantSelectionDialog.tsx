"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  warehouseService,
  ProductVariantWarehouseDTO,
} from "@/lib/services/warehouse-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, AlertTriangle } from "lucide-react";
import Image from "next/image";

interface VariantSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedVariantIds: number[]) => void;
  productId: string;
  productName: string;
  warehouseId: number;
  isRemoving?: boolean;
}


export default function VariantSelectionDialog({
  isOpen,
  onClose,
  onConfirm,
  productId,
  productName,
  warehouseId,
  isRemoving = false,
}: VariantSelectionDialogProps) {
  const [selectedVariants, setSelectedVariants] = useState<Set<number>>(
    new Set()
  );
  const [selectAll, setSelectAll] = useState(false);

  const {
    data: variants,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["product-variants", warehouseId, productId],
    queryFn: () => warehouseService.getProductVariantsInWarehouse(warehouseId, productId),
    enabled: isOpen && !!warehouseId && !!productId,
  });

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedVariants(new Set());
      setSelectAll(false);
    }
  }, [isOpen]);

  // Update select all state when individual selections change
  useEffect(() => {
    if (variants && variants.length > 0) {
      const allSelected = variants.every((variant: ProductVariantWarehouseDTO) =>
        selectedVariants.has(variant.variantId)
      );
      setSelectAll(allSelected);
    }
  }, [selectedVariants, variants]);

  const handleVariantToggle = (variantId: number) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedVariants(newSelected);
  };

  const handleSelectAllToggle = () => {
    if (selectAll) {
      setSelectedVariants(new Set());
    } else {
      const allVariantIds = variants?.map((v: ProductVariantWarehouseDTO) => v.variantId) || [];
      setSelectedVariants(new Set(allVariantIds));
    }
    setSelectAll(!selectAll);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedVariants));
  };

  const getStatusBadge = (variant: ProductVariantWarehouseDTO) => {
    if (variant.isOutOfStock) {
      return (
        <Badge variant="destructive" className="text-xs">
          Out of Stock
        </Badge>
      );
    }
    if (variant.isLowStock) {
      return (
        <Badge variant="secondary" className="text-xs">
          Low Stock
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="text-xs">
        In Stock
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select Variants to Remove
          </DialogTitle>
          <DialogDescription>
            Choose which variants of <strong>{productName}</strong> to remove
            from this warehouse. All associated batches will also be removed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading variants...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load product variants. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {variants && variants.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No variants found for this product in the selected warehouse.
              </AlertDescription>
            </Alert>
          )}

          {variants && variants.length > 0 && (
            <div className="space-y-4">
              {/* Select All Checkbox */}
              <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-md">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAllToggle}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer"
                >
                  Select all variants ({variants.length})
                </label>
              </div>

              {/* Variants List */}
              <div className="space-y-3">
                {variants.map((variant: ProductVariantWarehouseDTO) => (
                  <div
                    key={variant.variantId}
                    className={`flex items-center space-x-4 p-4 border rounded-md hover:bg-muted/30 transition-colors ${
                      selectedVariants.has(variant.variantId)
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <Checkbox
                      id={`variant-${variant.variantId}`}
                      checked={selectedVariants.has(variant.variantId)}
                      onCheckedChange={() =>
                        handleVariantToggle(variant.variantId)
                      }
                    />

                    {/* Variant Image */}
                    <div className="flex-shrink-0">
                      {variant.variantImages &&
                      variant.variantImages.length > 0 ? (
                        <Image
                          src={variant.variantImages[0]}
                          alt={variant.variantName}
                          width={48}
                          height={48}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Variant Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {variant.variantName}
                        </h4>
                        {getStatusBadge(variant)}
                      </div>
                      
                      {variant.variantSku && (
                        <p className="text-xs text-muted-foreground font-mono">
                          SKU: {variant.variantSku}
                        </p>
                      )}
                      
                      {variant.variantPrice && (
                        <p className="text-xs text-muted-foreground">
                          Price: ${variant.variantPrice.toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Stock Information */}
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {variant.totalQuantity} in stock
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {variant.activeBatchCount} active batch
                        {variant.activeBatchCount !== 1 ? "es" : ""}
                      </div>
                      {(variant.expiredBatchCount > 0 ||
                        variant.recalledBatchCount > 0) && (
                        <div className="text-xs text-orange-600">
                          {variant.expiredBatchCount > 0 &&
                            `${variant.expiredBatchCount} expired`}
                          {variant.expiredBatchCount > 0 &&
                            variant.recalledBatchCount > 0 &&
                            ", "}
                          {variant.recalledBatchCount > 0 &&
                            `${variant.recalledBatchCount} recalled`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isRemoving}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={
              selectedVariants.size === 0 || isRemoving || isLoading || !!error
            }
          >
            {isRemoving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Removing...
              </>
            ) : (
              `Remove ${selectedVariants.size} Variant${
                selectedVariants.size !== 1 ? "s" : ""
              }`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
