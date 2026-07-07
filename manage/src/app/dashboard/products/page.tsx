"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Eye,
  Edit,
  Percent,
  Plus,
  FilterIcon,
  Trash,
  Search,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProductDiscountModal } from "@/components/ProductDiscountModal";
import { FilterDialog } from "@/components/products/FilterDialog";
import { FilterButton } from "@/components/products/FilterButton";
import { productService } from "@/lib/services/product-service";
import { shopService } from "@/lib/services/shop-service";
import {
  ManyProductsDto,
  ProductSearchDTO,
  ProductSearchFilterRequest,
} from "@/lib/types/product";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shopSlug");

  // Shop state
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);

  // Pagination and filter state
  const [searchFilters, setSearchFilters] = useState<ProductSearchDTO>({
    page: 0,
    size: 10,
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  // Search keyword state
  const [searchKeyword, setSearchKeyword] = useState("");

  // Filter dialog state
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // Add state for discount modal
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string>("");
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Deletion error dialog (e.g. DELETION_BLOCKED from backend)
  const [deletionErrorDialogOpen, setDeletionErrorDialogOpen] = useState(false);
  const [deletionErrorMessage, setDeletionErrorMessage] = useState<string>("");

  // Fetch shop by slug to get shopId
  const { data: shopData, isLoading: shopLoading, error: shopFetchError } = useQuery({
    queryKey: ["shop", shopSlug],
    queryFn: () => {
      if (!shopSlug) {
        throw new Error("Shop slug is required");
      }
      return shopService.getShopBySlug(shopSlug);
    },
    enabled: !!shopSlug,
    retry: false,
  });

  // Update shopId when shop data is fetched
  useEffect(() => {
    if (shopData) {
      setShopId(shopData.shopId);
      setShopError(null);
    }
  }, [shopData]);

  // Handle shop fetch error - redirect to /shops
  useEffect(() => {
    if (shopFetchError && shopSlug) {
      console.error("Error fetching shop:", shopFetchError);
      setShopError("Shop not found or you don't have access to it");
      // Redirect to shops page after a short delay
      setTimeout(() => {
        router.push("/shops");
      }, 2000);
    }
  }, [shopFetchError, shopSlug, router]);

  // Redirect if no shopSlug is provided - do this immediately
  useEffect(() => {
    if (!shopSlug) {
      router.replace("/shops");
    }
  }, [shopSlug, router]);

  // Don't render if no shopSlug (will redirect)
  if (!shopSlug) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Fetch products with React Query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["products", searchFilters, shopId],
    queryFn: () => {
      // If we have search criteria, use search endpoint
      if (
        searchFilters.searchKeyword ||
        searchFilters.categoryId ||
        searchFilters.brandId ||
        searchFilters.isOnSale ||
        searchFilters.isFeatured ||
        searchFilters.isBestseller ||
        searchFilters.basePriceMin ||
        searchFilters.basePriceMax ||
        searchFilters.inStock
      ) {
        return productService.advancedSearchProducts(searchFilters, shopId || undefined);
      }
      // Otherwise use getAllProducts with shopId
      return productService.getAllProducts(
        searchFilters.page || 0,
        searchFilters.size || 10,
        searchFilters.sortBy || "createdAt",
        searchFilters.sortDirection || "desc",
        shopId || undefined
      );
    },
    enabled: !!shopId, // Only fetch when shopId is available
  });

  // Function to open discount modal
  const openDiscountModal = (productId: string) => {
    setSelectedProductId(productId);
    setDiscountModalOpen(true);
  };

  const openDeleteModal = (productId: string) => {
    // Check if user has chosen to skip confirmation
    const deletePreference = localStorage.getItem("productDeletePreference");
    if (deletePreference === "true") {
      // Skip confirmation and delete directly
      handleDeleteProduct(productId);
    } else {
      // Show confirmation modal
      setProductToDelete(productId);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await productService.deleteProduct(productId);

      // Refresh the product list
      refetch();

      setDeleteModalOpen(false);
      setProductToDelete("");

      toast({
        title: "Success",
        description: "Product deleted successfully",
        variant: "default",
      });
    } catch (error: unknown) {
      console.error("Error deleting product:", error);
      const message =
        typeof error === "string"
          ? error
          : (error as { message?: string })?.message ||
            "Failed to delete product. Please try again.";
      setDeletionErrorMessage(message);
      setDeletionErrorDialogOpen(true);
      setDeleteModalOpen(false);
      setProductToDelete("");
    }
  };

  const confirmDelete = () => {
    // Save preference if don't ask again is checked
    if (dontAskAgain) {
      localStorage.setItem("productDeletePreference", "true");
    }

    // Delete the product
    handleDeleteProduct(productToDelete);

    // Close the modal
    setDeleteModalOpen(false);
  };

  const handleCreateEmptyProduct = async () => {
    // Validate shopId is available
    if (!shopId) {
      toast({
        title: "Error",
        description: "Shop information is required to create a product. Please wait for shop data to load.",
        variant: "destructive",
      });
      return;
    }

    // Validate shopSlug is available for navigation
    if (!shopSlug) {
      toast({
        title: "Error",
        description: "Shop context is missing. Please return to the shops page and try again.",
        variant: "destructive",
      });
      router.push("/shops");
      return;
    }

    try {
      console.log("Creating empty product with shopId:", shopId);
      const response = await productService.createEmptyProduct("New Product", shopId);
      console.log("Product created successfully:", response);
      router.push(`/dashboard/products/${response.productId}/update?shopSlug=${shopSlug}`);
    } catch (error: any) {
      console.error("Error creating empty product:", error);
      
      // Handle shop-related errors
      if (error.response?.status === 403 || error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || "Access denied to this shop";
        toast({
          title: "Access Denied",
          description: errorMessage,
          variant: "destructive",
        });
        // Redirect to shops page if access is denied
        setTimeout(() => {
          router.push("/shops");
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create new product. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (
      newPage >= 0 &&
      (!data || !data.totalPages || newPage < data.totalPages)
    ) {
      setSearchFilters((prev) => ({ ...prev, page: newPage }));
    }
  };

  // Apply filters from dialog
  const handleApplyFilters = (filters: ProductSearchFilterRequest) => {
    // Convert legacy filters to new format
    const newFilters: ProductSearchDTO = {
      page: 0, // Reset to first page
      size: searchFilters.size,
      sortBy: filters.sortBy || "createdAt",
      sortDirection: filters.sortDirection || "desc",
      searchKeyword: filters.keyword,
      basePriceMin: filters.minPrice,
      basePriceMax: filters.maxPrice,
      inStock: filters.inStock,
      isOnSale: filters.onSale,
      isFeatured: filters.popular,
      isBestseller: filters.popular,
    };

    // Add category filters if present
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      newFilters.categoryIds = filters.categoryIds.map((id) => parseInt(id));
    }

    setSearchFilters(newFilters);
  };

  // Handle search
  const handleSearch = (filters: ProductSearchFilterRequest) => {
    handleApplyFilters(filters);
  };

  // Handle keyword search
  const handleKeywordSearch = () => {
    if (searchKeyword.trim()) {
      setSearchFilters((prev) => ({
        ...prev,
        searchKeyword: searchKeyword.trim(),
        page: 0, // Reset to first page
      }));
    } else {
      // Remove search keyword and reset to getAllProducts
      setSearchFilters((prev) => {
        const { searchKeyword, ...rest } = prev;
        return { ...rest, page: 0 };
      });
    }
  };

  // Handle Enter key in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleKeywordSearch();
    }
  };

  // Get active filter count for the button badge
  const getActiveFilterCount = (): number => {
    let count = 0;
    if (searchFilters.searchKeyword) count += 1;
    if (searchFilters.categoryId || searchFilters.categoryIds?.length)
      count += 1;
    if (searchFilters.brandId || searchFilters.brandIds?.length) count += 1;
    if (searchFilters.basePriceMin || searchFilters.basePriceMax) count += 1;
    if (searchFilters.inStock !== undefined) count += 1;
    if (searchFilters.isOnSale !== undefined) count += 1;
    if (searchFilters.isFeatured !== undefined) count += 1;
    if (searchFilters.isBestseller !== undefined) count += 1;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border/40 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Products
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your product inventory
          </p>
        </div>

        <div className="flex items-center gap-2">
          <FilterButton
            onApplyFilters={handleSearch}
            currentFilters={searchFilters as any}
          />

          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleCreateEmptyProduct}
            disabled={!shopId || shopLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            {shopLoading ? "Loading..." : "Add Product"}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products by name, description, SKU..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="pl-10"
          />
        </div>
        <Button onClick={handleKeywordSearch} variant="outline">
          Search
        </Button>
        {searchFilters.searchKeyword && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchKeyword("");
              setSearchFilters((prev) => {
                const { searchKeyword, ...rest } = prev;
                return { ...rest, page: 0 };
              });
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Shop Loading/Error State */}
      {shopLoading && (
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading shop information...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {shopError && (
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-medium mb-2 text-destructive">Shop Error</h3>
              <p className="text-muted-foreground mb-4">{shopError}</p>
              <p className="text-sm text-muted-foreground">Redirecting to shops page...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product List */}
      {!shopLoading && !shopError && (
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-medium mb-2">
                Error loading products
              </h3>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error
                  ? error.message
                  : "An unexpected error occurred"}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          ) : !data || !data.content || data.content.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {searchFilters.searchKeyword
                  ? `No products found matching "${searchFilters.searchKeyword}". Try adjusting your search.`
                  : "Try adjusting your filters or add some products."}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFilterDialogOpen(true)}
                >
                  <FilterIcon className="w-4 h-4 mr-2" />
                  Adjust Filters
                </Button>
                <Button 
                  onClick={handleCreateEmptyProduct}
                  disabled={!shopId || shopLoading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {shopLoading ? "Loading..." : "Add Product"}
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((product: ManyProductsDto) => (
                  <TableRow key={product.productId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.primaryImage ? (
                          <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden">
                            <img
                              src={product.primaryImage.imageUrl}
                              alt={
                                product.primaryImage.altText ||
                                product.productName
                              }
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6 text-muted-foreground/50"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {product.productName}
                          </span>
                          {product.shortDescription && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                                    {product.shortDescription.length > 100 
                                      ? `${product.shortDescription.substring(0, 100)}...` 
                                      : product.shortDescription}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{product.shortDescription}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <div className="flex gap-1 mt-1">
                            {product.isBestSeller && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                              >
                                Best Seller
                              </Badge>
                            )}
                            {product.isFeatured && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-50 text-green-700 border-green-200"
                              >
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="secondary">
                          {product.category.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.brand ? (
                        <Badge variant="outline">
                          {product.brand.brandName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {formatCurrency(product.price)}
                        </span>
                        {product.compareAtPrice &&
                          product.compareAtPrice > product.price && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatCurrency(product.compareAtPrice)}
                            </span>
                          )}
                        {product.discountInfo && (
                          <span className="text-xs text-primary font-medium mt-1">
                            {product.discountInfo.percentage}% OFF
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.stockQuantity > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          {product.stockQuantity} in stock
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-50 text-red-700 border-red-200"
                        >
                          Out of stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {product.discountInfo && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                          >
                            On Sale
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/products/${product.productId}${shopSlug ? `?shopSlug=${encodeURIComponent(shopSlug)}` : ""}`
                                  )
                                }
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Product</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/products/${product.productId}/update${shopSlug ? `?shopSlug=${encodeURIComponent(shopSlug)}` : ""}`
                                  )
                                }
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Product</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() =>
                                  openDiscountModal(product.productId)
                                }
                              >
                                <Percent className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Manage Discounts</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  openDeleteModal(product.productId)
                                }
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Product</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!isLoading &&
            !isError &&
            data &&
            data.content &&
            data.content.length > 0 && (
              <div className="flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(searchFilters.page! - 1)}
                    className={
                      searchFilters.page === 0
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {/* Generate page numbers */}
                {Array.from({ length: data.totalPages || 0 }, (_, i) => {
                  // Show current page, first, last, and pages around current
                  const shouldShowPage =
                    i === 0 || // First page
                    i === (data.totalPages || 0) - 1 || // Last page
                    Math.abs(i - searchFilters.page!) <= 1; // Pages around current

                  if (!shouldShowPage) {
                    // Return ellipsis for skipped pages, but only once
                    if (i === searchFilters.page! - 2) {
                      return (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <span className="px-4">...</span>
                        </PaginationItem>
                      );
                    }
                    if (i === searchFilters.page! + 2) {
                      return (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <span className="px-4">...</span>
                        </PaginationItem>
                      );
                    }
                    return null;
                  }

                  return (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={searchFilters.page === i}
                        onClick={() => handlePageChange(i)}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(searchFilters.page! + 1)}
                    className={
                      searchFilters.page === (data.totalPages || 0) - 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
              </div>
            )}
        </CardContent>
      </Card>
      )}

      {/* Filters Dialog */}
      <FilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        onApplyFilters={handleApplyFilters}
        currentFilters={searchFilters as any}
      />

      {/* Discount Modal */}
      <ProductDiscountModal
        open={discountModalOpen}
        onOpenChange={setDiscountModalOpen}
        selectedProductId={selectedProductId}
        shopId={shopId}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="dont-ask-again"
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked === true)}
            />
            <label
              htmlFor="dont-ask-again"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Don't ask again
            </label>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="border-primary/20 hover:bg-primary/5 hover:text-primary"
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deletion blocked / error dialog */}
      <Dialog
        open={deletionErrorDialogOpen}
        onOpenChange={(open) => {
          setDeletionErrorDialogOpen(open);
          if (!open) setDeletionErrorMessage("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Cannot Delete Product
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-1">
                {deletionErrorMessage}
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              onClick={() => {
                setDeletionErrorDialogOpen(false);
                setDeletionErrorMessage("");
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
