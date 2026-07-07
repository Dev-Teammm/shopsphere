"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Package,
  Percent,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Trash2,
  Loader2,
} from "lucide-react";
import { DiscountDTO, discountService } from "@/lib/services/discount-service";
import { productService } from "@/lib/services/product-service";
import { CountdownTimer } from "@/components/CountdownTimer";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface ProductInfo {
  productId: string;
  name: string;
  price: number;
  discountedPrice: number;
  hasVariants: boolean;
  sku: string;
  isActive: boolean;
  imageUrl?: string;
}

interface VariantInfo {
  variantId: string;
  variantName: string;
  variantSku: string;
  price: number;
  discountedPrice: number;
  productId: string;
  productName: string;
  isActive: boolean;
  imageUrl?: string;
}

interface DiscountDetailsModalProps {
  discount: DiscountDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
}

export function DiscountDetailsModal({
  discount,
  open,
  onOpenChange,
  shopId,
}: DiscountDetailsModalProps) {
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [variants, setVariants] = useState<VariantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (discount && open && shopId) {
      fetchProductsWithDiscount();
    }
  }, [discount, open, shopId]);

  const fetchProductsWithDiscount = async () => {
    if (!discount || !shopId) return;

    try {
      setLoading(true);
      const response = await discountService.getProductsByDiscount(
        discount.discountId,
        shopId
      );

      setProducts(response.products);
      setVariants(response.variants);
    } catch (error: any) {
      console.error("Error fetching products:", error);

      let errorMessage = "Failed to fetch products";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleRemoveProduct = async (productId: string) => {
    try {
      setRemoving(productId);
      await productService.removeDiscount([productId], undefined);

      toast({
        title: "Success",
        description: "Product removed from discount",
      });

      fetchProductsWithDiscount();
    } catch (error: any) {
      console.error("Error removing product:", error);

      let errorMessage = "Failed to remove product";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setRemoving(null);
    }
  };

  const handleRemoveVariant = async (variantId: string) => {
    try {
      setRemoving(variantId);
      await productService.removeDiscount(undefined, [variantId]);

      toast({
        title: "Success",
        description: "Variant removed from discount",
      });

      fetchProductsWithDiscount();
    } catch (error: any) {
      console.error("Error removing variant:", error);

      let errorMessage = "Failed to remove variant";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setRemoving(null);
    }
  };

  const getStatusIcon = () => {
    if (!discount?.isActive) {
      return <XCircle className="h-5 w-5 text-gray-500" />;
    }
    if (!discount?.isValid) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (!discount?.isActive) return "Inactive";
    if (!discount?.isValid) return "Expired";
    return "Active";
  };

  const getStatusVariant = () => {
    if (!discount?.isActive) return "secondary";
    if (!discount?.isValid) return "destructive";
    return "default";
  };

  if (!discount) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            {discount.name}
            <Badge variant={getStatusVariant()}>{getStatusText()}</Badge>
          </DialogTitle>
          <DialogDescription>
            {discount.description || "No description provided"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">
              Products ({products.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Discount Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percentage:</span>
                    <span className="font-semibold">
                      {discount.percentage}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline">{discount.discountType}</Badge>
                  </div>
                  {discount.discountCode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Code:</span>
                      <Badge variant="secondary">{discount.discountCode}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Usage Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used:</span>
                    <span className="font-semibold">{discount.usedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Limit:</span>
                    <span className="font-semibold">
                      {discount.usageLimit || "Unlimited"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="font-semibold">
                      {discount.usageLimit
                        ? Math.max(0, discount.usageLimit - discount.usedCount)
                        : "Unlimited"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Validity Period
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-semibold">
                      {formatDate(discount.startDate)}
                    </span>
                  </div>
                  {discount.endDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date:</span>
                      <span className="font-semibold">
                        {formatDate(discount.endDate)}
                      </span>
                    </div>
                  )}
                  <div className="pt-3 border-t">
                    <div className="text-sm text-muted-foreground mb-2">
                      {new Date(discount.startDate) > new Date()
                        ? "Time until discount starts:"
                        : discount.endDate &&
                          new Date(discount.endDate) > new Date()
                        ? "Time remaining:"
                        : "Discount has ended"}
                    </div>
                    {new Date(discount.startDate) > new Date() ? (
                      <CountdownTimer targetDate={discount.startDate} />
                    ) : discount.endDate &&
                      new Date(discount.endDate) > new Date() ? (
                      <CountdownTimer targetDate={discount.endDate} />
                    ) : (
                      <div className="text-red-500 font-semibold">Expired</div>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-semibold">
                      {formatDate(discount.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products with this Discount
                </CardTitle>
                <CardDescription>
                  Products and variants that have this discount applied
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search products and variants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <div className="text-muted-foreground">
                        Loading products...
                      </div>
                    </div>
                  ) : products.length === 0 && variants.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          No products have this discount applied
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          You can assign products to this discount from the
                          product management page
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Original Price</TableHead>
                          <TableHead>Discounted Price</TableHead>
                          <TableHead>Savings</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products
                          .filter(
                            (product) =>
                              product.name
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()) ||
                              product.sku
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase())
                          )
                          .map((product) => (
                            <TableRow key={product.productId}>
                              <TableCell>
                                {product.imageUrl ? (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground">
                                      No Image
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {product.name}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {product.hasVariants
                                    ? "Product with Variants"
                                    : "Simple Product"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {product.sku}
                                </span>
                              </TableCell>
                              <TableCell>
                                {formatCurrency(product.price)}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(product.discountedPrice)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {formatCurrency(
                                    product.price - product.discountedPrice
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveProduct(product.productId)
                                  }
                                  disabled={removing === product.productId}
                                >
                                  {removing === product.productId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}

                        {variants
                          .filter(
                            (variant) =>
                              variant.variantName
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()) ||
                              variant.variantSku
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()) ||
                              variant.productName
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase())
                          )
                          .map((variant) => (
                            <TableRow
                              key={variant.variantId}
                              className="bg-muted/50"
                            >
                              <TableCell>
                                {variant.imageUrl ? (
                                  <img
                                    src={variant.imageUrl}
                                    alt={variant.variantName}
                                    className="w-12 h-12 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground">
                                      No Image
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                <div>
                                  <div className="text-sm text-muted-foreground">
                                    {variant.productName}
                                  </div>
                                  <div>└ {variant.variantName}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">Variant</Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {variant.variantSku}
                                </span>
                              </TableCell>
                              <TableCell>
                                {formatCurrency(variant.price)}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(variant.discountedPrice)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {formatCurrency(
                                    variant.price - variant.discountedPrice
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveVariant(variant.variantId)
                                  }
                                  disabled={removing === variant.variantId}
                                >
                                  {removing === variant.variantId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
