"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  WarehouseSelectorWithBatches,
  WarehouseStockWithBatches,
} from "@/components/WarehouseSelectorWithBatches";
import FetchAttributesDialog from "@/components/products/FetchAttributesDialog";
import { productService } from "@/lib/services/product-service";
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Plus,
  Trash2,
  HelpCircle,
  Package,
  ImageIcon,
  Layers,
} from "lucide-react";

const createVariantSchema = z.object({
  variantName: z.string().min(1, "Variant name is required"),
  variantSku: z.string().min(1, "SKU is required"),
  price: z.number().min(0, "Price must be non-negative"),
  salePrice: z.number().min(0, "Sale price must be non-negative").optional(),
  costPrice: z.number().min(0, "Cost price must be non-negative").optional(),
  isActive: z.boolean(),
});

type CreateVariantFormData = z.infer<typeof createVariantSchema>;

export default function CreateVariantPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const productId = params.id as string;
  const shopSlug = searchParams.get("shopSlug");

  const [isCreating, setIsCreating] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStockWithBatches[]>([]);
  const [variantAttributes, setVariantAttributes] = useState<
    Array<{ attributeTypeName: string; attributeValue: string }>
  >([]);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [attributeTypeName, setAttributeTypeName] = useState("");
  const [attributeValue, setAttributeValue] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const form = useForm<CreateVariantFormData>({
    resolver: zodResolver(createVariantSchema),
    defaultValues: {
      variantName: "",
      variantSku: "",
      price: 0,
      salePrice: 0,
      costPrice: 0,
      isActive: true,
    },
  });

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => productService.getProductById(productId),
    enabled: !!productId,
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + selectedImages.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }

    const newFiles = [...selectedImages, ...files];
    setSelectedImages(newFiles);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);

    // Clear image validation errors when user selects new images
    clearFieldError("images");
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    setSelectedImages(newImages);
    setImagePreviews(newPreviews);

    // Clear image validation errors when user removes images
    clearFieldError("images");
  };

  const addManualAttribute = () => {
    if (!attributeTypeName.trim() || !attributeValue.trim()) {
      toast.error("Please fill in both attribute type and value");
      return;
    }

    const newAttribute = {
      attributeTypeName: attributeTypeName.trim(),
      attributeValue: attributeValue.trim(),
    };

    setVariantAttributes((prev) => [...prev, newAttribute]);
    setAttributeTypeName("");
    setAttributeValue("");
    setIsAttributeModalOpen(false);
  };

  const removeAttribute = (index: number) => {
    setVariantAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttributesFromBackend = (
    attributes: Array<{ name: string; values: string[] }>
  ) => {
    const attributeRequests = attributes.flatMap((attr) =>
      attr.values.map((value) => ({
        attributeTypeName: attr.name,
        attributeValue: value,
      }))
    );

    setVariantAttributes((prev) => [...prev, ...attributeRequests]);
  };

  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const scrollToError = (fieldName: string) => {
    setTimeout(() => {
      let elementId = "";

      switch (fieldName) {
        case "variantSku":
          elementId = "variantSku";
          break;
        case "warehouse":
          elementId = "warehouse-selector";
          break;
        case "images":
          elementId = "images";
          break;
        case "attributes":
          elementId = "attributes-section";
          break;
        case "general":
          // Scroll to top of form for general errors
          elementId = "variant-form";
          break;
        default:
          elementId = "variant-form";
      }

      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        // Add a subtle highlight effect
        element.style.transition = "box-shadow 0.3s ease";
        element.style.boxShadow = "0 0 0 2px #ef4444";
        setTimeout(() => {
          element.style.boxShadow = "";
        }, 2000);
      }
    }, 100); // Small delay to ensure DOM is updated
  };

  const onSubmit = async (data: CreateVariantFormData) => {
    if (variantAttributes.length === 0) {
      toast.error("At least one attribute is required");
      scrollToError("attributes");
      return;
    }

    try {
      setIsCreating(true);
      clearValidationErrors();

      const hasStock = await productService.checkProductHasStock(productId);
      if (hasStock.hasStock) {
        const confirmed = window.confirm(
          "This product already has stock assigned at the product level. " +
            "Creating variants will remove all existing product-level stock. " +
            "Do you want to continue?"
        );

        if (!confirmed) {
          setIsCreating(false);
          return;
        }

        await productService.removeProductStock(productId);
        toast.success(
          "Product-level stock removed. Proceeding with variant creation."
        );
      }

      const variantData = {
        ...data,
        attributes: variantAttributes,
        images: selectedImages,
        warehouseStocks,
      };

      const createdVariant = await productService.createProductVariant(
        productId,
        variantData
      );

      toast.success("Variant created successfully");
      const returnUrl = shopSlug 
        ? `/dashboard/products/${productId}/update?tab=variants&shopSlug=${shopSlug}`
        : `/dashboard/products/${productId}/update?tab=variants`;
      router.push(returnUrl);
    } catch (error: any) {
      console.error("Error creating variant:", error);
      console.log("Error type:", typeof error);
      console.log("Error response data:", error?.response?.data);
      console.log("Error message:", error?.message);

      // Clear any existing validation errors
      setValidationErrors({});

      // Handle case where error might be a string (from handleApiError)
      if (typeof error === "string") {
        // Check if it's a SKU error
        if (error.includes("SKU already exists")) {
          setValidationErrors({
            variantSku: "This SKU is already used by another variant",
          });
          form.setError("variantSku", {
            message: "This SKU is already used by another variant",
          });
          toast.error("This SKU is already used by another variant");
          scrollToError("variantSku");
        } else {
          toast.error(error);
          setValidationErrors({ general: error });
          scrollToError("general");
        }
        return;
      }

      // Extract error data from the response
      const errorData = error?.response?.data;
      const errorCode = errorData?.errorCode;
      const errorMessage = errorData?.message;

      // Handle different error types
      if (errorCode === "VALIDATION_ERROR") {
        // Handle specific validation errors
        if (errorMessage?.includes("SKU already exists")) {
          setValidationErrors({
            variantSku: "This SKU is already used by another variant",
          });
          form.setError("variantSku", {
            message: "This SKU is already used by another variant",
          });
          toast.error("This SKU is already used by another variant");
          scrollToError("variantSku");
        } else if (errorMessage?.includes("Warehouse not found")) {
          setValidationErrors({
            warehouse: "One or more selected warehouses were not found",
          });
          toast.error("One or more selected warehouses were not found");
          scrollToError("warehouse");
        } else if (errorMessage?.includes("Stock cannot reference both")) {
          setValidationErrors({
            general: "Stock configuration error. Please contact support.",
          });
          toast.error("Stock configuration error. Please contact support.");
          scrollToError("general");
        } else if (errorMessage?.includes("must reference either")) {
          setValidationErrors({
            general: "Stock configuration error. Please contact support.",
          });
          toast.error("Stock configuration error. Please contact support.");
          scrollToError("general");
        } else if (errorMessage?.includes("more than 10 images")) {
          setValidationErrors({
            images: "Cannot upload more than 10 images for a variant",
          });
          toast.error("Cannot upload more than 10 images for a variant");
          scrollToError("images");
        } else {
          // Generic validation error - show the actual message from backend
          const message = errorMessage || "Validation error occurred";
          setValidationErrors({ general: message });
          toast.error(message);
          scrollToError("general");
        }
      } else if (errorCode === "NOT_FOUND") {
        toast.error("Product not found");
        setValidationErrors({ general: "Product not found" });
        scrollToError("general");
      } else if (error?.response?.status === 400) {
        // Handle other 400 errors
        const message = errorMessage || "Invalid input provided";
        setValidationErrors({ general: message });
        toast.error(message);
        scrollToError("general");
      } else if (error?.response?.status === 500) {
        // Handle server errors
        const message = errorMessage || "Server error occurred";
        setValidationErrors({ general: "Server error: " + message });
        toast.error("Server error occurred. Please try again.");
        scrollToError("general");
      } else {
        // Handle network or other errors - try to extract message from different possible structures
        let message = "Failed to create variant. Please try again.";

        if (errorMessage) {
          message = errorMessage;
        } else if (error?.message) {
          message = error.message;
        } else if (error?.response?.statusText) {
          message = error.response.statusText;
        }

        setValidationErrors({ general: message });
        toast.error(message);
        scrollToError("general");
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (productLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            const returnUrl = shopSlug 
              ? `/dashboard/products/${productId}/update?tab=variants&shopSlug=${shopSlug}`
              : `/dashboard/products/${productId}/update?tab=variants`;
            router.push(returnUrl);
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Variant</h1>
          <p className="text-muted-foreground">
            Add a new variant to {product?.productName}
          </p>
        </div>
      </div>

      <form
        id="variant-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Enter the basic details for this variant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="variantName">Variant Name *</Label>
                <Input
                  id="variantName"
                  {...form.register("variantName")}
                  placeholder="e.g., Red Large T-Shirt"
                />
                {form.formState.errors.variantName && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.variantName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="variantSku">SKU *</Label>
                <Input
                  id="variantSku"
                  {...form.register("variantSku")}
                  placeholder="e.g., TSH-RED-L"
                  onChange={(e) => {
                    form.register("variantSku").onChange(e);
                    if (validationErrors.variantSku) {
                      clearValidationErrors();
                    }
                  }}
                />
                {form.formState.errors.variantSku && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.variantSku.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) =>
                    form.setValue("isActive", checked)
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Pricing
              </CardTitle>
              <CardDescription>
                Set the pricing information for this variant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="price" className="flex items-center gap-2">
                  Price *
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The selling price of this variant</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("price", { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.price.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="salePrice" className="flex items-center gap-2">
                  Sale Price
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The discounted price (compare at price)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("salePrice", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="costPrice" className="flex items-center gap-2">
                  Cost Price
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The cost price for profit calculation</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("costPrice", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card id="attributes-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Attributes
            </CardTitle>
            <CardDescription>
              Define the attributes that make this variant unique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAttributeModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </Button>
              <FetchAttributesDialog
                onAttributesSelected={handleAttributesFromBackend}
              />
            </div>

            {variantAttributes.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Selected Attributes
                </Label>
                <div className="flex flex-wrap gap-2">
                  {variantAttributes.map((attr, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {attr.attributeTypeName}: {attr.attributeValue}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => removeAttribute(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-md">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No attributes selected</p>
                <p className="text-xs">Add attributes to define this variant</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Images
            </CardTitle>
            <CardDescription>
              Upload images for this variant (max 10 images)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="images">Select Images</Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="cursor-pointer"
              />
            </div>

            {imagePreviews.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selected Images</Label>
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {validationErrors.images && (
              <p className="text-sm text-destructive mt-2">
                {validationErrors.images}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Warehouse & Stock Management
            </CardTitle>
            <CardDescription>
              Assign stock quantities to warehouses for this variant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div id="warehouse-selector">
              <WarehouseSelectorWithBatches
                warehouseStocks={warehouseStocks}
                onWarehouseStocksChange={(stocks) => {
                  setWarehouseStocks(stocks);
                  clearFieldError("warehouse");
                }}
              />
            </div>
            {validationErrors.warehouse && (
              <p className="text-sm text-destructive mt-2">
                {validationErrors.warehouse}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={isCreating}
            className="flex items-center gap-2"
          >
            {isCreating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isCreating ? "Creating..." : "Create Variant"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>

      <Dialog
        open={isAttributeModalOpen}
        onOpenChange={setIsAttributeModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Attribute</DialogTitle>
            <DialogDescription>
              Create a new attribute type and value for this variant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="attribute-type">Attribute Type</Label>
              <Input
                id="attribute-type"
                placeholder="e.g., Color, Size, Material"
                value={attributeTypeName}
                onChange={(e) => setAttributeTypeName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="attribute-value">Attribute Value</Label>
              <Input
                id="attribute-value"
                placeholder="e.g., Red, Large, Cotton"
                value={attributeValue}
                onChange={(e) => setAttributeValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAttributeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={addManualAttribute}>
              <Plus className="w-4 h-4 mr-2" />
              Add Attribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
