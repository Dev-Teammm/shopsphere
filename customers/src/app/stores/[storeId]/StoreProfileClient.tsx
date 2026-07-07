"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Star,
  Calendar,
  Package,
  User,
  CheckCircle2,
  ArrowLeft,
  Search,
  Filter,
  Share2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Users,
  Mail,
  Phone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StoreService } from "@/lib/storeService";
import ProductCard from "@/components/ProductCard";
import { useAppSelector } from "@/lib/store/hooks";
import { toast } from "sonner";
import { WarehouseService, WarehouseDTO } from "@/lib/warehouseService";
import { DeliveryAreaService, DeliveryAreaDTO } from "@/lib/deliveryAreaService";
import { Warehouse, Truck } from "lucide-react";

interface Product {
  productId: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  primaryImage: string | null;
  rating: number;
  reviewCount: number;
  categoryName: string | null;
  isInStock: boolean;
  brandName?: string | null;
  shortDescription?: string | null;
  isNew?: boolean;
  isBestseller?: boolean;
  isFeatured?: boolean;
  hasActiveDiscount?: boolean;
  discountPercentage?: number;
  organic?: boolean;
  unit?: { id: number; symbol: string; name: string };
  shopCapability?:
    | "VISUALIZATION_ONLY"
    | "PICKUP_ORDERS"
    | "FULL_ECOMMERCE"
    | "HYBRID";
}

interface ShopDetails {
  shopId: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  category: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
  status: string;
  rating: number;
  totalReviews: number;
  productCount: number;
  followerCount?: number;
  isFollowing?: boolean;
  primaryCapability?: string;
  capabilities?: string[];
  createdAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
  featuredProducts: Product[];
}

export function StoreProfileClient({ storeId }: { storeId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [store, setStore] = useState<ShopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [unfollowDialogOpen, setUnfollowDialogOpen] = useState(false);
  
  // Warehouses state
  const [warehouses, setWarehouses] = useState<WarehouseDTO[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [warehousesPage, setWarehousesPage] = useState(0);
  const [warehousesTotalPages, setWarehousesTotalPages] = useState(0);
  const [warehousesTotalElements, setWarehousesTotalElements] = useState(0);
  
  // Delivery areas state
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryAreaDTO[]>([]);
  const [deliveryAreasLoading, setDeliveryAreasLoading] = useState(false);
  const [deliveryAreasPage, setDeliveryAreasPage] = useState(0);
  const [deliveryAreasTotalPages, setDeliveryAreasTotalPages] = useState(0);
  const [deliveryAreasTotalElements, setDeliveryAreasTotalElements] = useState(0);

  useEffect(() => {
    const fetchStoreDetails = async () => {
      try {
        setLoading(true);
        const data = await StoreService.getShopDetails(storeId);
        setStore(data);
      } catch (error) {
        console.error("Error fetching store details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (storeId) {
      fetchStoreDetails();
    }
  }, [storeId]);

  // Handle follow/unfollow toggle
  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      setLoginDialogOpen(true);
      return;
    }

    if (!store) return;

    // If unfollowing, show confirmation dialog
    if (store.isFollowing) {
      setUnfollowDialogOpen(true);
      return;
    }

    // If following, proceed directly
    try {
      await StoreService.followShop(storeId);
      setStore({
        ...store,
        isFollowing: true,
        followerCount: (store.followerCount || 0) + 1,
      });
      toast.success("Following shop");
    } catch (error: any) {
      console.error("Error following shop:", error);
      toast.error(error.message || "Failed to follow shop");
    }
  };

  // Handle confirmed unfollow
  const handleConfirmUnfollow = async () => {
    if (!store) return;

    try {
      await StoreService.unfollowShop(storeId);
      setStore({
        ...store,
        isFollowing: false,
        followerCount: (store.followerCount || 0) - 1,
      });
      toast.success("Unfollowed shop");
      setUnfollowDialogOpen(false);
    } catch (error: any) {
      console.error("Error unfollowing shop:", error);
      toast.error(error.message || "Failed to unfollow shop");
    }
  };

  // Check if user should be redirected after login
  useEffect(() => {
    const shouldFollow = searchParams.get("follow") === "true";

    if (isAuthenticated && shouldFollow && store && !store.isFollowing) {
      // User just logged in and wants to follow
      handleFollowToggle();
      // Clean up URL params
      router.replace(`/stores/${storeId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, searchParams, store]);

  // Fetch warehouses
  const fetchWarehouses = async (page: number) => {
    try {
      setWarehousesLoading(true);
      const response = await WarehouseService.getWarehousesByShopId(storeId, page, 10);
      setWarehouses(response.content);
      setWarehousesPage(response.number);
      setWarehousesTotalPages(response.totalPages);
      setWarehousesTotalElements(response.totalElements);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      toast.error("Failed to load warehouses");
    } finally {
      setWarehousesLoading(false);
    }
  };

  // Fetch delivery areas
  const fetchDeliveryAreas = async (page: number) => {
    try {
      setDeliveryAreasLoading(true);
      const response = await DeliveryAreaService.getDeliveryAreasByShopId(storeId, page, 10);
      setDeliveryAreas(response.content);
      setDeliveryAreasPage(response.number);
      setDeliveryAreasTotalPages(response.totalPages);
      setDeliveryAreasTotalElements(response.totalElements);
    } catch (error) {
      console.error("Error fetching delivery areas:", error);
      toast.error("Failed to load delivery areas");
    } finally {
      setDeliveryAreasLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-lg text-muted-foreground">
          Loading store profile...
        </p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h2 className="text-3xl font-bold mb-4">Store Not Found</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          The store you are looking for does not exist or has been removed.
        </p>
        <Button onClick={() => router.push("/stores")} size="lg">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Stores
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Banner with Glassmorphism */}
      <div className="relative h-[300px] w-full bg-muted overflow-hidden">
        <Image
          src={
            store.logoUrl ||
            "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop"
          }
          alt={store.name}
          fill
          className="object-cover brightness-75"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />

        {/* Top Actions */}
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <Button
            variant="secondary"
            size="sm"
            className="backdrop-blur-md bg-transparent/20 hover:bg-transparent/40 text-white border-white/20"
            onClick={() => router.push("/stores")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Info Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-border/50 backdrop-blur-sm bg-background/95">
              <CardHeader className="flex flex-col items-center text-center pt-8">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-background shadow-md">
                    <AvatarImage
                      src={
                        store.logoUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${store.name}`
                      }
                      alt={store.name}
                    />
                    <AvatarFallback>
                      {store.name.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {store.isActive && (
                    <Badge className="absolute bottom-0 right-0 h-8 w-8 rounded-full p-0 flex items-center justify-center bg-primary border-4 border-background">
                      <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                    </Badge>
                  )}
                </div>

                <h1 className="mt-4 text-2xl font-bold">{store.name}</h1>
                <div className="flex items-center gap-1 mt-2 text-yellow-500">
                  <Star className="fill-current w-5 h-5" />
                  <span className="font-semibold text-foreground">
                    {store.rating}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    ({store.totalReviews} reviews)
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
                  <Badge variant="secondary" className="text-base px-4 py-1">
                    {store.category}
                  </Badge>
                  {store.primaryCapability && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        store.primaryCapability === "PICKUP_ORDERS"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : store.primaryCapability === "FULL_ECOMMERCE"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : store.primaryCapability === "HYBRID"
                              ? "bg-orange-100 text-orange-700 border-orange-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {store.primaryCapability === "PICKUP_ORDERS" &&
                        "Pickup Only"}
                      {store.primaryCapability === "FULL_ECOMMERCE" &&
                        "Full E-commerce"}
                      {store.primaryCapability === "HYBRID" && "Hybrid"}
                      {store.primaryCapability === "VISUALIZATION_ONLY" &&
                        "Display Only"}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <p className="text-center text-muted-foreground leading-relaxed">
                  {store.description}
                </p>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        Owner
                      </p>
                      <p className="font-medium">
                        {store.owner.firstName} {store.owner.lastName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        Location
                      </p>
                      <p className="font-medium">{store.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        Member Since
                      </p>
                      <p className="font-medium">
                        {new Date(store.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        Products
                      </p>
                      <p className="font-medium">{store.productCount}</p>
                    </div>
                  </div>

                  {/* Follower Count */}
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        Followers
                      </p>
                      <p className="font-medium">
                        {store.followerCount?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pb-8">
                <Button
                  className="w-full h-11 text-base shadow-lg hover:shadow-primary/20 transition-all"
                  onClick={() => setContactDialogOpen(true)}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact Seller
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={store.isFollowing ? "outline" : "default"}
                        className="w-full h-11"
                        onClick={handleFollowToggle}
                      >
                        <Heart
                          className={`mr-2 h-4 w-4 ${store.isFollowing ? "fill-red-500 text-red-500" : ""}`}
                        />
                        {store.isFollowing ? "Following" : "Follow Store"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {store.isFollowing
                          ? "Click to unfollow this store"
                          : "Click to follow this store and stay updated"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardFooter>
            </Card>
          </div>

          {/* Main Content Areas */}
          <div className="lg:col-span-2 mt-8 lg:mt-20">
            <Tabs defaultValue="products" className="w-full">
              <TabsList className="w-full justify-start h-12 bg-transparent border-b rounded-none p-0 gap-8 mb-8">
                <TabsTrigger
                  value="products"
                  className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-base px-0 pb-3"
                >
                  Products ({store.productCount})
                </TabsTrigger>
                <TabsTrigger
                  value="about"
                  className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-base px-0 pb-3"
                >
                  About
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-base px-0 pb-3"
                >
                  Reviews ({store.totalReviews})
                </TabsTrigger>
                <TabsTrigger
                  value="warehouses"
                  className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-base px-0 pb-3"
                  onClick={() => {
                    if (warehouses.length === 0 && !warehousesLoading) {
                      fetchWarehouses(0);
                    }
                  }}
                >
                  Warehouses ({warehousesTotalElements || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="delivery-areas"
                  className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-base px-0 pb-3"
                  onClick={() => {
                    if (deliveryAreas.length === 0 && !deliveryAreasLoading) {
                      fetchDeliveryAreas(0);
                    }
                  }}
                >
                  Delivery Areas ({deliveryAreasTotalElements || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Featured Products</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {store.featuredProducts.map((product) => (
                    <ProductCard
                      key={product.productId}
                      id={product.productId}
                      name={product.name}
                      price={product.price}
                      originalPrice={product.compareAtPrice || product.price}
                      discountedPrice={product.price}
                      discount={product.discountPercentage}
                      rating={product.rating}
                      reviewCount={product.reviewCount}
                      image={
                        product.primaryImage ||
                        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop"
                      }
                      category={product.categoryName || undefined}
                      brand={product.brandName || undefined}
                      shortDescription={product.shortDescription || undefined}
                      isNew={product.isNew}
                      isBestseller={product.isBestseller}
                      isFeatured={product.isFeatured}
                      hasActiveDiscount={product.hasActiveDiscount}
                      isOrganic={product.organic}
                      unit={product.unit}
                      shopCapability={store.primaryCapability as any}
                    />
                  ))}
                </div>

                <div className="flex justify-center pb-8 border-b">
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 px-8 rounded-full border-primary/50 text-primary hover:bg-primary hover:text-white transition-all"
                    onClick={() => router.push(`/stores/${storeId}/products`)}
                  >
                    Explore More Products
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent
                value="about"
                className="animate-in fade-in-50 duration-500"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>About {store.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-muted-foreground">
                    <p>
                      Welcome to {store.name}! We have been serving our
                      community since {new Date(store.createdAt).getFullYear()}.
                      Our mission is to provide high-quality{" "}
                      {store.category?.toLowerCase() || "premium"} products at
                      affordable prices.
                    </p>
                    <p>
                      Located in {store.address}, we take pride in our fast
                      shipping and excellent customer support. Every product is
                      carefully selected and inspected before shipping.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <h4 className="text-2xl font-bold text-primary mb-1">
                          100%
                        </h4>
                        <p className="text-sm">Authentic Products</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <h4 className="text-2xl font-bold text-primary mb-1">
                          24/7
                        </h4>
                        <p className="text-sm">Support</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="reviews"
                className="animate-in fade-in-50 duration-500"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-6 p-6 bg-muted/50 rounded-xl">
                    <div className="text-center">
                      <span className="text-5xl font-bold text-foreground">
                        {store.rating}
                      </span>
                      <div className="flex justify-center my-2 text-yellow-500">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.round(store.rating)
                                ? "fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {store.totalReviews} Global Ratings
                      </p>
                    </div>
                    <div className="flex-1 border-l pl-6 space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="flex items-center gap-2">
                          <span className="text-sm w-3">{rating}</span>
                          <Star className="w-3 h-3 text-muted-foreground" />
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500"
                              style={{
                                width:
                                  rating === 5
                                    ? "70%"
                                    : rating === 4
                                      ? "20%"
                                      : "5%",
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {rating === 5 ? "70%" : rating === 4 ? "20%" : "5%"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mock Reviews */}
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>U{i}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">
                                Happy Customer {i}
                              </p>
                              <div className="flex items-center text-yellow-500 text-xs">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className="w-3 h-3 fill-current"
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            2 days ago
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          "Absolutely love the products from this store!
                          Shipping was super fast and the packaging was
                          beautiful. Will definitely order again."
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent
                value="warehouses"
                className="animate-in fade-in-50 duration-500"
              >
                <div className="space-y-4">
                  <h3 className="text-xl font-bold mb-6">Warehouses</h3>
                  {warehousesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : warehouses.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No warehouses available for this store.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {warehouses.map((warehouse) => (
                          <Card key={warehouse.id}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                                {warehouse.isActive && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              {warehouse.description && (
                                <CardDescription>{warehouse.description}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-start gap-3 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium">{warehouse.address}</p>
                                  <p className="text-muted-foreground">
                                    {warehouse.city}
                                    {warehouse.state && `, ${warehouse.state}`}
                                    {warehouse.zipCode && ` ${warehouse.zipCode}`}
                                  </p>
                                  <p className="text-muted-foreground">{warehouse.country}</p>
                                </div>
                              </div>
                              {warehouse.phone && (
                                <div className="flex items-center gap-3 text-sm">
                                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <a href={`tel:${warehouse.phone}`} className="text-primary hover:underline">
                                    {warehouse.phone}
                                  </a>
                                </div>
                              )}
                              {warehouse.email && (
                                <div className="flex items-center gap-3 text-sm">
                                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <a href={`mailto:${warehouse.email}`} className="text-primary hover:underline">
                                    {warehouse.email}
                                  </a>
                                </div>
                              )}
                              {warehouse.capacity && (
                                <div className="flex items-center gap-3 text-sm">
                                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">
                                    Capacity: {warehouse.capacity.toLocaleString()} units
                                  </span>
                                </div>
                              )}
                              {warehouse.productCount > 0 && (
                                <div className="pt-2 border-t">
                                  <p className="text-sm text-muted-foreground">
                                    {warehouse.productCount} product{warehouse.productCount !== 1 ? 's' : ''} available
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {warehousesTotalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-6">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchWarehouses(warehousesPage - 1)}
                            disabled={warehousesPage === 0 || warehousesLoading}
                          >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {warehousesPage + 1} of {warehousesTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchWarehouses(warehousesPage + 1)}
                            disabled={warehousesPage >= warehousesTotalPages - 1 || warehousesLoading}
                          >
                            Next
                            <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="delivery-areas"
                className="animate-in fade-in-50 duration-500"
              >
                <div className="space-y-4">
                  <h3 className="text-xl font-bold mb-6">Delivery Areas</h3>
                  {deliveryAreasLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : deliveryAreas.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No delivery areas available for this store.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {deliveryAreas.map((area) => (
                          <Card key={area.id}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-lg">{area.name}</CardTitle>
                                  {area.description && (
                                    <CardDescription className="mt-1">{area.description}</CardDescription>
                                  )}
                                </div>
                                {area.isActive && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    Active
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-3 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium">{area.country}</span>
                              </div>
                              {area.warehouseName && (
                                <div className="flex items-center gap-3 text-sm">
                                  <Warehouse className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">
                                    Warehouse: {area.warehouseName}
                                  </span>
                                </div>
                              )}
                              {area.parentName && (
                                <div className="flex items-center gap-3 text-sm">
                                  <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">
                                    Parent Area: {area.parentName}
                                  </span>
                                </div>
                              )}
                              {area.children && area.children.length > 0 && (
                                <div className="pt-3 border-t">
                                  <p className="text-sm font-medium mb-2">Sub-areas:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {area.children.map((child) => (
                                      <Badge key={child.id} variant="secondary">
                                        {child.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {area.childrenCount !== undefined && area.childrenCount > 0 && area.children?.length === 0 && (
                                <div className="pt-2 border-t">
                                  <p className="text-sm text-muted-foreground">
                                    {area.childrenCount} sub-area{area.childrenCount !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {deliveryAreasTotalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-6">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchDeliveryAreas(deliveryAreasPage - 1)}
                            disabled={deliveryAreasPage === 0 || deliveryAreasLoading}
                          >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {deliveryAreasPage + 1} of {deliveryAreasTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchDeliveryAreas(deliveryAreasPage + 1)}
                            disabled={deliveryAreasPage >= deliveryAreasTotalPages - 1 || deliveryAreasLoading}
                          >
                            Next
                            <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Contact Seller Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Contact {store.name}</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setContactDialogOpen(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Get in touch with the shop owner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Owner</p>
                <p className="text-sm text-muted-foreground">
                  {store.owner.firstName} {store.owner.lastName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <a
                  href={`mailto:${store.contactEmail}`}
                  className="text-sm text-primary hover:underline"
                >
                  {store.contactEmail}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <a
                  href={`tel:${store.contactPhone}`}
                  className="text-sm text-primary hover:underline"
                >
                  {store.contactPhone}
                </a>
              </div>
            </div>
            {store.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    {store.address}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Required Dialog */}
      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              You need to be logged in to follow shops
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Please sign in or create an account to follow {store.name} and
              stay updated with their latest products and offers.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const returnUrl = `/stores/${storeId}?follow=true`;
                  router.push(
                    `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`,
                  );
                }}
              >
                Sign In
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  const returnUrl = `/stores/${storeId}?follow=true`;
                  router.push(
                    `/auth/register?returnUrl=${encodeURIComponent(returnUrl)}`,
                  );
                }}
              >
                Sign Up
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unfollow Confirmation Dialog */}
      <Dialog open={unfollowDialogOpen} onOpenChange={setUnfollowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unfollow {store?.name}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to unfollow this shop? You will no longer
              receive updates about their products and offers.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setUnfollowDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleConfirmUnfollow}
            >
              Unfollow
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
