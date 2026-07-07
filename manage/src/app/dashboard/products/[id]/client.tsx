"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Package,
  Tag,
  Palette,
  Ruler,
  Star,
  DollarSign,
  Calendar,
  Percent,
  ShoppingBag,
  Info,
  FileText,
  Settings,
  Image as ImageIcon,
  Video,
  Layers,
  BarChart3,
  Weight,
  Hash,
  Globe,
  Clock,
  Eye,
  EyeOff,
  TrendingUp,
  Sparkles,
  Award,
  Zap,
  Warehouse,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { ProductDTO } from "@/lib/types/product";
import WarehouseStockTable from "@/components/WarehouseStockTable";
import { formatCurrency } from "@/lib/utils";

interface ProductClientProps {
  product: ProductDTO;
  id: string;
  shopSlug?: string | null;
}

export default function ProductClient({
  product,
  id,
  shopSlug,
}: ProductClientProps) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(
    product.images && product.images.length > 0
      ? product.images.find((img) => img.isPrimary)?.url ||
          product.images[0].url
      : null,
  );

  if (!product) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-muted-foreground">
              Product not found
            </h2>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/products")}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => formatCurrency(price);

  const getPrimaryImage = () => {
    if (product.images && product.images.length > 0) {
      return product.images.find((img) => img.isPrimary) || product.images[0];
    }
    return null;
  };

  const primaryImage = getPrimaryImage();

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="border-b border-border/40 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const backUrl = `/dashboard/products${shopSlug ? `?shopSlug=${encodeURIComponent(shopSlug)}` : ""}`;
                router.push(backUrl);
              }}
              className="border-primary/20 hover:bg-primary/5 hover:text-primary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                {product.name}
              </h1>
              <p className="text-muted-foreground">Product Details</p>
            </div>
          </div>
          <Button
            onClick={() => {
              const updateUrl = `/dashboard/products/${id}/update${shopSlug ? `?shopSlug=${encodeURIComponent(shopSlug)}` : ""}`;
              router.push(updateUrl);
            }}
            className="bg-primary hover:bg-primary/90 mt-2 sm:mt-0"
          >
            <Edit className="mr-2 h-4 w-4" />
            Update Product
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={product.isActive ? "default" : "destructive"}>
          {product.isActive ? (
            <Eye className="h-3 w-3 mr-1" />
          ) : (
            <EyeOff className="h-3 w-3 mr-1" />
          )}
          {product.isActive ? "Active" : "Inactive"}
        </Badge>
        {product.isFeatured && (
          <Badge className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="h-3 w-3 mr-1" />
            Featured
          </Badge>
        )}
        {product.isBestseller && (
          <Badge className="bg-yellow-600 hover:bg-yellow-700">
            <Award className="h-3 w-3 mr-1" />
            Bestseller
          </Badge>
        )}
        {product.isNewArrival && (
          <Badge className="bg-green-600 hover:bg-green-700">
            <Zap className="h-3 w-3 mr-1" />
            New Arrival
          </Badge>
        )}
        {product.isOnSale && (
          <Badge className="bg-red-600 hover:bg-red-700">
            <TrendingUp className="h-3 w-3 mr-1" />
            On Sale
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Product Images */}
            <Card className="lg:col-span-1 border-border/40 shadow-sm">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Product Images
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-2">
                  {primaryImage ? (
                    <>
                      <div className="col-span-2 aspect-square rounded-md overflow-hidden bg-muted">
                        <img
                          src={selectedImage || primaryImage.url}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {product.images && product.images.length > 1 && (
                        <div className="col-span-2 grid grid-cols-4 gap-2 mt-2">
                          {product.images.map((image, index) => (
                            <div
                              key={image.imageId}
                              className={`aspect-square rounded-md overflow-hidden bg-muted cursor-pointer transition-all ${
                                selectedImage === image.url
                                  ? "ring-2 ring-primary"
                                  : "hover:opacity-80"
                              }`}
                              onClick={() => setSelectedImage(image.url)}
                            >
                              <img
                                src={image.url}
                                alt={`${product.name} - Image ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="col-span-2 aspect-square rounded-md bg-muted flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground mt-2">
                        No images
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Product Information */}
            <Card className="lg:col-span-2 border-border/40 shadow-sm">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Basic Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Base Price
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(product.basePrice)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Stock Quantity
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <Package className="h-4 w-4" />
                      <span className="text-lg font-semibold">
                        {product.stockQuantity} units
                      </span>
                    </div>
                  </div>
                </div>

                {product.salePrice && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Sale Price
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-xl font-bold text-green-600">
                          {formatPrice(product.salePrice)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Savings
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <Percent className="h-4 w-4 text-green-600" />
                        <span className="text-lg font-semibold text-green-600">
                          {formatPrice(product.basePrice - product.salePrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {product.discountedPrice && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Final Price (After Discounts)
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4 text-red-600" />
                      <span className="text-2xl font-bold text-red-600">
                        {formatPrice(product.discountedPrice)}
                      </span>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <p className="mt-1 text-foreground leading-relaxed">
                    {product.description || "No description available"}
                  </p>
                </div>

                {product.fullDescription && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Full Description
                    </label>
                    <p className="mt-1 text-foreground leading-relaxed">
                      {product.fullDescription}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Product Identifiers */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      SKU
                    </label>
                    <span className="mt-1 text-sm font-mono bg-muted px-2 py-1 rounded">
                      {product.sku}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Categories and Brand */}
                <div className="grid gap-4 md:grid-cols-2">
                  {product.categoryName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Category
                      </label>
                      <Badge variant="outline" className="mt-1">
                        {product.categoryName}
                      </Badge>
                    </div>
                  )}
                  {product.brandName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Brand
                      </label>
                      <Badge variant="outline" className="mt-1">
                        {product.brandName}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Ratings */}
                {(product.averageRating !== undefined ||
                  product.reviewCount !== undefined) && (
                  <>
                    <Separator />
                    <div className="grid gap-4 md:grid-cols-2">
                      {product.averageRating !== undefined && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Average Rating
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-semibold">
                              {product.averageRating.toFixed(1)}
                            </span>
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < Math.round(product.averageRating!)
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {product.reviewCount !== undefined && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Review Count
                          </label>
                          <span className="mt-1 text-lg font-semibold">
                            {product.reviewCount} reviews
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Physical Properties */}
                {product.weightKg != null && (
                  <>
                    <Separator />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Weight className="h-4 w-4" />
                          Weight
                        </label>
                        <span className="mt-1 text-sm bg-muted px-2 py-1 rounded">
                          {product.weightKg} kg
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Timestamps */}
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Created
                    </label>
                    <span className="mt-1 text-sm text-muted-foreground">
                      {formatDate(product.createdAt)}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Last Updated
                    </label>
                    <span className="mt-1 text-sm text-muted-foreground">
                      {formatDate(product.updatedAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Product Images ({product.images?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {product.images && product.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {product.images.map((image, index) => (
                      <div key={image.imageId} className="space-y-2">
                        <div className="aspect-square rounded-md overflow-hidden bg-muted">
                          <img
                            src={image.url}
                            alt={`${product.name} - Image ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-center space-y-1">
                          <div className="flex items-center justify-center gap-2">
                            {image.isPrimary && (
                              <Badge variant="default" className="text-xs">
                                Primary
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              Order: {image.sortOrder}
                            </Badge>
                          </div>
                          {image.altText && (
                            <p className="text-xs text-muted-foreground">
                              {image.altText}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                    <p>No images available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Videos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Product Videos ({product.videos?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {product.videos && product.videos.length > 0 ? (
                  <div className="space-y-4">
                    {product.videos.map((video, index) => (
                      <div key={video.videoId} className="space-y-2">
                        <div className="aspect-video rounded-md overflow-hidden bg-muted">
                          <video
                            src={video.url}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="space-y-1">
                          {video.title && (
                            <h4 className="font-medium">{video.title}</h4>
                          )}
                          {video.description && (
                            <p className="text-sm text-muted-foreground">
                              {video.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Order: {video.sortOrder}</span>
                            {video.durationSeconds && (
                              <span>Duration: {video.durationSeconds}s</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-2" />
                    <p>No videos available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Variants Tab */}
        <TabsContent value="variants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Product Variants ({product.variants?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.variants && product.variants.length > 0 ? (
                <div className="space-y-4">
                  {product.variants.map((variant) => (
                    <Card key={variant.variantId} className="border-border/40">
                      <CardContent className="pt-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Variant SKU
                            </label>
                            <p className="mt-1 font-mono text-sm bg-muted px-2 py-1 rounded">
                              {variant.variantSku}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Price
                            </label>
                            <p className="mt-1 font-semibold">
                              {formatPrice(variant.price)}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Stock
                            </label>
                            <p className="mt-1 font-semibold">
                              {variant.stockQuantity} units
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Status
                            </label>
                            <div className="mt-1">
                              <Badge
                                variant={
                                  variant.isActive ? "default" : "secondary"
                                }
                              >
                                {variant.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {variant.variantName && (
                          <div className="mt-4">
                            <label className="text-sm font-medium text-muted-foreground">
                              Variant Name
                            </label>
                            <p className="mt-1">{variant.variantName}</p>
                          </div>
                        )}

                        {variant.salePrice && (
                          <div className="mt-4">
                            <label className="text-sm font-medium text-muted-foreground">
                              Sale Price
                            </label>
                            <p className="mt-1 font-semibold text-green-600">
                              {formatPrice(variant.salePrice)}
                            </p>
                          </div>
                        )}

                        {variant.costPrice && (
                          <div className="mt-4">
                            <label className="text-sm font-medium text-muted-foreground">
                              Cost Price
                            </label>
                            <p className="mt-1 font-semibold text-muted-foreground">
                              {formatPrice(variant.costPrice)}
                            </p>
                          </div>
                        )}

                        {/* Variant Attributes */}
                        {variant.attributes &&
                          variant.attributes.length > 0 && (
                            <div className="mt-4">
                              <label className="text-sm font-medium text-muted-foreground">
                                Attributes
                              </label>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {variant.attributes.map((attr) => (
                                  <Badge
                                    key={attr.attributeValueId}
                                    variant="outline"
                                  >
                                    {attr.attributeType}: {attr.attributeValue}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Variant Images */}
                        {variant.images && variant.images.length > 0 && (
                          <div className="mt-4">
                            <label className="text-sm font-medium text-muted-foreground">
                              Variant Images
                            </label>
                            <div className="mt-2 grid grid-cols-4 gap-2">
                              {variant.images.map((img) => (
                                <div
                                  key={img.imageId}
                                  className="aspect-square rounded-md overflow-hidden bg-muted"
                                >
                                  <img
                                    src={img.url}
                                    alt={`Variant ${variant.variantSku}`}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-border/40">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              Created: {formatDate(variant.createdAt)}
                            </span>
                            <span>
                              Updated: {formatDate(variant.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-2" />
                  <p>No variants available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouse Stock Tab */}
        <TabsContent value="warehouse" className="space-y-6">
          <div className="space-y-6">
            {/* Warehouse Stock Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5" />
                  Warehouse Stock Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-primary/5 rounded-md">
                    <div className="text-2xl font-bold text-primary">
                      {product.totalWarehouseStock || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Stock Units
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-md">
                    <div className="text-2xl font-bold text-green-600">
                      {product.totalWarehouses || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Warehouses
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-md">
                    <div className="text-2xl font-bold text-green-600">
                      {product.warehouseStock?.filter(
                        (stock) => stock.isInStock,
                      ).length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Locations
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Warehouse Stock Display */}
            {product.warehouseStock && product.warehouseStock.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Current Warehouse Stock ({
                      product.warehouseStock.length
                    }{" "}
                    entries)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {product.warehouseStock.map((stock) => (
                      <div
                        key={stock.stockId}
                        className="border rounded-md p-4"
                      >
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          {/* Warehouse Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-semibold">
                                {stock.warehouseName}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {stock.warehouseAddress}, {stock.warehouseCity}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {stock.warehouseState}, {stock.warehouseCountry}
                            </div>
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

                          {/* Stock Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-green-600" />
                              <span className="font-semibold">
                                {stock.quantity} units
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Threshold: {stock.lowStockThreshold}
                            </div>
                            <div className="flex items-center gap-2">
                              {stock.isOutOfStock ? (
                                <Badge
                                  variant="destructive"
                                  className="flex items-center gap-1"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Out of Stock
                                </Badge>
                              ) : stock.isLowStock ? (
                                <Badge
                                  variant="secondary"
                                  className="flex items-center gap-1 bg-yellow-100 text-yellow-800"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Low Stock
                                </Badge>
                              ) : (
                                <Badge
                                  variant="default"
                                  className="flex items-center gap-1 bg-green-100 text-green-800"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  In Stock
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Variant Info */}
                          {stock.isVariantBased && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-purple-600" />
                                <span className="font-semibold">
                                  {stock.variantName}
                                </span>
                              </div>
                              <div className="text-sm font-mono text-muted-foreground">
                                SKU: {stock.variantSku}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                Variant Stock
                              </Badge>
                            </div>
                          )}

                          {/* Timestamps */}
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground">
                              Last Updated
                            </div>
                            <div className="text-sm">
                              {formatDate(stock.updatedAt)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Stock ID: {stock.stockId}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Warehouse className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No warehouse stock information available
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Detailed Warehouse Stock Table */}
            <WarehouseStockTable
              productId={id}
              title="Detailed Warehouse Stock (Live Data)"
            />

            {/* Variant Level Warehouse Stock */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-border/40 pb-2">
                  <h3 className="text-lg font-semibold">
                    Variant Warehouse Stock Details
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Individual warehouse stock for each product variant
                  </p>
                </div>

                {product.variants.map((variant) => (
                  <div key={variant.variantId} className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {variant.variantSku}
                      </Badge>
                      <span className="text-sm font-medium">
                        {variant.variantName}
                      </span>
                    </div>
                    <WarehouseStockTable
                      productId={id}
                      variantId={variant.variantId}
                      title={`${variant.variantName} - Warehouse Stock`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* SEO Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Slug
                  </label>
                  <p className="mt-1 text-sm font-mono bg-muted px-2 py-1 rounded">
                    {product.slug}
                  </p>
                </div>
                {product.storageInstructions && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Storage Instructions
                    </label>
                    <p className="mt-1 text-sm bg-muted px-2 py-1 rounded">
                      {product.storageInstructions}
                    </p>
                  </div>
                )}
                {product.nutritionalInfo && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Nutritional Information
                    </label>
                    <p className="mt-1 text-sm bg-muted px-2 py-1 rounded">
                      {product.nutritionalInfo}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Technical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Technical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Product ID
                  </label>
                  <p className="mt-1 text-sm font-mono bg-muted px-2 py-1 rounded">
                    {product.productId}
                  </p>
                </div>
                {product.categoryId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Category ID
                    </label>
                    <p className="mt-1 text-sm font-mono bg-muted px-2 py-1 rounded">
                      {product.categoryId}
                    </p>
                  </div>
                )}
                {product.brandId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Brand ID
                    </label>
                    <p className="mt-1 text-sm font-mono bg-muted px-2 py-1 rounded">
                      {product.brandId}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created At
                  </label>
                  <p className="mt-1 text-sm bg-muted px-2 py-1 rounded">
                    {formatDate(product.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Updated At
                  </label>
                  <p className="mt-1 text-sm bg-muted px-2 py-1 rounded">
                    {formatDate(product.updatedAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
