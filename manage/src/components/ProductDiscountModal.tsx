"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Package,
  Percent,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { discountService, DiscountDTO } from "@/lib/services/discount-service";
import { productService } from "@/lib/services/product-service";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface ProductVariant {
  variantId: number;
  variantName?: string;
  variantSku: string;
  price: number;
  salePrice?: number;
  stockQuantity: number;
  images?: Array<{ url: string; isPrimary: boolean }>;
  attributes?: Array<{ attributeType: string; attributeValue: string }>;
}

interface ProductInfo {
  productId: string;
  name: string;
  price: number;
  stockQuantity: number;
  hasVariants: boolean;
  variants?: ProductVariant[];
  images?: Array<{ url: string; isPrimary: boolean }>;
}

interface ProductDiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProductId: string;
  shopId?: string | null;
}

export function ProductDiscountModal({
  open,
  onOpenChange,
  selectedProductId,
  shopId,
}: ProductDiscountModalProps) {
  const [selectedDiscount, setSelectedDiscount] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    data: discountsData,
    isLoading: discountsLoading,
    refetch: refetchDiscounts,
  } = useQuery({
    queryKey: ["active-discounts", shopId],
    queryFn: () => {
      if (!shopId) {
        throw new Error("Shop ID is required to fetch discounts");
      }
      return discountService.getAllDiscounts(shopId, 0, 100, "createdAt", "desc", true);
    },
    enabled: open && !!shopId,
  });

  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ["product", selectedProductId],
    queryFn: () => productService.getProductById(selectedProductId),
    enabled: open && !!selectedProductId,
  });

  useEffect(() => {
    if (open && productData) {
      const product: ProductInfo = {
        productId: productData.productId,
        name: productData.name,
        price: productData.price,
        stockQuantity: productData.stockQuantity || 0,
        hasVariants: productData.variants && productData.variants.length > 0,
        images: productData.images,
        variants: productData.variants?.map((variant: any) => ({
          variantId: variant.variantId,
          variantName:
            variant.variantName ||
            variant.attributes
              ?.map((attr: any) => attr.attributeValue)
              .join(" - ") ||
            "Default Variant",
          variantSku: variant.variantSku,
          price: variant.price,
          salePrice: variant.salePrice,
          stockQuantity: variant.stockQuantity || 0,
          images: variant.images,
          attributes: variant.attributes,
        })),
      };
      setProductInfo(product);
    }
  }, [open, productData]);

  const handleVariantToggle = (variantId: number) => {
    setSelectedVariants((prev) =>
      prev.includes(variantId.toString())
        ? prev.filter((id) => id !== variantId.toString())
        : [...prev, variantId.toString()]
    );
  };

  const handleSelectAllVariants = () => {
    if (!productInfo?.variants) return;

    const allVariantIds = productInfo.variants.map((v) =>
      v.variantId.toString()
    );
    setSelectedVariants(
      selectedVariants.length === allVariantIds.length ? [] : allVariantIds
    );
  };

  const handleApplyDiscount = async () => {
    if (!selectedDiscount || !productInfo) return;

    try {
      setLoading(true);

      if (productInfo.hasVariants && selectedVariants.length > 0) {
        // If variants are selected, assign discount to specific variants
        const variantIds = selectedVariants.map((id) => parseInt(id));
        await productService.assignDiscount(
          selectedDiscount,
          undefined,
          variantIds.map((id) => id.toString())
        );
      } else {
        // If no variants or all variants selected, assign to product
        await productService.assignDiscount(
          selectedDiscount,
          [productInfo.productId],
          undefined
        );
      }

      toast({
        title: "Success",
        description: "Discount applied successfully",
      });

      onOpenChange(false);
      setSelectedDiscount("");
      setSelectedVariants([]);
    } catch (error: any) {
      console.error("Error applying discount:", error);
      console.error("Error type:", typeof error);
      console.error("Error structure:", JSON.stringify(error, null, 2));

      // Handle different error formats
      let errorMessage = "Failed to apply discount";

      if (typeof error === "string") {
        // Error is already processed by handleApiError
        errorMessage = error;
      } else if (error.response?.data?.message) {
        // Raw API error with message
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        // Alternative error field
        errorMessage = error.response.data.error;
      } else if (error.message) {
        // Generic error with message
        errorMessage = error.message;
      } else if (error.toString && error.toString() !== "[object Object]") {
        // Try to convert to string if possible
        errorMessage = error.toString();
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDiscounts =
    discountsData?.content.filter(
      (discount) =>
        discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        discount.discountCode?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const selectedDiscountData = discountsData?.content.find(
    (d) => d.discountId === selectedDiscount
  );

  if (productLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading product information...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Apply Discount to Product
          </DialogTitle>
          <DialogDescription>
            Select an active discount to apply to {productInfo?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs
            defaultValue="discounts"
            className="w-full h-full flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="discounts">Select Discount</TabsTrigger>
              <TabsTrigger
                value="variants"
                disabled={!productInfo?.hasVariants}
              >
                Select Variants{" "}
                {productInfo?.hasVariants &&
                  `(${productInfo.variants?.length || 0})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discounts" className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col space-y-4">
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search discounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {discountsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading discounts...</span>
                      </div>
                    ) : filteredDiscounts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No active discounts found
                      </div>
                    ) : (
                      filteredDiscounts.map((discount) => (
                        <Card
                          key={discount.discountId}
                          className={`cursor-pointer transition-colors ${
                            selectedDiscount === discount.discountId
                              ? "ring-2 ring-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() =>
                            setSelectedDiscount(discount.discountId)
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold">
                                    {discount.name}
                                  </h3>
                                  <Badge variant="outline">
                                    {discount.percentage}%
                                  </Badge>
                                  {discount.discountCode && (
                                    <Badge variant="secondary">
                                      {discount.discountCode}
                                    </Badge>
                                  )}
                                </div>
                                {discount.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {discount.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    Used: {discount.usedCount}/
                                    {discount.usageLimit || "∞"}
                                  </span>
                                  <span>
                                    Valid:{" "}
                                    {new Date(
                                      discount.startDate
                                    ).toLocaleDateString()}
                                  </span>
                                  {discount.endDate && (
                                    <span>
                                      to{" "}
                                      {new Date(
                                        discount.endDate
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="ml-4">
                                {selectedDiscount === discount.discountId ? (
                                  <CheckCircle className="h-5 w-5 text-primary" />
                                ) : (
                                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="variants" className="flex-1 overflow-hidden">
              {productInfo?.hasVariants && (
                <div className="h-full flex flex-col space-y-4">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <h3 className="text-lg font-semibold">Select Variants</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllVariants}
                    >
                      {selectedVariants.length === productInfo.variants?.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="space-y-2">
                      {productInfo.variants?.map((variant) => {
                        const variantImage =
                          variant.images?.find((img) => img.isPrimary) ||
                          variant.images?.[0];
                        // Show variant's original price and discounted price
                        const discountedPrice = selectedDiscountData
                          ? variant.price *
                            (1 - selectedDiscountData.percentage / 100)
                          : variant.price;

                        return (
                          <Card
                            key={variant.variantId}
                            className={`cursor-pointer transition-colors ${
                              selectedVariants.includes(
                                variant.variantId.toString()
                              )
                                ? "ring-2 ring-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() =>
                              handleVariantToggle(variant.variantId)
                            }
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <Checkbox
                                  checked={selectedVariants.includes(
                                    variant.variantId.toString()
                                  )}
                                  onChange={() =>
                                    handleVariantToggle(variant.variantId)
                                  }
                                />

                                {variantImage ? (
                                  <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden">
                                    <img
                                      src={variantImage.url}
                                      alt={variant.variantName || "Variant"}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}

                                <div className="flex-1">
                                  <h4 className="font-medium">
                                    {variant.variantName ||
                                      variant.attributes
                                        ?.map((attr) => attr.attributeValue)
                                        .join(" - ") ||
                                      "Default Variant"}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    SKU: {variant.variantSku}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <div className="space-y-1">
                                    <div className="text-sm text-muted-foreground line-through">
                                      {formatCurrency(variant.price)}
                                    </div>
                                    <div className="font-semibold text-primary">
                                      {formatCurrency(discountedPrice)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Stock: {variant.stockQuantity}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {selectedDiscountData && (
          <div className="border-t pt-4 flex-shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected Discount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {selectedDiscountData.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDiscountData.percentage}% discount
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Original: {formatCurrency(productInfo?.price || 0)}
                    </div>
                    <div className="font-semibold text-primary">
                      New:{" "}
                      {formatCurrency(
                        (productInfo?.price || 0) *
                          (1 - selectedDiscountData.percentage / 100)
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Savings:{" "}
                      {formatCurrency(
                        (productInfo?.price || 0) *
                          (selectedDiscountData.percentage / 100)
                      )}
                    </div>
                    {productInfo?.hasVariants && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {selectedVariants.length > 0
                          ? `* This discount will apply to ${selectedVariants.length} selected variant(s)`
                          : "* This discount will apply to all variants of this product"}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyDiscount}
            disabled={
              !selectedDiscount ||
              loading ||
              (productInfo?.hasVariants && selectedVariants.length === 0)
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Discount
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
