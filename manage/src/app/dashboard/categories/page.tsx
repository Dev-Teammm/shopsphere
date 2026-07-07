"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  TagIcon,
  Plus,
  Edit,
  Trash,
  MoreHorizontal,
  ChevronRight,
  Search,
  FolderPlus,
  ArrowLeft,
  Tag,
  Info,
  ShoppingBag,
  Loader2,
  Image,
  Star,
  Calendar,
} from "lucide-react";
import { adminCategoryService } from "@/lib/services/admin-category-service";
import { brandService } from "@/lib/services/brand-service";
import {
  CategoryResponse,
  CategoryCreateRequest,
  CategoryUpdateRequest,
} from "@/lib/types/category";
import {
  BrandResponse,
  CreateBrandRequest,
  UpdateBrandRequest,
} from "@/lib/types/brand";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useSearchParams, useRouter } from "next/navigation";
import { shopService } from "@/lib/services/shop-service";

export default function CategoriesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shopSlug");

  const {
    isCreateCategoryDialogOpen,
    setIsCreateCategoryDialogOpen,
    isCreateBrandDialogOpen,
    setIsCreateBrandDialogOpen,
  } = useDashboard();

  // Fetch shop by slug to get shopId
  const {
    data: shopData,
    isLoading: isLoadingShop,
    isError: isErrorShop,
  } = useQuery({
    queryKey: ["shop", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug,
  });

  // Extract shopId with validation
  const shopId = shopData?.shopId;

  // Use ref to always have access to latest shopId in mutation closures
  const shopIdRef = useRef<string | undefined>(shopId);

  // Update ref whenever shopId changes and store in sessionStorage for API client safety net
  useEffect(() => {
    shopIdRef.current = shopId;
    console.log("[Ref] shopId ref updated:", shopId);

    // Store shopId in sessionStorage for API client safety net
    if (shopSlug && shopId) {
      sessionStorage.setItem(`shopId_${shopSlug}`, shopId);
      console.log("[Ref] shopId stored in sessionStorage:", shopId);
    }
  }, [shopId, shopSlug]);

  // Debug shop data extraction
  useEffect(() => {
    if (shopSlug) {
      console.log("Shop data extraction:", {
        shopSlug,
        shopData,
        shopId,
        shopIdRef: shopIdRef.current,
        shopIdType: typeof shopId,
        shopIdValid:
          shopId && typeof shopId === "string" && shopId.trim() !== "",
        isLoadingShop,
        isErrorShop,
      });
    }
  }, [shopSlug, shopData, shopId, isLoadingShop, isErrorShop]);

  // Debug logging
  useEffect(() => {
    if (shopSlug) {
      console.log("Shop query state:", {
        shopSlug,
        shopId,
        shopData,
        isLoadingShop,
        isErrorShop,
      });
    }
  }, [shopSlug, shopId, shopData, isLoadingShop, isErrorShop]);

  // Redirect to shops page if shopSlug is missing or shop fetch fails
  useEffect(() => {
    if (shopSlug) {
      if (isErrorShop || (!isLoadingShop && !shopId)) {
        toast.toast({
          title: "Error",
          description: "Shop not found. Redirecting to shops page.",
          variant: "destructive",
        });
        router.push("/shops");
      }
    }
  }, [shopSlug, isErrorShop, isLoadingShop, shopId, router, toast]);

  // States for category management
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { id: number | null; name: string }[]
  >([{ id: null, name: "All Categories" }]);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryResponse | null>(null);

  // Brand dialog states
  const [isEditBrandDialogOpen, setIsEditBrandDialogOpen] = useState(false);
  const [isDeleteBrandDialogOpen, setIsDeleteBrandDialogOpen] = useState(false);
  const [isViewBrandDialogOpen, setIsViewBrandDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandResponse | null>(
    null,
  );

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formMetaTitle, setFormMetaTitle] = useState("");
  const [formMetaDescription, setFormMetaDescription] = useState("");
  const [formMetaKeywords, setFormMetaKeywords] = useState("");

  // Brand form states
  const [brandFormName, setBrandFormName] = useState("");
  const [brandFormDescription, setBrandFormDescription] = useState("");
  const [brandFormLogoUrl, setBrandFormLogoUrl] = useState("");
  const [brandFormWebsiteUrl, setBrandFormWebsiteUrl] = useState("");
  const [brandFormIsActive, setBrandFormIsActive] = useState(true);
  const [brandFormIsFeatured, setBrandFormIsFeatured] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Brand-specific sort field (brands use 'brandName', categories use 'name')
  const brandSortBy = "brandName";

  // Type guard to check if data is paginated
  const isPaginatedData = (
    data: any,
  ): data is { content: CategoryResponse[]; totalPages: number } => {
    return (
      data &&
      typeof data === "object" &&
      "content" in data &&
      "totalPages" in data
    );
  };

  // Fetch categories based on current parent
  const {
    data: categoriesData,
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
    error: errorCategories,
  } = useQuery({
    queryKey: [
      "categories",
      currentParentId,
      currentPage,
      pageSize,
      sortBy,
      sortDir,
      shopId,
    ],
    queryFn: async () => {
      if (currentParentId === null) {
        return await adminCategoryService.getAllCategories(
          currentPage,
          pageSize,
          sortBy,
          sortDir,
          shopId,
        );
      } else {
        return await adminCategoryService.getSubcategories(currentParentId);
      }
    },
    enabled: !isLoadingShop && (shopSlug ? !!shopId : true),
  });

  // Extract categories from the response
  const categories =
    currentParentId === null
      ? isPaginatedData(categoriesData)
        ? categoriesData.content
        : []
      : categoriesData || [];

  // Fetch all categories for dropdown selection
  const { data: allCategoriesData, isLoading: isLoadingAllCategories } =
    useQuery({
      queryKey: ["allCategories"],
      queryFn: () =>
        adminCategoryService.getAllCategories(0, 1000, "name", "asc"),
      // Only fetch when needed for selection
      enabled: isCreateCategoryDialogOpen || isEditDialogOpen,
    });

  const allCategories = allCategoriesData?.content || [];

  // Mutations for CRUD operations
  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryCreateRequest) => {
      // CRITICAL: Always ensure shopId is included if shopSlug is present
      // Use ref to get the latest shopId value (not closure value)
      const finalData: CategoryCreateRequest = { ...data };

      // Get current shopSlug from searchParams (we'll need to get it fresh)
      const currentShopSlug = new URLSearchParams(window.location.search).get(
        "shopSlug",
      );

      // If shopSlug is present, shopId MUST be included
      if (currentShopSlug) {
        // Use shopId from ref (always current), data parameter, or closure
        const currentShopId = shopIdRef.current || data.shopId || shopId;

        console.log("[Mutation] shopId sources:", {
          fromRef: shopIdRef.current,
          fromData: data.shopId,
          fromClosure: shopId,
          selected: currentShopId,
        });

        if (
          !currentShopId ||
          typeof currentShopId !== "string" ||
          currentShopId.trim() === ""
        ) {
          console.error("[Mutation] CRITICAL: shopId is missing or invalid!", {
            shopSlug: currentShopSlug,
            shopIdFromRef: shopIdRef.current,
            shopIdFromData: data.shopId,
            shopIdFromClosure: shopId,
            currentShopId,
            shopData,
          });
          throw new Error(
            "Shop ID is required but missing. Please refresh the page and try again.",
          );
        }

        // Always set shopId - this ensures it's in the payload
        finalData.shopId = currentShopId;
        console.log(
          "[Mutation] ✓ shopId included in category data:",
          currentShopId,
        );
      }

      console.log(
        "[Mutation] Final category data being sent:",
        JSON.stringify(finalData, null, 2),
      );
      console.log(
        "[Mutation] Payload verification - shopId present:",
        !!finalData.shopId,
        "value:",
        finalData.shopId,
      );
      console.log("[Mutation] Payload keys:", Object.keys(finalData));
      return adminCategoryService.createCategory(finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["allCategories"] });
      toast.toast({
        title: "Category created",
        description: "The category was created successfully.",
        variant: "success",
      });
      resetForm();
      setIsCreateCategoryDialogOpen(false);
    },
    onError: (error: any) => {
      toast.toast({
        title: "Error",
        description: error.message || "Failed to create category.",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryUpdateRequest }) =>
      adminCategoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["allCategories"] });
      toast.toast({
        title: "Category updated",
        description: "The category was updated successfully.",
        variant: "success",
      });
      resetForm();
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.toast({
        title: "Error",
        description: error.message || "Failed to update category.",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => adminCategoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["allCategories"] });
      toast.toast({
        title: "Category deleted",
        description: "The category was deleted successfully.",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.toast({
        title: "Error",
        description: error.message || "Failed to delete category.",
        variant: "destructive",
      });
    },
  });

  // Brand queries and mutations
  const {
    data: brandsData,
    isLoading: isLoadingBrands,
    isError: isErrorBrands,
    error: errorBrands,
  } = useQuery({
    queryKey: ["brands", currentPage, pageSize, brandSortBy, sortDir, shopId],
    queryFn: () =>
      brandService.getAllBrands(
        currentPage,
        pageSize,
        brandSortBy,
        sortDir,
        shopId,
      ),
    enabled: !isLoadingShop && (shopSlug ? !!shopId : true),
  });

  const brands = brandsData?.content || [];

  const createBrandMutation = useMutation({
    mutationFn: (data: CreateBrandRequest) => {
      // CRITICAL: Always ensure shopId is included if shopSlug is present
      // Use ref to get the latest shopId value (not closure value)
      const finalData: CreateBrandRequest = { ...data };

      // Get current shopSlug from searchParams (we'll need to get it fresh)
      const currentShopSlug = new URLSearchParams(window.location.search).get(
        "shopSlug",
      );

      // If shopSlug is present, shopId MUST be included
      if (currentShopSlug) {
        // Use shopId from ref (always current), data parameter, or closure
        const currentShopId = shopIdRef.current || data.shopId || shopId;

        console.log("[Mutation] shopId sources:", {
          fromRef: shopIdRef.current,
          fromData: data.shopId,
          fromClosure: shopId,
          selected: currentShopId,
        });

        if (
          !currentShopId ||
          typeof currentShopId !== "string" ||
          currentShopId.trim() === ""
        ) {
          console.error("[Mutation] CRITICAL: shopId is missing or invalid!", {
            shopSlug: currentShopSlug,
            shopIdFromRef: shopIdRef.current,
            shopIdFromData: data.shopId,
            shopIdFromClosure: shopId,
            currentShopId,
            shopData,
          });
          throw new Error(
            "Shop ID is required but missing. Please refresh the page and try again.",
          );
        }

        // Always set shopId - this ensures it's in the payload
        finalData.shopId = currentShopId;
        console.log(
          "[Mutation] ✓ shopId included in brand data:",
          currentShopId,
        );
      }

      console.log(
        "[Mutation] Final brand data being sent:",
        JSON.stringify(finalData, null, 2),
      );
      console.log(
        "[Mutation] Payload verification - shopId present:",
        !!finalData.shopId,
        "value:",
        finalData.shopId,
      );
      console.log("[Mutation] Payload keys:", Object.keys(finalData));
      return brandService.createBrand(finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.toast({
        title: "Brand created",
        description: "The brand was created successfully.",
        variant: "success",
      });
      resetBrandForm();
      setIsCreateBrandDialogOpen(false);
    },
    onError: (error: any) => {
      toast.toast({
        title: "Error",
        description: error.message || "Failed to create brand.",
        variant: "destructive",
      });
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBrandRequest }) =>
      brandService.updateBrand(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.toast({
        title: "Brand updated",
        description: "The brand was updated successfully.",
        variant: "success",
      });
      resetBrandForm();
      setIsEditBrandDialogOpen(false);
    },
    onError: (error: any) => {
      toast.toast({
        title: "Error",
        description: error.message || "Failed to update brand.",
        variant: "destructive",
      });
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: (id: string) => brandService.deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.toast({
        title: "Brand deleted",
        description: "The brand was deleted successfully.",
        variant: "success",
      });
      setIsDeleteBrandDialogOpen(false);
    },
    onError: (error: any) => {
      toast.toast({
        title: "Error",
        description: error.message || "Failed to delete brand.",
        variant: "destructive",
      });
    },
  });

  // Filter categories based on search query
  const filteredCategories = (
    Array.isArray(categories) ? categories : []
  ).filter(
    (category: CategoryResponse) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.description &&
        category.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Calculate total pages for pagination
  const totalPages =
    currentParentId === null
      ? isPaginatedData(categoriesData)
        ? categoriesData.totalPages
        : 0
      : Math.ceil(filteredCategories.length / pageSize);

  // Navigate to subcategories
  const navigateToSubcategories = useCallback(
    async (category: CategoryResponse) => {
      try {
        setCurrentParentId(category.id);
        setBreadcrumbs([
          ...breadcrumbs,
          { id: category.id, name: category.name },
        ]);

        // Reset pagination when navigating
        setCurrentPage(0);
      } catch (error) {
        toast.toast({
          title: "Error",
          description: "Failed to load subcategories.",
          variant: "destructive",
        });
      }
    },
    [breadcrumbs, toast],
  );

  // Navigate back using breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentParentId(newBreadcrumbs[newBreadcrumbs.length - 1].id);

    // Reset pagination when navigating
    setCurrentPage(0);
  };

  // Handle create category
  const handleCreateCategory = () => {
    console.log(
      "handleCreateCategory called - shopSlug:",
      shopSlug,
      "shopId:",
      shopId,
      "shopData:",
      shopData,
    );

    // For VENDOR/EMPLOYEE, shopId is required when shopSlug is present
    if (shopSlug) {
      if (isLoadingShop) {
        console.warn("Shop is still loading, preventing category creation");
        toast.toast({
          title: "Please wait",
          description:
            "Shop information is loading. Please try again in a moment.",
          variant: "default",
        });
        return;
      }

      if (!shopId) {
        console.error("CRITICAL: shopId is missing but shopSlug is present!", {
          shopSlug,
          shopId,
          shopData,
          isLoadingShop,
          isErrorShop,
        });
        toast.toast({
          title: "Error",
          description:
            "Shop ID is missing. Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Build category data - ALWAYS include shopId when shopSlug is present
    const categoryData: CategoryCreateRequest = {
      name: formName,
      description: formDescription || undefined,
      imageUrl: formImageUrl || undefined,
      parentId: formParentId,
      sortOrder: formSortOrder,
      isActive: formIsActive,
      isFeatured: formIsFeatured,
      metaTitle: formMetaTitle || undefined,
      metaDescription: formMetaDescription || undefined,
      metaKeywords: formMetaKeywords || undefined,
    };

    // CRITICAL: Always include shopId when shopSlug is present (required for VENDOR/EMPLOYEE)
    // Use explicit check to ensure shopId is a valid string, with ref fallback
    const effectiveShopId = shopId || shopIdRef.current;
    if (
      shopSlug &&
      effectiveShopId &&
      typeof effectiveShopId === "string" &&
      effectiveShopId.trim() !== ""
    ) {
      categoryData.shopId = effectiveShopId;
      console.log("✓ shopId included in category data:", effectiveShopId);
    } else if (shopSlug) {
      console.error("✗ shopId validation failed:", {
        shopSlug,
        shopId,
        type: typeof shopId,
      });
      toast.toast({
        title: "Error",
        description: "Invalid shop ID. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    console.log(
      "Creating category with FULL data:",
      JSON.stringify(categoryData, null, 2),
    );
    console.log("Verification - shopId in payload:", categoryData.shopId);
    console.log("Payload keys:", Object.keys(categoryData));

    // Final validation before sending
    if (shopSlug && !categoryData.shopId) {
      console.error(
        "FINAL CHECK FAILED: shopId missing from payload!",
        categoryData,
      );
      toast.toast({
        title: "Error",
        description:
          "Shop ID is missing from request. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    createCategoryMutation.mutate(categoryData);
  };

  // Handle edit category
  const handleEditCategory = () => {
    if (!selectedCategory) return;

    const categoryData: CategoryUpdateRequest = {
      name: formName,
      description: formDescription || undefined,
      imageUrl: formImageUrl || undefined,
      parentId: formParentId,
      sortOrder: formSortOrder,
      isActive: formIsActive,
      isFeatured: formIsFeatured,
      metaTitle: formMetaTitle || undefined,
      metaDescription: formMetaDescription || undefined,
      metaKeywords: formMetaKeywords || undefined,
    };

    updateCategoryMutation.mutate({
      id: selectedCategory.id,
      data: categoryData,
    });
  };

  // Handle delete category
  const handleDeleteCategory = () => {
    if (!selectedCategory) return;
    deleteCategoryMutation.mutate(selectedCategory.id);
  };

  // Reset form fields
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormParentId(null);
    setFormImageUrl("");
    setFormSortOrder(0);
    setFormIsActive(true);
    setFormIsFeatured(false);
    setFormMetaTitle("");
    setFormMetaDescription("");
    setFormMetaKeywords("");
    setSelectedCategory(null);
  };

  // Reset brand form fields
  const resetBrandForm = () => {
    setBrandFormName("");
    setBrandFormDescription("");
    setBrandFormLogoUrl("");
    setBrandFormWebsiteUrl("");
    setBrandFormIsActive(true);
    setBrandFormIsFeatured(false);
    setSelectedBrand(null);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setFormParentId(currentParentId);
    setIsCreateCategoryDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (category: CategoryResponse) => {
    setSelectedCategory(category);
    setFormName(category.name);
    setFormDescription(category.description || "");
    setFormParentId(category.parentId || null);
    setFormImageUrl(category.imageUrl || "");
    setFormSortOrder(category.sortOrder);
    setFormIsActive(category.isActive);
    setFormIsFeatured(category.isFeatured);
    setFormMetaTitle(category.metaTitle || "");
    setFormMetaDescription(category.metaDescription || "");
    setFormMetaKeywords(category.metaKeywords || "");
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (category: CategoryResponse) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  // Open view dialog
  const openViewDialog = (category: CategoryResponse) => {
    setSelectedCategory(category);
    setIsViewDialogOpen(true);
  };

  // Get all potential parent categories (excluding current category and its descendants)
  const getValidParentCategories = () => {
    if (!selectedCategory) return allCategories.filter((c) => !c.parentId);

    // Prevent creating circular dependencies
    return allCategories.filter(
      (c) => c.id !== selectedCategory.id && c.parentId !== selectedCategory.id,
    );
  };

  // Handle pagination
  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 0 && pageNumber < totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Check if category has subcategories
  const hasSubcategories = (category: CategoryResponse | null) => {
    return category?.children && category.children.length > 0;
  };

  // Get subcategory count
  const getSubcategoryCount = (category: CategoryResponse | null) => {
    return category?.children ? category.children.length : 0;
  };

  const openCreateBrandDialog = () => {
    resetBrandForm();
    setIsCreateBrandDialogOpen(true);
  };

  const openEditBrandDialog = (brand: BrandResponse) => {
    setSelectedBrand(brand);
    setBrandFormName(brand.brandName);
    setBrandFormDescription(brand.description || "");
    setBrandFormLogoUrl(brand.logoUrl || "");
    setBrandFormWebsiteUrl(brand.websiteUrl || "");
    setBrandFormIsActive(brand.active);
    setBrandFormIsFeatured(brand.featured);
    setIsEditBrandDialogOpen(true);
  };

  const openDeleteBrandDialog = (brand: BrandResponse) => {
    setSelectedBrand(brand);
    setIsDeleteBrandDialogOpen(true);
  };

  const openViewBrandDialog = (brand: BrandResponse) => {
    setSelectedBrand(brand);
    setIsViewBrandDialogOpen(true);
  };

  const handleDeleteBrand = () => {
    if (!selectedBrand) return;
    deleteBrandMutation.mutate(selectedBrand.brandId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Categories & Brands
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage product categories, subcategories, and brands
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          {/* Categories Content */}

          {/* Breadcrumb Navigation */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <Breadcrumb className="overflow-hidden">
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem
                    key={index}
                    className={
                      index === breadcrumbs.length - 1 ? "font-semibold" : ""
                    }
                  >
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-primary">{crumb.name}</span>
                    ) : (
                      <BreadcrumbLink
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => navigateToBreadcrumb(index)}
                      >
                        {crumb.name}
                      </BreadcrumbLink>
                    )}
                    {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-4">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search categories..."
                  className="pl-8 border-primary/20 focus-visible:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 whitespace-nowrap"
                onClick={openCreateDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>

          {/* Categories Table */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg flex items-center">
                <TagIcon className="w-5 h-5 mr-2 text-primary" />
                {breadcrumbs.length > 1
                  ? `${breadcrumbs[breadcrumbs.length - 1].name} Subcategories`
                  : "Main Categories"}
              </CardTitle>
              <CardDescription>
                {breadcrumbs.length > 1
                  ? `Managing subcategories of ${
                      breadcrumbs[breadcrumbs.length - 1].name
                    }`
                  : "Top-level categories for your product catalog"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingCategories ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">
                    Loading categories...
                  </span>
                </div>
              ) : isErrorCategories ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-destructive mb-2">
                    Failed to load categories
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      queryClient.invalidateQueries({
                        queryKey: [
                          "categories",
                          currentParentId,
                          currentPage,
                          pageSize,
                          sortBy,
                          sortDir,
                        ],
                      })
                    }
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">
                            Subcategories
                          </TableHead>
                          <TableHead className="w-[120px] text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map(
                            (category: CategoryResponse) => (
                              <TableRow key={category.id}>
                                <TableCell>
                                  <div className="font-medium">
                                    {category.name}
                                  </div>
                                  {category.slug && (
                                    <div className="text-xs text-muted-foreground">
                                      /{category.slug}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-sm truncate">
                                  {category.description || (
                                    <span className="text-muted-foreground italic">
                                      No description
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex flex-col gap-1">
                                    <Badge
                                      variant={
                                        category.isActive
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {category.isActive
                                        ? "Active"
                                        : "Inactive"}
                                    </Badge>
                                    {category.isFeatured && (
                                      <Badge
                                        variant="outline"
                                        className="text-amber-600 border-amber-600"
                                      >
                                        <Star className="w-3 h-3 mr-1" />
                                        Featured
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasSubcategories(category) ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        navigateToSubcategories(category)
                                      }
                                      className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                                    >
                                      {getSubcategoryCount(category)}
                                      <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      0
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 p-0"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>
                                        Actions
                                      </DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => openViewDialog(category)}
                                      >
                                        <Info className="w-4 h-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => openEditDialog(category)}
                                      >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Category
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() =>
                                          navigateToSubcategories(category)
                                        }
                                        disabled={!hasSubcategories(category)}
                                      >
                                        <ChevronRight className="w-4 h-4 mr-2" />
                                        View Subcategories
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => {
                                          setSelectedCategory(category);
                                          setFormParentId(category.id);
                                          setIsCreateCategoryDialogOpen(true);
                                        }}
                                      >
                                        <FolderPlus className="w-4 h-4 mr-2" />
                                        Add Subcategory
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="cursor-pointer text-destructive focus:text-destructive"
                                        onClick={() =>
                                          openDeleteDialog(category)
                                        }
                                      >
                                        <Trash className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ),
                          )
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              {searchQuery ? (
                                <div className="text-muted-foreground">
                                  No categories matching "
                                  <span className="font-medium">
                                    {searchQuery}
                                  </span>
                                  "
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                  <TagIcon className="w-8 h-8 mb-2 opacity-40" />
                                  <span>
                                    {breadcrumbs.length > 1
                                      ? "No subcategories found"
                                      : "No categories found"}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 border-primary/20 hover:bg-primary/5 hover:text-primary"
                                    onClick={openCreateDialog}
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    {breadcrumbs.length > 1
                                      ? "Add a subcategory"
                                      : "Add your first category"}
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination - only show for top-level categories */}
                  {currentParentId === null &&
                    categoriesData &&
                    totalPages > 1 && (
                      <div className="py-4 px-4 flex items-center justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={prevPage}
                          disabled={currentPage === 0}
                        >
                          Previous
                        </Button>

                        {/* Create page number buttons */}
                        {Array.from(
                          { length: Math.min(totalPages, 5) },
                          (_, i) => {
                            let pageNumber;

                            // Logic to display page numbers around the current page
                            if (totalPages <= 5) {
                              pageNumber = i;
                            } else if (currentPage <= 1) {
                              pageNumber = i;
                            } else if (currentPage >= totalPages - 2) {
                              pageNumber = totalPages - 5 + i;
                            } else {
                              pageNumber = currentPage - 2 + i;
                            }

                            if (pageNumber < 0 || pageNumber >= totalPages) {
                              return null;
                            }

                            return (
                              <Button
                                key={pageNumber}
                                variant={
                                  currentPage === pageNumber
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => goToPage(pageNumber)}
                                className={
                                  currentPage === pageNumber
                                    ? "bg-primary hover:bg-primary/90"
                                    : ""
                                }
                              >
                                {pageNumber + 1}
                              </Button>
                            );
                          },
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={nextPage}
                          disabled={currentPage >= totalPages - 1}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Create Category Dialog */}
          <Dialog
            open={isCreateCategoryDialogOpen}
            onOpenChange={(open) => {
              setIsCreateCategoryDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {formParentId === currentParentId
                    ? "Create Category"
                    : "Create Subcategory"}
                </DialogTitle>
                <DialogDescription>
                  {formParentId === currentParentId
                    ? "Add a new category to your product catalog"
                    : `Add a subcategory under ${
                        selectedCategory?.name || "selected category"
                      }`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">
                      Category Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter category name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      placeholder="0"
                      value={formSortOrder}
                      onChange={(e) =>
                        setFormSortOrder(parseInt(e.target.value) || 0)
                      }
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter category description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="border-primary/20 focus-visible:ring-primary"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="imageUrl">Image URL (optional)</Label>
                  <Input
                    id="imageUrl"
                    placeholder="https://example.com/image.jpg"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="border-primary/20 focus-visible:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-primary/20"
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="rounded border-primary/20"
                    />
                    <Label htmlFor="isFeatured">Featured</Label>
                  </div>
                </div>
                {currentParentId === null && (
                  <div className="grid gap-2">
                    <Label htmlFor="parent">Parent Category (optional)</Label>
                    <Select
                      value={formParentId?.toString() || "none"}
                      onValueChange={(value) =>
                        setFormParentId(
                          value === "none" ? null : parseInt(value),
                        )
                      }
                      disabled={isLoadingAllCategories}
                    >
                      <SelectTrigger className="border-primary/20 focus-visible:ring-primary">
                        <SelectValue placeholder="None (Top-level category)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          None (Top-level category)
                        </SelectItem>
                        {allCategories
                          .filter((c) => !c.parentId)
                          .map((category) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Separator />
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">
                    SEO Settings (optional)
                  </Label>
                  <div className="grid gap-2">
                    <Input
                      placeholder="Meta Title"
                      value={formMetaTitle}
                      onChange={(e) => setFormMetaTitle(e.target.value)}
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                    <Textarea
                      placeholder="Meta Description"
                      value={formMetaDescription}
                      onChange={(e) => setFormMetaDescription(e.target.value)}
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                    <Input
                      placeholder="Meta Keywords (comma separated)"
                      value={formMetaKeywords}
                      onChange={(e) => setFormMetaKeywords(e.target.value)}
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsCreateCategoryDialogOpen(false);
                  }}
                  className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                  disabled={!!createCategoryMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={
                    !!(
                      !formName ||
                      createCategoryMutation.isPending ||
                      (shopSlug && (!shopId || isLoadingShop))
                    )
                  }
                  className="bg-primary hover:bg-primary/90"
                >
                  {createCategoryMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Category Dialog */}
          <Dialog
            open={isEditDialogOpen}
            onOpenChange={(open) => {
              setIsEditDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Category</DialogTitle>
                <DialogDescription>
                  Update details for category "{selectedCategory?.name}"
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">
                      Category Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="edit-name"
                      placeholder="Enter category name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-sortOrder">Sort Order</Label>
                    <Input
                      id="edit-sortOrder"
                      type="number"
                      placeholder="0"
                      value={formSortOrder}
                      onChange={(e) =>
                        setFormSortOrder(parseInt(e.target.value) || 0)
                      }
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Enter category description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="border-primary/20 focus-visible:ring-primary"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-imageUrl">Image URL (optional)</Label>
                  <Input
                    id="edit-imageUrl"
                    placeholder="https://example.com/image.jpg"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="border-primary/20 focus-visible:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-isActive"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-primary/20"
                    />
                    <Label htmlFor="edit-isActive">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-isFeatured"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="rounded border-primary/20"
                    />
                    <Label htmlFor="edit-isFeatured">Featured</Label>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-parent">Parent Category</Label>
                  <Select
                    value={formParentId?.toString() || "none"}
                    onValueChange={(value) =>
                      setFormParentId(value === "none" ? null : parseInt(value))
                    }
                    disabled={isLoadingAllCategories}
                  >
                    <SelectTrigger className="border-primary/20 focus-visible:ring-primary">
                      <SelectValue placeholder="None (Top-level category)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        None (Top-level category)
                      </SelectItem>
                      {getValidParentCategories()
                        .filter((c) => !c.parentId)
                        .map((category) => (
                          <SelectItem
                            key={category.id}
                            value={category.id.toString()}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">
                    SEO Settings (optional)
                  </Label>
                  <div className="grid gap-2">
                    <Input
                      placeholder="Meta Title"
                      value={formMetaTitle}
                      onChange={(e) => setFormMetaTitle(e.target.value)}
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                    <Textarea
                      placeholder="Meta Description"
                      value={formMetaDescription}
                      onChange={(e) => setFormMetaDescription(e.target.value)}
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                    <Input
                      placeholder="Meta Keywords (comma separated)"
                      value={formMetaKeywords}
                      onChange={(e) => setFormMetaKeywords(e.target.value)}
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsEditDialogOpen(false);
                  }}
                  className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                  disabled={!!updateCategoryMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleEditCategory}
                  disabled={!!(!formName || updateCategoryMutation.isPending)}
                  className="bg-primary hover:bg-primary/90"
                >
                  {updateCategoryMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Category Dialog */}
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => {
              setIsDeleteDialogOpen(open);
              if (!open) setSelectedCategory(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedCategory && hasSubcategories(selectedCategory)
                    ? `This will delete "${selectedCategory.name}" and all its subcategories. This action cannot be undone.`
                    : `This will delete the category "${
                        selectedCategory?.name || "this category"
                      }". This action cannot be undone.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                  disabled={!!deleteCategoryMutation.isPending}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteCategory();
                  }}
                  disabled={!!deleteCategoryMutation.isPending}
                >
                  {deleteCategoryMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* View Category Dialog */}
          <Dialog
            open={isViewDialogOpen}
            onOpenChange={(open) => {
              setIsViewDialogOpen(open);
              if (!open) setSelectedCategory(null);
            }}
          >
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Category Details</DialogTitle>
                <DialogDescription>
                  Detailed information about this category
                </DialogDescription>
              </DialogHeader>
              {selectedCategory && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Name</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCategory.name}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Slug</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCategory.slug || "Auto-generated"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Sort Order
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCategory.sortOrder}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Level</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCategory.level}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Description
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCategory.description ||
                        "No description provided"}
                    </p>
                  </div>
                  {selectedCategory.imageUrl && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Image URL
                        </p>
                        <p className="text-sm text-muted-foreground break-all">
                          {selectedCategory.imageUrl}
                        </p>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Parent Category
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCategory.parentName ||
                        "None (Top-level category)"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Status</p>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            selectedCategory.isActive ? "default" : "secondary"
                          }
                        >
                          {selectedCategory.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {selectedCategory.isFeatured && (
                          <Badge
                            variant="outline"
                            className="text-amber-600 border-amber-600"
                          >
                            <Star className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Subcategories
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getSubcategoryCount(selectedCategory)} subcategories
                      </p>
                    </div>
                  </div>
                  {(selectedCategory.metaTitle ||
                    selectedCategory.metaDescription ||
                    selectedCategory.metaKeywords) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-medium leading-none">
                          SEO Information
                        </p>
                        {selectedCategory.metaTitle && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Meta Title
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedCategory.metaTitle}
                            </p>
                          </div>
                        )}
                        {selectedCategory.metaDescription && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Meta Description
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedCategory.metaDescription}
                            </p>
                          </div>
                        )}
                        {selectedCategory.metaKeywords && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Meta Keywords
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedCategory.metaKeywords}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <div className="flex justify-end space-x-2 pt-4">
                    {hasSubcategories(selectedCategory) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigateToSubcategories(selectedCategory);
                          setIsViewDialogOpen(false);
                        }}
                        className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                      >
                        <ChevronRight className="w-4 h-4 mr-2" />
                        View Subcategories
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        openEditDialog(selectedCategory);
                      }}
                      className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="brands" className="space-y-6">
          {/* Brands Content */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search brands..."
                className="pl-8 border-primary/20 focus-visible:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 whitespace-nowrap"
              onClick={openCreateBrandDialog}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Brand
            </Button>
          </div>

          {/* Brands Table */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg flex items-center">
                <TagIcon className="w-5 h-5 mr-2 text-primary" />
                Product Brands
              </CardTitle>
              <CardDescription>
                Manage your product brands and their information
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingBrands ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">
                    Loading brands...
                  </span>
                </div>
              ) : isErrorBrands ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-destructive mb-2">Failed to load brands</p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      queryClient.invalidateQueries({
                        queryKey: [
                          "brands",
                          currentPage,
                          pageSize,
                          sortBy,
                          sortDir,
                        ],
                      })
                    }
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Brand Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">
                            Featured
                          </TableHead>
                          <TableHead className="w-[120px] text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {brands.length > 0 ? (
                          brands.map((brand: BrandResponse) => (
                            <TableRow key={brand.brandId}>
                              <TableCell>
                                <div className="font-medium">
                                  {brand.brandName}
                                </div>
                                {brand.slug && (
                                  <div className="text-xs text-muted-foreground">
                                    /{brand.slug}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="max-w-sm truncate">
                                {brand.description || (
                                  <span className="text-muted-foreground italic">
                                    No description
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={
                                    brand.active ? "default" : "secondary"
                                  }
                                >
                                  {brand.active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {brand.featured ? (
                                  <Badge
                                    variant="outline"
                                    className="text-amber-600 border-amber-600"
                                  >
                                    <Star className="w-3 h-3 mr-1" />
                                    Featured
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>
                                      Actions
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() => openViewBrandDialog(brand)}
                                    >
                                      <Info className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => openEditBrandDialog(brand)}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        openDeleteBrandDialog(brand)
                                      }
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <TagIcon className="h-8 w-8 text-muted-foreground" />
                                <p className="text-muted-foreground">
                                  No brands found
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={openCreateBrandDialog}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Create your first brand
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination for brands */}
                  {brandsData && brandsData.totalPages > 1 && (
                    <div className="py-4 px-4 flex items-center justify-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevPage}
                        disabled={currentPage === 0}
                      >
                        Previous
                      </Button>

                      {Array.from(
                        { length: Math.min(brandsData.totalPages, 5) },
                        (_, i) => {
                          let pageNumber;

                          if (brandsData.totalPages <= 5) {
                            pageNumber = i;
                          } else if (currentPage <= 1) {
                            pageNumber = i;
                          } else if (currentPage >= brandsData.totalPages - 2) {
                            pageNumber = brandsData.totalPages - 5 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }

                          if (
                            pageNumber < 0 ||
                            pageNumber >= brandsData.totalPages
                          ) {
                            return null;
                          }

                          return (
                            <Button
                              key={pageNumber}
                              variant={
                                currentPage === pageNumber
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => goToPage(pageNumber)}
                              className={
                                currentPage === pageNumber
                                  ? "bg-primary hover:bg-primary/90"
                                  : ""
                              }
                            >
                              {pageNumber + 1}
                            </Button>
                          );
                        },
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextPage}
                        disabled={currentPage >= brandsData.totalPages - 1}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Brand Dialog - Outside of TabsContent so it can be accessed from both tabs */}
      <Dialog
        open={isCreateBrandDialogOpen}
        onOpenChange={(open) => {
          setIsCreateBrandDialogOpen(open);
          if (!open) resetBrandForm();
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Brand</DialogTitle>
            <DialogDescription>
              Add a new brand to your product catalog
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="brandName">
                  Brand Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="brandName"
                  placeholder="Enter brand name"
                  value={brandFormName}
                  onChange={(e) => setBrandFormName(e.target.value)}
                  className="border-primary/20 focus-visible:ring-primary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brandLogoUrl">Logo URL (optional)</Label>
                <Input
                  id="brandLogoUrl"
                  placeholder="https://example.com/logo.png"
                  value={brandFormLogoUrl}
                  onChange={(e) => setBrandFormLogoUrl(e.target.value)}
                  className="border-primary/20 focus-visible:ring-primary"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brandDescription">Description (optional)</Label>
              <Textarea
                id="brandDescription"
                placeholder="Enter brand description"
                value={brandFormDescription}
                onChange={(e) => setBrandFormDescription(e.target.value)}
                className="border-primary/20 focus-visible:ring-primary"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brandWebsiteUrl">Website URL (optional)</Label>
              <Input
                id="brandWebsiteUrl"
                placeholder="https://example.com"
                value={brandFormWebsiteUrl}
                onChange={(e) => setBrandFormWebsiteUrl(e.target.value)}
                className="border-primary/20 focus-visible:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="brandIsActive"
                  checked={brandFormIsActive}
                  onChange={(e) => setBrandFormIsActive(e.target.checked)}
                  className="rounded border-primary/20"
                />
                <Label htmlFor="brandIsActive">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="brandIsFeatured"
                  checked={brandFormIsFeatured}
                  onChange={(e) => setBrandFormIsFeatured(e.target.checked)}
                  className="rounded border-primary/20"
                />
                <Label htmlFor="brandIsFeatured">Featured</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateBrandDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                console.log(
                  "handleCreateBrand called - shopSlug:",
                  shopSlug,
                  "shopId:",
                  shopId,
                  "shopData:",
                  shopData,
                );

                if (!brandFormName.trim()) {
                  toast.toast({
                    title: "Error",
                    description: "Brand name is required.",
                    variant: "destructive",
                  });
                  return;
                }

                // For VENDOR/EMPLOYEE, shopId is required when shopSlug is present
                if (shopSlug) {
                  if (isLoadingShop) {
                    console.warn(
                      "Shop is still loading, preventing brand creation",
                    );
                    toast.toast({
                      title: "Please wait",
                      description:
                        "Shop information is loading. Please try again in a moment.",
                      variant: "default",
                    });
                    return;
                  }

                  if (!shopId) {
                    console.error(
                      "CRITICAL: shopId is missing but shopSlug is present!",
                      {
                        shopSlug,
                        shopId,
                        shopData,
                        isLoadingShop,
                        isErrorShop,
                      },
                    );
                    toast.toast({
                      title: "Error",
                      description:
                        "Shop ID is missing. Please refresh the page and try again.",
                      variant: "destructive",
                    });
                    return;
                  }
                }

                const brandData: CreateBrandRequest = {
                  brandName: brandFormName.trim(),
                  description: brandFormDescription.trim() || undefined,
                  logoUrl: brandFormLogoUrl.trim() || undefined,
                  websiteUrl: brandFormWebsiteUrl.trim() || undefined,
                  isActive: brandFormIsActive,
                  isFeatured: brandFormIsFeatured,
                };

                // CRITICAL: Always include shopId when shopSlug is present (required for VENDOR/EMPLOYEE)
                // Use explicit check to ensure shopId is a valid string
                // Also try using the ref value as a fallback
                const currentShopIdForBrand = shopId || shopIdRef.current;
                if (
                  shopSlug &&
                  currentShopIdForBrand &&
                  typeof currentShopIdForBrand === "string" &&
                  currentShopIdForBrand.trim() !== ""
                ) {
                  brandData.shopId = currentShopIdForBrand;
                  console.log(
                    "✓ shopId included in brand data (from handler):",
                    currentShopIdForBrand,
                  );
                } else if (shopSlug) {
                  console.error("✗ shopId validation failed:", {
                    shopSlug,
                    shopId,
                    shopIdRef: shopIdRef.current,
                    type: typeof shopId,
                    typeRef: typeof shopIdRef.current,
                  });
                  toast.toast({
                    title: "Error",
                    description:
                      "Invalid shop ID. Please refresh the page and try again.",
                    variant: "destructive",
                  });
                  return;
                }

                console.log(
                  "Creating brand with FULL data:",
                  JSON.stringify(brandData, null, 2),
                );
                console.log(
                  "Verification - shopId in payload:",
                  brandData.shopId,
                );
                console.log("Payload keys:", Object.keys(brandData));

                // Final validation before sending
                if (shopSlug && !brandData.shopId) {
                  console.error(
                    "FINAL CHECK FAILED: shopId missing from payload!",
                    brandData,
                  );
                  toast.toast({
                    title: "Error",
                    description:
                      "Shop ID is missing from request. Please refresh and try again.",
                    variant: "destructive",
                  });
                  return;
                }

                createBrandMutation.mutate(brandData);
              }}
              disabled={
                !!(
                  createBrandMutation.isPending ||
                  (shopSlug && (!shopId || isLoadingShop))
                )
              }
            >
              {createBrandMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Brand"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Brand Dialog - Outside of TabsContent so it can be accessed from both tabs */}
      <Dialog
        open={isEditBrandDialogOpen}
        onOpenChange={(open) => {
          setIsEditBrandDialogOpen(open);
          if (!open) resetBrandForm();
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
            <DialogDescription>Update brand information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="editBrandName">
                  Brand Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="editBrandName"
                  placeholder="Enter brand name"
                  value={brandFormName}
                  onChange={(e) => setBrandFormName(e.target.value)}
                  className="border-primary/20 focus-visible:ring-primary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editBrandLogoUrl">Logo URL (optional)</Label>
                <Input
                  id="editBrandLogoUrl"
                  placeholder="https://example.com/logo.png"
                  value={brandFormLogoUrl}
                  onChange={(e) => setBrandFormLogoUrl(e.target.value)}
                  className="border-primary/20 focus-visible:ring-primary"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editBrandDescription">
                Description (optional)
              </Label>
              <Textarea
                id="editBrandDescription"
                placeholder="Enter brand description"
                value={brandFormDescription}
                onChange={(e) => setBrandFormDescription(e.target.value)}
                className="border-primary/20 focus-visible:ring-primary"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editBrandWebsiteUrl">
                Website URL (optional)
              </Label>
              <Input
                id="editBrandWebsiteUrl"
                placeholder="https://example.com"
                value={brandFormWebsiteUrl}
                onChange={(e) => setBrandFormWebsiteUrl(e.target.value)}
                className="border-primary/20 focus-visible:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editBrandIsActive"
                  checked={brandFormIsActive}
                  onChange={(e) => setBrandFormIsActive(e.target.checked)}
                  className="rounded border-primary/20"
                />
                <Label htmlFor="editBrandIsActive">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editBrandIsFeatured"
                  checked={brandFormIsFeatured}
                  onChange={(e) => setBrandFormIsFeatured(e.target.checked)}
                  className="rounded border-primary/20"
                />
                <Label htmlFor="editBrandIsFeatured">Featured</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditBrandDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!brandFormName.trim()) {
                  toast.toast({
                    title: "Error",
                    description: "Brand name is required.",
                    variant: "destructive",
                  });
                  return;
                }
                updateBrandMutation.mutate({
                  id: selectedBrand!.brandId,
                  data: {
                    brandName: brandFormName.trim(),
                    description: brandFormDescription.trim() || undefined,
                    logoUrl: brandFormLogoUrl.trim() || undefined,
                    websiteUrl: brandFormWebsiteUrl.trim() || undefined,
                    isActive: brandFormIsActive,
                    isFeatured: brandFormIsFeatured,
                  },
                });
              }}
              disabled={!!updateBrandMutation.isPending}
            >
              {updateBrandMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Brand"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Brand Dialog - Outside of TabsContent so it can be accessed from both tabs */}
      <AlertDialog
        open={isDeleteBrandDialogOpen}
        onOpenChange={setIsDeleteBrandDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedBrand?.brandName}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBrand}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Brand Dialog - Outside of TabsContent so it can be accessed from both tabs */}
      <Dialog
        open={isViewBrandDialogOpen}
        onOpenChange={(open) => {
          setIsViewBrandDialogOpen(open);
          if (!open) setSelectedBrand(null);
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Brand Details</DialogTitle>
            <DialogDescription>
              Detailed information about this brand
            </DialogDescription>
          </DialogHeader>
          {selectedBrand && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Name</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBrand.brandName}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Slug</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBrand.slug || "Auto-generated"}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Description</p>
                <p className="text-sm text-muted-foreground">
                  {selectedBrand.description || "No description provided"}
                </p>
              </div>
              {selectedBrand.logoUrl && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Logo URL</p>
                    <p className="text-sm text-muted-foreground break-all">
                      {selectedBrand.logoUrl}
                    </p>
                  </div>
                </>
              )}
              {selectedBrand.websiteUrl && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Website URL
                    </p>
                    <p className="text-sm text-muted-foreground break-all">
                      {selectedBrand.websiteUrl}
                    </p>
                  </div>
                </>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Status</p>
                  <div className="flex gap-2">
                    <Badge
                      variant={selectedBrand.active ? "default" : "secondary"}
                    >
                      {selectedBrand.active ? "Active" : "Inactive"}
                    </Badge>
                    {selectedBrand.featured && (
                      <Badge
                        variant="outline"
                        className="text-amber-600 border-amber-600"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedBrand.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewBrandDialogOpen(false);
                    openEditBrandDialog(selectedBrand);
                  }}
                  className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
