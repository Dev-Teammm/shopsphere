"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  productService,
  ProductBasicInfo,
  ProductBasicInfoUpdate,
  ProductVariant,
  ProductVariantsResponse,
  ProductDetails,
  ProductDetailsUpdate,
  UnitOption,
} from "@/lib/services/product-service";
import { CategoryDropdown } from "@/components/products/CategoryDropdown";
import { UnitSelector } from "@/components/products/UnitSelector";
import { BrandDropdown } from "@/components/products/BrandDropdown";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  WarehouseSelectorWithBatches,
  WarehouseStockWithBatches,
} from "@/components/WarehouseSelectorWithBatches";
import { BatchManagement } from "@/components/BatchManagement";
import { VariantBatchManagement } from "@/components/VariantBatchManagement";
import { WarehouseStockWithBatches as WarehouseStockBatchDisplay } from "@/components/WarehouseStockWithBatches";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  X,
  Star,
  Eye,
  Edit,
  Package,
  Warehouse,
  DollarSign,
  Image as ImageIcon,
  Video,
  Settings,
  Layers,
  Globe,
  Tag,
  Ruler,
  Weight,
  Hash,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Loader2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import FetchAttributesDialog from "@/components/products/FetchAttributesDialog";

// Mock warehouse data
const mockWarehouses = [
  {
    warehouseId: "wh-001",
    warehouseName: "Main Distribution Center",
    location: "New York, NY",
    address: "123 Commerce St, New York, NY 10001",
    capacity: 10000,
    currentStock: 7500,
    active: true,
    manager: "John Smith",
    phone: "+250 788 458 261",
    email: "john.smith@warehouse.com",
  },
  {
    warehouseId: "wh-002",
    warehouseName: "West Coast Hub",
    location: "Los Angeles, CA",
    address: "456 Industrial Blvd, Los Angeles, CA 90210",
    capacity: 8000,
    currentStock: 6200,
    active: true,
    manager: "Sarah Johnson",
    phone: "+1 (555) 987-6543",
    email: "sarah.johnson@warehouse.com",
  },
  {
    warehouseId: "wh-003",
    warehouseName: "Midwest Storage",
    location: "Chicago, IL",
    address: "789 Storage Ave, Chicago, IL 60601",
    capacity: 6000,
    currentStock: 4800,
    active: true,
    manager: "Mike Davis",
    phone: "+1 (555) 456-7890",
    email: "mike.davis@warehouse.com",
  },
  {
    warehouseId: "wh-004",
    warehouseName: "Southern Depot",
    location: "Atlanta, GA",
    address: "321 Depot Rd, Atlanta, GA 30309",
    capacity: 5000,
    currentStock: 3200,
    active: true,
    manager: "Lisa Wilson",
    phone: "+1 (555) 321-0987",
    email: "lisa.wilson@warehouse.com",
  },
];

// Mock variant warehouse stock data
const mockVariantWarehouseStock = {
  "variant-1": [
    {
      warehouseId: "wh-001",
      stockQuantity: 150,
      stockThreshold: 50,
      lastUpdated: "2024-01-15",
    },
    {
      warehouseId: "wh-002",
      stockQuantity: 200,
      stockThreshold: 75,
      lastUpdated: "2024-01-14",
    },
    {
      warehouseId: "wh-003",
      stockQuantity: 100,
      stockThreshold: 40,
      lastUpdated: "2024-01-13",
    },
  ],
  "variant-2": [
    {
      warehouseId: "wh-001",
      stockQuantity: 80,
      stockThreshold: 30,
      lastUpdated: "2024-01-15",
    },
    {
      warehouseId: "wh-002",
      stockQuantity: 120,
      stockThreshold: 50,
      lastUpdated: "2024-01-14",
    },
    {
      warehouseId: "wh-004",
      stockQuantity: 60,
      stockThreshold: 25,
      lastUpdated: "2024-01-12",
    },
  ],
  "variant-3": [
    {
      warehouseId: "wh-001",
      stockQuantity: 90,
      stockThreshold: 35,
      lastUpdated: "2024-01-15",
    },
    {
      warehouseId: "wh-003",
      stockQuantity: 70,
      stockThreshold: 30,
      lastUpdated: "2024-01-13",
    },
    {
      warehouseId: "wh-004",
      stockQuantity: 45,
      stockThreshold: 20,
      lastUpdated: "2024-01-12",
    },
  ],
};

// Mock data for demonstration (Marketplace-focused)
const mockProduct = {
  productName: "Organic Tomatoes",
  shortDescription: "Fresh organic tomatoes from local farms",
  description:
    "Premium quality organic tomatoes grown using sustainable farming practices. Perfect for salads, cooking, and fresh consumption.",
  sku: "ORG-TOM-001",
  slug: "organic-tomatoes",
  price: 4.99,
  compareAtPrice: 5.99,
  costPrice: 2.5,
  stockQuantity: 150,
  categoryId: 1,
  brandId: 1,
  active: true,
  featured: true,
  bestseller: true,
  newArrival: true,
  onSale: false,
  weightKg: 1.0,
  organic: true,
  // Category-specific fields (product-level; harvest/expiry/grade/origin are on batches)
  storageInstructions:
    "Keep refrigerated at 4°C. Best consumed within 7 days of purchase.",
  nutritionalInfo: "Calories: 18 per 100g, Vitamin C: 14mg, Fiber: 1.2g",
  images: [
    {
      imageId: 1,
      url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&h=500&fit=crop",
      altText: "iPhone 17 Pro Front View",
      isPrimary: true,
      sortOrder: 0,
    },
    {
      imageId: 2,
      url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop",
      altText: "iPhone 17 Pro Back View",
      isPrimary: false,
      sortOrder: 1,
    },
  ],
  videos: [
    {
      videoId: 1,
      url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      altText: "iPhone 17 Pro Demo Video",
      sortOrder: 0,
    },
  ],
  variants: [
    {
      variantId: "var-1",
      variantSku: "IPH17PRO-128GB-BLK",
      variantName: "128GB Black",
      price: 1099.99,
      salePrice: 999.99,
      active: true,
      attributes: [
        { attributeValue: "128GB", attributeType: "Storage" },
        { attributeValue: "Black", attributeType: "Color" },
      ],
      images: [
        {
          imageId: 4,
          url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=300&fit=crop",
          altText: "iPhone 17 Pro 128GB Black",
          isPrimary: true,
        },
      ],
    },
  ],
  warehouses: [
    {
      warehouseId: 1,
      warehouseName: "Main Warehouse",
      location: "New York, NY",
      stockQuantity: 100,
      lowStockThreshold: 10,
      active: true,
    },
  ],
};

const mockCategories = [
  { id: 1, name: "Electronics", parentId: null },
  { id: 2, name: "Smartphones", parentId: 1 },
];

const mockBrands = [
  {
    id: 1,
    name: "Apple",
    logoUrl:
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=100&h=100&fit=crop",
  },
  {
    id: 2,
    name: "Samsung",
    logoUrl:
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=100&h=100&fit=crop",
  },
];

const productUpdateSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  compareAtPrice: z.coerce.number().min(0.01).optional(),
  costPrice: z.coerce.number().min(0.01).optional(),
  categoryId: z.coerce.number().min(1, "Category is required"),
  brandId: z.string().optional(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  bestseller: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  onSale: z.boolean().default(false),
  salePercentage: z.coerce.number().min(0).max(100).optional(),
  weightKg: z.coerce.number().min(0).optional(),
  unitId: z.number().optional().nullable(),
  organic: z.boolean().default(false),
  // Category-specific fields (product-level only; harvest/expiry/grade/origin are on batches)
  storageInstructions: z.string().optional(),
  nutritionalInfo: z.string().optional(),
  // Shipping and return fields
  shippingInfo: z.string().optional(),
  returnPolicy: z.string().optional(),
  maximumDaysForReturn: z.coerce.number().min(0).optional(),
  displayToCustomers: z.boolean().default(false),
});

type ProductUpdateForm = z.infer<typeof productUpdateSchema>;

interface ProductUpdateProps {
  params: Promise<{ id: string }>;
}

export default function ProductUpdate({ params }: ProductUpdateProps) {
  const [productId, setProductId] = useState<string>("");

  useEffect(() => {
    params.then((resolvedParams) => {
      setProductId(resolvedParams.id);
    });
  }, [params]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shopSlug");
  const { toast } = useToast();

  // State management
  const [product, setProduct] = useState<ProductBasicInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get("tab");
      if (
        tab &&
        [
          "basic",
          "pricing",
          "media",
          "variants",
          "inventory",
          "details",
        ].includes(tab)
      ) {
        return tab;
      }
    }
    return "basic";
  });
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [existingVideos, setExistingVideos] = useState<any[]>([]);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [variantsResponse, setVariantsResponse] =
    useState<ProductVariantsResponse | null>(null);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsPage, setVariantsPage] = useState(0);
  const [variantsSize] = useState(10);
  const [availableAttributeTypes, setAvailableAttributeTypes] = useState<
    string[]
  >(["Color", "Size", "Material", "Style", "Pattern", "Weight", "Dimensions"]);
  const [newAttributeType, setNewAttributeType] = useState("");
  const [newAttributeValues, setNewAttributeValues] = useState<string[]>([]);
  const [currentAttributeValue, setCurrentAttributeValue] = useState("");
  const [warehouses] = useState<any[]>(mockWarehouses);
  const [variantWarehouseStock, setVariantWarehouseStock] = useState<any>(
    mockVariantWarehouseStock,
  );
  const [currentWarehousePage, setCurrentWarehousePage] = useState<
    Record<string, number>
  >({});
  const [warehousePageSize] = useState(3);
  const [isWarehouseSelectorOpen, setIsWarehouseSelectorOpen] = useState(false);
  const [selectedVariantForWarehouse, setSelectedVariantForWarehouse] =
    useState<number | null>(null);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [
    variantWarehouseStocksWithBatches,
    setVariantWarehouseStocksWithBatches,
  ] = useState<WarehouseStockWithBatches[]>([]);
  const [editingVariants, setEditingVariants] = useState<
    Record<number, Partial<ProductVariant>>
  >({});
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [selectedVariantForAttributes, setSelectedVariantForAttributes] =
    useState<number | null>(null);
  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState(false);
  const [selectedVariantForImageUpload, setSelectedVariantForImageUpload] =
    useState<number | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isAddVariantDialogOpen, setIsAddVariantDialogOpen] = useState(false);
  const [expandedVariants, setExpandedVariants] = useState<Set<number>>(
    new Set(),
  );
  const [variantImages, setVariantImages] = useState<Record<number, any[]>>({});
  const [newVariant, setNewVariant] = useState({
    variantName: "",
    variantSku: "",
    price: 0,
    salePrice: null as number | null,
    costPrice: null as number | null,
    isActive: true,
    sortOrder: 0,
    discountId: null as string | null,
    attributes: [] as Array<{
      attributeTypeId: string;
      attributeValueId: string;
    }>,
    images: [] as File[],
  });
  const [attributeTypeName, setAttributeTypeName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(
    null,
  );
  const [isUnassignWarehouseDialogOpen, setIsUnassignWarehouseDialogOpen] =
    useState(false);
  const [warehouseToUnassign, setWarehouseToUnassign] = useState<{
    warehouseId: number;
    warehouseName: string;
  } | null>(null);
  const [productWarehouseStocks, setProductWarehouseStocks] = useState<any[]>(
    [],
  );
  const [
    productWarehouseStocksWithBatches,
    setProductWarehouseStocksWithBatches,
  ] = useState<WarehouseStockWithBatches[]>([]);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [productHasVariants, setProductHasVariants] = useState(false);
  const [productDetails, setProductDetails] = useState<{
    description?: string;
    storageInstructions?: string;
    nutritionalInfo?: string;
    [key: string]: any;
  }>({});
  const [initialProductDetails, setInitialProductDetails] = useState<{
    description?: string;
    storageInstructions?: string;
    nutritionalInfo?: string;
    [key: string]: any;
  }>({});
  const [hasProductDetailsChanges, setHasProductDetailsChanges] =
    useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] =
    useState(false);
  const [isDeleteVariantModalOpen, setIsDeleteVariantModalOpen] =
    useState(false);
  const [attributeValue, setAttributeValue] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pricingUnit, setPricingUnit] = useState<UnitOption | null>(null);
  const initialFormData = useRef<any>(null);

  // Form setup
  const form = useForm<ProductUpdateForm>({
    resolver: zodResolver(productUpdateSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      shortDescription: "",
      price: 0,
      compareAtPrice: 0,
      costPrice: 0,
      categoryId: undefined,
      brandId: "",
      active: true,
      featured: false,
      bestseller: false,
      newArrival: false,
      onSale: false,
      salePercentage: 0,
      weightKg: 0,
      unitId: undefined,
      organic: false,
      storageInstructions: "",
      nutritionalInfo: "",
    },
  });

  // Fetch product data when productId changes
  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId) return;

      try {
        setIsLoading(true);
        const productData = await productService.getProductBasicInfo(productId);
        setProduct(productData);

        const [images, videos] = await Promise.all([
          productService.getProductImages(productId),
          productService.getProductVideos(productId),
        ]);
        setExistingImages(images);
        setExistingVideos(videos);

        form.reset({
          name: productData.productName,
          description: productData.description || "",
          shortDescription: productData.shortDescription || "",
          price: productData.price,
          compareAtPrice: productData.compareAtPrice || 0,
          costPrice: productData.costPrice || 0,
          categoryId: productData.categoryId,
          brandId: productData.brandId || "",
          active: productData.active,
          featured: productData.featured,
          bestseller: productData.bestseller,
          newArrival: productData.newArrival,
          onSale: productData.onSale,
          salePercentage: productData.salePercentage || 0,
          organic: productData.organic ?? false,
        });

        // Set initial form data after loading product data
        initialFormData.current = {
          formData: form.getValues(),
          variants: [...variants],
          existingImages: [...images],
          existingVideos: [...videos],
          variantWarehouseStock: { ...variantWarehouseStock },
        };
      } catch (error) {
        console.error("Error fetching product data:", error);
        toast({
          title: "Error",
          description: "Failed to load product data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, [productId, form, toast]);

  // Check if product has variants for inventory management
  useEffect(() => {
    if (productId) {
      checkProductVariants();
    }
  }, [productId]);

  // Fetch product variants
  const fetchProductVariants = async (page: number = 0) => {
    if (!productId) return;

    try {
      setVariantsLoading(true);
      const response = await productService.getProductVariants(
        productId,
        page,
        variantsSize,
        "id",
        "asc",
      );
      setVariantsResponse(response);
      setProductVariants(response.content);
      setVariants(response.content); // Update variants state for inventory tab logic
      setVariantsPage(page);

      // Update initial form data to reflect the loaded variants
      if (initialFormData.current) {
        initialFormData.current = {
          ...initialFormData.current,
          variants: [...response.content],
        };
      }
    } catch (error) {
      console.error("Error fetching product variants:", error);
      toast({
        title: "Error",
        description: "Failed to load product variants",
        variant: "destructive",
      });
    } finally {
      setVariantsLoading(false);
    }
  };

  // Change detection and unsaved changes handling
  useEffect(() => {
    // Initial form data is now set after product data is loaded
    // No need to set it here anymore
  }, []);

  useEffect(() => {
    // Only check for changes if initial data has been set
    if (!initialFormData.current) {
      return;
    }

    // Check for changes in form data
    const currentFormData = form.getValues();
    const formChanged =
      JSON.stringify(currentFormData) !==
      JSON.stringify(initialFormData.current?.formData);

    // Check for changes in variants
    const variantsChanged =
      JSON.stringify(variants) !==
      JSON.stringify(initialFormData.current?.variants);

    // Check for changes in images
    const imagesChanged =
      JSON.stringify(existingImages) !==
      JSON.stringify(initialFormData.current?.existingImages);

    // Check for changes in videos
    const videosChanged =
      JSON.stringify(existingVideos) !==
      JSON.stringify(initialFormData.current?.existingVideos);

    // Check for changes in variant warehouse stock
    const warehouseStockChanged =
      JSON.stringify(variantWarehouseStock) !==
      JSON.stringify(initialFormData.current?.variantWarehouseStock);

    const hasChanges =
      formChanged ||
      variantsChanged ||
      imagesChanged ||
      videosChanged ||
      warehouseStockChanged;

    setHasUnsavedChanges(hasChanges);
  }, [
    form.watch(),
    variants,
    existingImages,
    existingVideos,
    variantWarehouseStock,
    initialFormData.current,
  ]);

  // Navigation protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        setIsUnsavedChangesModalOpen(true);
        setPendingAction(() => () => {
          window.history.pushState(null, "", window.location.href);
          window.history.back();
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges]);

  const handleSaveChanges = async () => {
    try {
      await form.handleSubmit(onSubmit)();

      // Update the initial form data to reflect the saved state
      initialFormData.current = {
        formData: form.getValues(),
        variants: [...variants],
        existingImages: [...existingImages],
        existingVideos: [...existingVideos],
        variantWarehouseStock: { ...variantWarehouseStock },
      };

      setHasUnsavedChanges(false);
      setIsUnsavedChangesModalOpen(false);

      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBasicInfo = async () => {
    try {
      setIsSubmitting(true);

      const currentFormData = form.getValues();
      const initialData = initialFormData.current.formData;

      // Detect changed fields
      const changedFields: Partial<ProductBasicInfoUpdate> = {};

      if (currentFormData.name !== initialData.name) {
        changedFields.productName = currentFormData.name;
      }
      if (currentFormData.shortDescription !== initialData.shortDescription) {
        changedFields.shortDescription = currentFormData.shortDescription;
      }
      if (currentFormData.description !== initialData.description) {
        changedFields.description = currentFormData.description;
      }
      if (currentFormData.price !== initialData.price) {
        changedFields.price = currentFormData.price;
      }
      if (currentFormData.compareAtPrice !== initialData.compareAtPrice) {
        changedFields.compareAtPrice = currentFormData.compareAtPrice;
      }
      if (currentFormData.costPrice !== initialData.costPrice) {
        changedFields.costPrice = currentFormData.costPrice;
      }
      if (currentFormData.categoryId !== initialData.categoryId) {
        changedFields.categoryId = currentFormData.categoryId;
      }
      if (currentFormData.brandId !== initialData.brandId) {
        changedFields.brandId = currentFormData.brandId;
      }
      if (currentFormData.active !== initialData.active) {
        changedFields.active = currentFormData.active;
      }
      if (currentFormData.featured !== initialData.featured) {
        changedFields.featured = currentFormData.featured;
      }
      if (currentFormData.bestseller !== initialData.bestseller) {
        changedFields.bestseller = currentFormData.bestseller;
      }
      if (currentFormData.newArrival !== initialData.newArrival) {
        changedFields.newArrival = currentFormData.newArrival;
      }
      if (currentFormData.onSale !== initialData.onSale) {
        changedFields.onSale = currentFormData.onSale;
      }
      if (currentFormData.salePercentage !== initialData.salePercentage) {
        changedFields.salePercentage = currentFormData.salePercentage;
      }
      if (currentFormData.organic !== initialData.organic) {
        changedFields.organic = currentFormData.organic;
      }

      // Only send request if there are changes
      if (Object.keys(changedFields).length === 0) {
        toast({
          title: "No Changes",
          description: "No changes detected to save",
          variant: "default",
        });
        return;
      }

      // Send update request
      const updatedProduct = await productService.updateProductBasicInfo(
        productId,
        changedFields as ProductBasicInfoUpdate,
      );

      // Update the product state with the response
      setProduct(updatedProduct);

      // Update the initial form data to reflect the saved state
      initialFormData.current = {
        ...initialFormData.current,
        formData: currentFormData,
      };
      setHasUnsavedChanges(false);

      toast({
        title: "Basic Info Updated",
        description: "Basic information has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating basic info:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update basic information",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardChanges = () => {
    initialFormData.current = {
      formData: form.getValues(),
      variants: [...variants],
      existingImages: [...existingImages],
      existingVideos: [...existingVideos],
      variantWarehouseStock: { ...variantWarehouseStock },
    };

    setHasUnsavedChanges(false);
    setIsUnsavedChangesModalOpen(false);

    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancelAction = () => {
    setIsUnsavedChangesModalOpen(false);
    setPendingAction(null);
  };

  // Tab switching protection
  const handleTabChange = async (newTab: string) => {
    if (hasUnsavedChanges) {
      setIsUnsavedChangesModalOpen(true);
      setPendingAction(() => () => {
        setActiveTab(newTab);
        updateUrlTab(newTab);
      });
      return;
    }

    // Load pricing data when switching to pricing tab
    if (newTab === "pricing") {
      try {
        const pricingData = await productService.getProductPricing(productId);
        // Update form with current pricing data
        form.setValue("price", pricingData.price);
        form.setValue("compareAtPrice", pricingData.compareAtPrice || 0);
        form.setValue("costPrice", pricingData.costPrice || 0);
        form.setValue("unitId", pricingData.unit?.id ?? undefined);

        // Update initial form data to reflect current pricing state
        const currentFormData = form.getValues();
        initialFormData.current = {
          ...initialFormData.current,
          formData: currentFormData,
        };
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("Error loading pricing data:", error);
        toast({
          title: "Error",
          description: "Failed to load pricing information",
          variant: "destructive",
        });
      }
    }

    if (newTab === "media") {
      // Media data is already loaded when component initializes
      // No need to reload here
    }

    // Load variants data when switching to variants tab
    if (newTab === "variants") {
      await fetchProductVariants();
    }

    setActiveTab(newTab);
    updateUrlTab(newTab);
  };

  const updateUrlTab = (tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    router.push(url.pathname + url.search, { scroll: false });
  };

  // Handle URL tab parameter changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (
      tab &&
      [
        "basic",
        "pricing",
        "media",
        "variants",
        "inventory",
        "details",
      ].includes(tab)
    ) {
      if (activeTab !== tab) {
        setActiveTab(tab);
      }
    } else if (!tab && activeTab !== "basic") {
      updateUrlTab(activeTab);
    }
  }, [searchParams, activeTab]);

  // Fetch variants on initial load if tab is "variants"
  useEffect(() => {
    if (
      productId &&
      activeTab === "variants" &&
      productVariants.length === 0 &&
      !variantsLoading
    ) {
      fetchProductVariants();
    }
  }, [productId, activeTab]);

  useEffect(() => {
    const hasChanges =
      JSON.stringify(productDetails) !== JSON.stringify(initialProductDetails);
    setHasProductDetailsChanges(hasChanges);
  }, [productDetails, initialProductDetails]);

  useEffect(() => {
    if (productId && activeTab === "details") {
      fetchProductDetails();
    }
  }, [productId, activeTab]);

  useEffect(() => {
    if (productId && activeTab === "inventory" && !productHasVariants) {
      fetchProductStockData();
    }
  }, [productId, activeTab, productHasVariants]);

  const removeImageById = async (imageId: number) => {
    try {
      // Find the image to check if it's a newly uploaded one (not yet saved to DB)
      const imageToRemove = existingImages.find(
        (img) => img.imageId === imageId,
      );

      // Check if this is a newly uploaded image (has a 'file' property)
      // Newly uploaded images are only in frontend state and haven't been saved to DB yet
      const isNewlyUploaded = imageToRemove && imageToRemove.file;

      if (isNewlyUploaded) {
        // For newly uploaded images, just remove from state without calling backend
        console.log(
          "Removing newly uploaded image (not yet saved to DB):",
          imageId,
        );
        setExistingImages((prev) =>
          prev.filter((img) => img.imageId !== imageId),
        );
        toast({
          title: "Image Removed",
          description: "Image has been removed from the product",
        });
      } else {
        // For existing images from DB, call backend API to delete
        console.log("Removing existing image from DB:", imageId);
        await productService.deleteProductImage(productId, imageId);
        setExistingImages((prev) =>
          prev.filter((img) => img.imageId !== imageId),
        );
        toast({
          title: "Image Removed",
          description: "Image has been removed from the product",
        });
      }
    } catch (error: any) {
      console.error("Error removing image:", error);

      // If it's a NOT_FOUND error and the image has a file property,
      // it means it was a newly uploaded image that we should just remove from state
      const imageToRemove = existingImages.find(
        (img) => img.imageId === imageId,
      );
      if (
        error.response?.data?.errorCode === "NOT_FOUND" &&
        imageToRemove?.file
      ) {
        console.log(
          "Image not found in DB but has file property, removing from state:",
          imageId,
        );
        setExistingImages((prev) =>
          prev.filter((img) => img.imageId !== imageId),
        );
        toast({
          title: "Image Removed",
          description: "Image has been removed from the product",
        });
        return;
      }

      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to remove image",
        variant: "destructive",
      });
    }
  };

  const removeVideoById = async (videoId: number) => {
    try {
      // Find the video to check if it's a newly uploaded one (not yet saved to DB)
      const videoToRemove = existingVideos.find(
        (video) => video.videoId === videoId,
      );

      // Check if this is a newly uploaded video (has a 'file' property)
      // Newly uploaded videos are only in frontend state and haven't been saved to DB yet
      const isNewlyUploaded = videoToRemove && videoToRemove.file;

      if (isNewlyUploaded) {
        // For newly uploaded videos, just remove from state without calling backend
        console.log(
          "Removing newly uploaded video (not yet saved to DB):",
          videoId,
        );
        setExistingVideos((prev) =>
          prev.filter((video) => video.videoId !== videoId),
        );
        toast({
          title: "Video Removed",
          description: "Video has been removed from the product",
        });
      } else {
        // For existing videos from DB, call backend API to delete
        console.log("Removing existing video from DB:", videoId);
        await productService.deleteProductVideo(productId, videoId);
        setExistingVideos((prev) =>
          prev.filter((video) => video.videoId !== videoId),
        );
        toast({
          title: "Video Removed",
          description: "Video has been removed from the product",
        });
      }
    } catch (error: any) {
      console.error("Error removing video:", error);

      // If it's a NOT_FOUND error and the video has a file property,
      // it means it was a newly uploaded video that we should just remove from state
      const videoToRemove = existingVideos.find(
        (video) => video.videoId === videoId,
      );
      if (
        error.response?.data?.errorCode === "NOT_FOUND" &&
        videoToRemove?.file
      ) {
        console.log(
          "Video not found in DB but has file property, removing from state:",
          videoId,
        );
        setExistingVideos((prev) =>
          prev.filter((video) => video.videoId !== videoId),
        );
        toast({
          title: "Video Removed",
          description: "Video has been removed from the product",
        });
        return;
      }

      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to remove video",
        variant: "destructive",
      });
    }
  };

  const setPrimaryImage = async (imageId: number) => {
    try {
      await productService.setPrimaryImage(productId, imageId);
      setExistingImages((prev) =>
        prev.map((img) => ({
          ...img,
          isPrimary: img.imageId === imageId,
        })),
      );
      toast({
        title: "Primary Image Set",
        description: "Main image has been updated",
      });
    } catch (error) {
      console.error("Error setting primary image:", error);
      toast({
        title: "Error",
        description: "Failed to set primary image",
        variant: "destructive",
      });
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset the input so the same file can be selected again if needed
    e.target.value = "";

    // Check total video limit
    if (existingVideos.length + files.length > 5) {
      toast({
        title: "Too Many Videos",
        description: `You can only upload up to 5 videos. Currently you have ${existingVideos.length} video(s).`,
        variant: "destructive",
      });
      return;
    }

    setIsVideoUploading(true);

    const validVideos: Array<{
      videoId: number;
      url: string;
      altText: string;
      sortOrder: number;
      file: File;
    }> = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        if (!file.type.startsWith("video/")) {
          errors.push(`"${file.name}" is not a valid video file`);
          continue;
        }

        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
          errors.push(
            `"${file.name}" is too large (${sizeMB}MB). Maximum size is 100MB or 15 seconds video`,
          );
          continue;
        }

        const duration = await getVideoDuration(file);
        if (duration > 15) {
          errors.push(
            `"${file.name}" is too long (${duration.toFixed(1)}s). Maximum duration is 15 seconds`,
          );
          continue;
        }

        const dataUrl = await readFileAsDataURL(file);
        validVideos.push({
          videoId: Math.floor(Date.now() + Math.random() * 1000),
          url: dataUrl,
          altText: file.name,
          sortOrder: existingVideos.length + validVideos.length,
          file: file,
        });
      } catch (error) {
        console.error(`Error processing video ${file.name}:`, error);
        errors.push(`"${file.name}" could not be processed. Please try again.`);
      }
    }

    setIsVideoUploading(false);

    if (validVideos.length > 0) {
      setExistingVideos((prev) => [...prev, ...validVideos]);
      toast({
        title: "Videos Added",
        description: `${validVideos.length} video(s) have been added successfully`,
      });
    }

    // Show errors if any
    if (errors.length > 0) {
      toast({
        title: "Video Validation Errors",
        description: (
          <div className="space-y-1">
            <p className="font-semibold">
              The following videos could not be added:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        ),
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  // Helper function to get video duration
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        reject(new Error("Failed to load video metadata"));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // Helper function to read file as data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsDataURL(file);
    });
  };

  // Variant management functions
  const addNewVariant = () => {
    const newVariant = {
      variantId: Date.now() + Math.random(),
      variantSku: `SKU-${Date.now()}`,
      variantName: "New Variant",
      price: 0,
      salePrice: null,
      active: true,
      attributes: [],
      images: [],
    };
    setVariants((prev) => [...prev, newVariant]);
    toast({
      title: "Variant Added",
      description: "New product variant has been created",
    });
  };

  const removeVariant = (variantId: number) => {
    setVariants((prev) =>
      prev.filter((variant) => variant.variantId !== variantId),
    );
    toast({
      title: "Variant Removed",
      description: "Product variant has been removed",
    });
  };

  const addAttributeToVariant = (
    variantId: number,
    attributeType: string,
    attributeValue: string,
  ) => {
    setVariants((prev) =>
      prev.map((variant) => {
        if (variant.variantId === variantId) {
          const newAttribute = { attributeType, attributeValue };
          return {
            ...variant,
            attributes: [...(variant.attributes || []), newAttribute],
          };
        }
        return variant;
      }),
    );
  };

  const removeAttributeFromVariant = (
    variantId: number,
    attributeIndex: number,
  ) => {
    setVariants((prev) =>
      prev.map((variant) => {
        if (variant.variantId === variantId) {
          return {
            ...variant,
            attributes:
              variant.attributes?.filter(
                (_: any, index: number) => index !== attributeIndex,
              ) || [],
          };
        }
        return variant;
      }),
    );
  };

  const addNewAttributeType = () => {
    if (newAttributeType.trim() && newAttributeValues.length > 0) {
      if (!availableAttributeTypes.includes(newAttributeType.trim())) {
        setAvailableAttributeTypes((prev) => [
          ...prev,
          newAttributeType.trim(),
        ]);
        toast({
          title: "Attribute Type Added",
          description: `New attribute type "${newAttributeType}" with ${newAttributeValues.length} values has been created`,
        });
      }
      // Reset form
      setNewAttributeType("");
      setNewAttributeValues([]);
      setCurrentAttributeValue("");
      setIsAttributeModalOpen(false);
    }
  };

  const addAttributeValue = () => {
    if (
      currentAttributeValue.trim() &&
      !newAttributeValues.includes(currentAttributeValue.trim())
    ) {
      setNewAttributeValues((prev) => [...prev, currentAttributeValue.trim()]);
      setCurrentAttributeValue("");
    }
  };

  const removeAttributeValue = (value: string) => {
    setNewAttributeValues((prev) => prev.filter((v) => v !== value));
  };

  const getAttributeValues = (type: string) => {
    const valueMap: Record<string, string[]> = {
      Color: [
        "Red",
        "green",
        "Green",
        "Black",
        "White",
        "Yellow",
        "Purple",
        "Orange",
        "Pink",
        "Gray",
      ],
      Size: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
      Material: [
        "Cotton",
        "Polyester",
        "Wool",
        "Silk",
        "Leather",
        "Denim",
        "Linen",
        "Cashmere",
      ],
      Style: [
        "Casual",
        "Formal",
        "Sport",
        "Vintage",
        "Modern",
        "Classic",
        "Trendy",
      ],
      Pattern: [
        "Solid",
        "Striped",
        "Polka Dot",
        "Floral",
        "Geometric",
        "Abstract",
        "Plaid",
      ],
      Weight: ["Light", "Medium", "Heavy", "Ultra Light", "Ultra Heavy"],
      Dimensions: ["Small", "Medium", "Large", "Extra Large", "Custom"],
    };
    return valueMap[type] || [];
  };

  const removeVariantImage = (variantId: number, imageId: number) => {
    setVariants((prev) =>
      prev.map((variant) => {
        if (variant.variantId === variantId) {
          return {
            ...variant,
            images: variant.images.filter(
              (img: any) => img.imageId !== imageId,
            ),
          };
        }
        return variant;
      }),
    );
  };

  // Warehouse management functions
  const getVariantWarehouseStock = (variantId: number) => {
    return variantWarehouseStock[`variant-${variantId}`] || [];
  };

  const updateVariantWarehouseStock = (
    variantId: number,
    warehouseId: string,
    field: string,
    value: number,
  ) => {
    setVariantWarehouseStock((prev: any) => {
      const variantKey = `variant-${variantId}`;
      const currentStock = prev[variantKey] || [];
      const updatedStock = currentStock.map((stock: any) =>
        stock.warehouseId === warehouseId
          ? {
              ...stock,
              [field]: value,
              lastUpdated: new Date().toISOString().split("T")[0],
            }
          : stock,
      );
      return {
        ...prev,
        [variantKey]: updatedStock,
      };
    });
    toast({
      title: "Stock Updated",
      description: `${field} has been updated for this warehouse`,
    });
  };

  const getWarehouseById = (warehouseId: string) => {
    return warehouses.find(
      (warehouse) => warehouse.warehouseId === warehouseId,
    );
  };

  const getWarehousePage = (variantId: number) => {
    return currentWarehousePage[variantId] || 0;
  };

  const setWarehousePage = (variantId: number, page: number) => {
    setCurrentWarehousePage((prev) => ({
      ...prev,
      [variantId]: page,
    }));
  };

  const getPaginatedWarehouseStock = (variantId: number) => {
    const stock = getVariantWarehouseStock(variantId);
    const page = getWarehousePage(variantId);
    const startIndex = page * warehousePageSize;
    const endIndex = startIndex + warehousePageSize;
    return stock.slice(startIndex, endIndex);
  };

  const getTotalWarehousePages = (variantId: number) => {
    const stock = getVariantWarehouseStock(variantId);
    return Math.ceil(stock.length / warehousePageSize);
  };

  const navigateToWarehouse = (warehouseId: string) => {
    // In a real app, this would navigate to the warehouse page
    toast({
      title: "Navigation",
      description: `Would navigate to warehouse ${warehouseId} page`,
    });
  };

  // Warehouse assignment functions
  const openWarehouseSelector = (variantId: number) => {
    setSelectedVariantForWarehouse(variantId);
    setIsWarehouseSelectorOpen(true);
  };

  const handleWarehouseAssignment = (warehouseStocks: any[]) => {
    if (selectedVariantForWarehouse === null) return;

    // Convert WarehouseStock format to our internal format
    const convertedStocks = warehouseStocks.map((stock) => ({
      warehouseId: `wh-${stock.warehouseId.toString().padStart(3, "0")}`, // Convert to our format
      stockQuantity: stock.stockQuantity,
      stockThreshold: stock.lowStockThreshold,
      lastUpdated: new Date().toISOString().split("T")[0],
    }));

    // Update the variant warehouse stock
    setVariantWarehouseStock((prev: any) => ({
      ...prev,
      [`variant-${selectedVariantForWarehouse}`]: convertedStocks,
    }));

    toast({
      title: "Warehouses Assigned",
      description: `${warehouseStocks.length} warehouse(s) have been assigned to this variant`,
    });

    // Close modal and reset state
    setIsWarehouseSelectorOpen(false);
    setSelectedVariantForWarehouse(null);
  };

  // Helper functions for variant editing
  const updateVariantField = (
    variantId: number,
    field: keyof ProductVariant,
    value: any,
  ) => {
    setEditingVariants((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [field]: value,
      },
    }));
  };

  const getVariantFieldValue = (
    variant: ProductVariant,
    field: keyof ProductVariant,
  ) => {
    const editing = editingVariants[variant.variantId];
    return editing && editing[field] !== undefined
      ? editing[field]
      : variant[field];
  };

  const toggleVariantStatus = (variantId: number, isActive: boolean) => {
    updateVariantField(variantId, "isActive", isActive);
    // TODO: Implement backend update
    console.log("Toggle variant status:", variantId, isActive);
  };

  const handleVariantImageUpload = (variantId: number) => {
    setSelectedVariantForImageUpload(variantId);
    setIsImageUploadModalOpen(true);
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsImageUploading(true);

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newImage = {
            imageId: Math.floor(Date.now() + Math.random() * 1000),
            url: event.target?.result as string,
            altText: file.name,
            isPrimary: false,
            sortOrder: existingImages.length,
            file: file,
          };
          setExistingImages((prev) => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      }
    });

    setTimeout(() => {
      setIsImageUploading(false);
      toast({
        title: "Images Added",
        description: `${files.length} image(s) have been added to the product`,
      });
    }, 1000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setImageFiles(files);
  };

  const uploadImages = async () => {
    if (!selectedVariantForImageUpload || imageFiles.length === 0) return;

    try {
      setIsImageUploading(true);

      const uploadedImages = await productService.uploadVariantImages(
        productId,
        selectedVariantForImageUpload,
        imageFiles,
      );

      setProductVariants((prev) =>
        prev.map((variant) =>
          variant.variantId === selectedVariantForImageUpload
            ? {
                ...variant,
                images: [...variant.images, ...uploadedImages],
              }
            : variant,
        ),
      );
      setVariants((prev) =>
        prev.map((variant) =>
          variant.variantId === selectedVariantForImageUpload
            ? {
                ...variant,
                images: [...variant.images, ...uploadedImages],
              }
            : variant,
        ),
      );

      toast({
        title: "Images Uploaded",
        description: `Successfully uploaded ${imageFiles.length} image${
          imageFiles.length !== 1 ? "s" : ""
        } for this variant`,
      });
    } catch (error) {
      console.error("Error uploading images:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImageUploading(false);
      setIsImageUploadModalOpen(false);
      setSelectedVariantForImageUpload(null);
      setImageFiles([]);
    }
  };

  const handleDeleteVariantImage = async (
    variantId: number,
    imageId: number,
  ) => {
    try {
      // Find the variant and image to check if it's a newly uploaded one
      const variant =
        productVariants.find((v) => v.variantId === variantId) ||
        variants.find((v) => v.variantId === variantId);
      const imageToRemove = variant?.images?.find(
        (img: any) => img.imageId === imageId,
      );

      // Check if this is a newly uploaded image (has a 'file' property)
      const isNewlyUploaded = imageToRemove && imageToRemove.file;

      if (isNewlyUploaded) {
        // For newly uploaded images, just remove from state without calling backend
        console.log(
          "Removing newly uploaded variant image (not yet saved to DB):",
          imageId,
        );
        setProductVariants((prev) =>
          prev.map((v) =>
            v.variantId === variantId
              ? {
                  ...v,
                  images: v.images.filter((img) => img.imageId !== imageId),
                }
              : v,
          ),
        );
        setVariants((prev) =>
          prev.map((v) =>
            v.variantId === variantId
              ? {
                  ...v,
                  images: v.images.filter(
                    (img: any) => img.imageId !== imageId,
                  ),
                }
              : v,
          ),
        );
        toast({
          title: "Image Removed",
          description: "Variant image has been removed",
        });
        return;
      }

      // For existing images from DB, call backend API to delete
      console.log("Removing existing variant image from DB:", imageId);
      await productService.deleteVariantImage(productId, variantId, imageId);

      setProductVariants((prev) =>
        prev.map((variant) =>
          variant.variantId === variantId
            ? {
                ...variant,
                images: variant.images.filter((img) => img.imageId !== imageId),
              }
            : variant,
        ),
      );
      setVariants((prev) =>
        prev.map((variant) =>
          variant.variantId === variantId
            ? {
                ...variant,
                images: variant.images.filter(
                  (img: any) => img.imageId !== imageId,
                ),
              }
            : variant,
        ),
      );

      toast({
        title: "Image Deleted",
        description: "Image has been successfully deleted",
      });
    } catch (error: any) {
      console.error("Error deleting variant image:", error);

      // If it's a NOT_FOUND error and the image has a file property,
      // it means it was a newly uploaded image that we should just remove from state
      const variant =
        productVariants.find((v) => v.variantId === variantId) ||
        variants.find((v) => v.variantId === variantId);
      const imageToRemove = variant?.images?.find(
        (img: any) => img.imageId === imageId,
      );

      if (
        error.response?.data?.errorCode === "NOT_FOUND" &&
        imageToRemove?.file
      ) {
        console.log(
          "Variant image not found in DB but has file property, removing from state:",
          imageId,
        );
        setProductVariants((prev) =>
          prev.map((v) =>
            v.variantId === variantId
              ? {
                  ...v,
                  images: v.images.filter((img) => img.imageId !== imageId),
                }
              : v,
          ),
        );
        setVariants((prev) =>
          prev.map((v) =>
            v.variantId === variantId
              ? {
                  ...v,
                  images: v.images.filter(
                    (img: any) => img.imageId !== imageId,
                  ),
                }
              : v,
          ),
        );
        toast({
          title: "Image Removed",
          description: "Variant image has been removed",
        });
        return;
      }

      toast({
        title: "Delete Failed",
        description:
          error.response?.data?.message ||
          "Failed to delete image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetPrimaryImage = async (variantId: number, imageId: number) => {
    try {
      await productService.setPrimaryVariantImage(
        productId,
        variantId,
        imageId,
      );

      setProductVariants((prev) =>
        prev.map((variant) =>
          variant.variantId === variantId
            ? {
                ...variant,
                images: variant.images.map((img: any) => ({
                  ...img,
                  isPrimary: img.imageId === imageId,
                })),
              }
            : variant,
        ),
      );
      setVariants((prev) =>
        prev.map((variant) =>
          variant.variantId === variantId
            ? {
                ...variant,
                images: variant.images.map((img: any) => ({
                  ...img,
                  isPrimary: img.imageId === imageId,
                })),
              }
            : variant,
        ),
      );

      toast({
        title: "Primary Image Set",
        description: "Primary image has been updated",
      });
    } catch (error) {
      console.error("Error setting primary image:", error);
      toast({
        title: "Update Failed",
        description: "Failed to set primary image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveVariant = async (variantId: number) => {
    try {
      const variant = productVariants.find((v) => v.variantId === variantId);
      if (!variant) return;

      const editedData = editingVariants[variantId];
      if (!editedData) {
        toast({
          title: "No Changes",
          description: "No changes to save for this variant",
        });
        return;
      }

      const updatedVariant = await productService.updateProductVariant(
        productId,
        variantId,
        editedData,
      );

      setProductVariants((prev) =>
        prev.map((v) => (v.variantId === variantId ? updatedVariant : v)),
      );
      setVariants((prev) =>
        prev.map((v) => (v.variantId === variantId ? updatedVariant : v)),
      );

      setEditingVariants((prev) => {
        const newState = { ...prev };
        delete newState[variantId];
        return newState;
      });

      toast({
        title: "Variant Saved",
        description: "Variant changes have been saved successfully",
      });
    } catch (error) {
      console.error("Error saving variant:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save variant changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    try {
      const variant = productVariants.find((v) => v.variantId === variantId);
      if (!variant) return;

      await productService.deleteVariant(productId, variantId);

      setProductVariants((prev) =>
        prev.filter((v) => v.variantId !== variantId),
      );
      setVariants((prev) => prev.filter((v) => v.variantId !== variantId));

      setEditingVariants((prev) => {
        const newState = { ...prev };
        delete newState[variantId];
        return newState;
      });

      setExpandedVariants((prev) => {
        const newSet = new Set(prev);
        newSet.delete(variantId);
        return newSet;
      });

      toast({
        title: "Variant Deleted",
        description:
          "Variant and all associated data have been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting variant:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete variant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchProductDetails = async () => {
    try {
      const details = await productService.getProductDetails(productId);
      setProductDetails(details);
      setInitialProductDetails(details);
    } catch (error) {
      console.error("Error fetching product details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch product details",
        variant: "destructive",
      });
    }
  };

  const fetchProductStockData = async () => {
    try {
      const stockData = await productService.getProductWarehouseStock(
        productId,
        0,
        100,
      );
      setProductWarehouseStocks(stockData.content);
    } catch (error) {
      console.error("Error fetching product stock data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch product stock data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProductDetails = async () => {
    try {
      setIsSubmitting(true);

      const updateData: ProductDetailsUpdate = {};

      if (productDetails.description !== initialProductDetails.description) {
        updateData.description = productDetails.description;
      }
      if (
        productDetails.storageInstructions !==
        initialProductDetails.storageInstructions
      ) {
        updateData.storageInstructions = productDetails.storageInstructions;
      }
      if (
        productDetails.nutritionalInfo !== initialProductDetails.nutritionalInfo
      ) {
        updateData.nutritionalInfo = productDetails.nutritionalInfo;
      }
      if (productDetails.weightKg !== initialProductDetails.weightKg) {
        updateData.weightKg = productDetails.weightKg;
      }
      if (productDetails.shippingInfo !== initialProductDetails.shippingInfo) {
        updateData.shippingInfo = productDetails.shippingInfo;
      }
      if (productDetails.returnPolicy !== initialProductDetails.returnPolicy) {
        updateData.returnPolicy = productDetails.returnPolicy;
      }
      if (
        productDetails.maximumDaysForReturn !==
        initialProductDetails.maximumDaysForReturn
      ) {
        updateData.maximumDaysForReturn = productDetails.maximumDaysForReturn;
      }
      if (
        productDetails.displayToCustomers !==
        initialProductDetails.displayToCustomers
      ) {
        updateData.displayToCustomers = productDetails.displayToCustomers;
      }

      const updatedDetails = await productService.updateProductDetails(
        productId,
        updateData,
      );
      setProductDetails(updatedDetails);
      setInitialProductDetails(updatedDetails);
      setHasProductDetailsChanges(false);

      toast({
        title: "Additional info Updated",
        description: "Product details have been updated successfully",
      });
    } catch (error) {
      console.error("Error updating product details:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update product details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkProductVariants = async () => {
    try {
      const response = await productService.checkProductHasVariants(productId);
      setProductHasVariants(response.hasVariants);
    } catch (error) {
      console.error("Error checking product variants:", error);
    }
  };

  const handleUnassignWarehouse = async (
    warehouseId: number,
    warehouseName: string,
  ) => {
    try {
      setIsSubmitting(true);

      await productService.unassignWarehouseFromProduct(productId, warehouseId);

      // Refresh stock data after unassignment
      await fetchProductStockData();

      toast({
        title: "Warehouse Unassigned",
        description: `Successfully unassigned warehouse "${warehouseName}" from this product. All associated batches have been handled safely.`,
      });
    } catch (error: any) {
      console.error("Error unassigning warehouse:", error);
      toast({
        title: "Unassignment Failed",
        description:
          error?.response?.data?.message ||
          "Failed to unassign warehouse. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInventory = async () => {
    await checkProductVariants();
    if (productHasVariants) {
      toast({
        title: "Cannot Add Stock",
        description:
          "This product has variants. Stock should be managed at the variant level.",
        variant: "destructive",
      });
      return;
    }
    setIsInventoryModalOpen(true);
  };

  const handleSaveProductInventory = async (
    warehouseStocks: WarehouseStockWithBatches[],
  ) => {
    try {
      setIsSubmitting(true);

      // Always use batch-based inventory management
      await productService.assignProductStockWithBatches(
        productId,
        warehouseStocks,
      );

      setProductWarehouseStocksWithBatches(warehouseStocks);
      setIsInventoryModalOpen(false);

      toast({
        title: "Inventory Updated",
        description: "Product inventory has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating product inventory:", error);
      toast({
        title: "Update Failed",
        description:
          error?.response?.data?.message ||
          "Failed to update product inventory. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveVariantAttribute = async (
    variantId: number,
    attributeValueId: number,
  ) => {
    try {
      await productService.removeVariantAttribute(
        productId,
        variantId,
        attributeValueId,
      );

      setProductVariants((prev) =>
        prev.map((variant) =>
          variant.variantId === variantId
            ? {
                ...variant,
                attributes:
                  variant.attributes?.filter(
                    (attr: any) => attr.attributeValueId !== attributeValueId,
                  ) || [],
              }
            : variant,
        ),
      );
      setVariants((prev) =>
        prev.map((variant) =>
          variant.variantId === variantId
            ? {
                ...variant,
                attributes:
                  variant.attributes?.filter(
                    (attr: any) => attr.attributeValueId !== attributeValueId,
                  ) || [],
              }
            : variant,
        ),
      );

      toast({
        title: "Attribute Removed",
        description: "Attribute has been successfully removed",
      });
    } catch (error) {
      console.error("Error removing attribute:", error);
      toast({
        title: "Remove Failed",
        description: "Failed to remove attribute. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddVariantAttributes = async (
    variantId: number,
    attributes: Array<{ attributeTypeName: string; attributeValue: string }>,
  ) => {
    try {
      const addedAttributes = await productService.addVariantAttributes(
        productId,
        variantId,
        attributes,
      );

      setProductVariants((prev) =>
        prev.map((variant) =>
          variant.variantId === variantId
            ? {
                ...variant,
                attributes: [...(variant.attributes || []), ...addedAttributes],
              }
            : variant,
        ),
      );
      setVariants((prev) =>
        prev.map((variant) =>
          variant.variantId === variantId
            ? {
                ...variant,
                attributes: [...(variant.attributes || []), ...addedAttributes],
              }
            : variant,
        ),
      );

      toast({
        title: "Attributes Added",
        description: `Successfully added ${addedAttributes.length} attribute${
          addedAttributes.length !== 1 ? "s" : ""
        }`,
      });
    } catch (error) {
      console.error("Error adding attributes:", error);
      toast({
        title: "Add Failed",
        description: "Failed to add attributes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddVariant = () => {
    const shopSlug = searchParams.get("shopSlug");
    const variantCreateUrl = shopSlug
      ? `/dashboard/products/${productId}/variants/create?shopSlug=${shopSlug}`
      : `/dashboard/products/${productId}/variants/create`;
    router.push(variantCreateUrl);
  };

  const toggleVariantExpansion = (variantId: number) => {
    setExpandedVariants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(variantId)) {
        newSet.delete(variantId);
      } else {
        newSet.clear(); // Close all others
        newSet.add(variantId); // Open this one
      }
      return newSet;
    });
  };

  const handleAttributesFromBackend = (
    attributes: Array<{ name: string; values: string[] }>,
  ) => {
    const formattedAttributes = attributes.flatMap((attr) =>
      attr.values.map((value) => ({
        attributeTypeId: attr.name,
        attributeValueId: value,
      })),
    );

    setNewVariant((prev) => ({
      ...prev,
      attributes: [...(prev.attributes || []), ...formattedAttributes],
    }));
  };

  const handleCancelAddVariant = () => {
    setIsAddVariantDialogOpen(false);
    setNewVariant({
      variantName: "",
      variantSku: "",
      price: 0,
      salePrice: null,
      costPrice: null,
      isActive: true,
      sortOrder: 0,
      discountId: null,
      attributes: [],
      images: [],
    });
  };

  const handleSaveNewVariant = async () => {
    console.log("Saving new variant:", newVariant);
    setIsAddVariantDialogOpen(false);
    setNewVariant({
      variantName: "",
      variantSku: "",
      price: 0,
      salePrice: null,
      costPrice: null,
      isActive: true,
      sortOrder: 0,
      discountId: null,
      attributes: [],
      images: [],
    });
  };

  const getVariantWarehouseStocks = (variantId: number): any[] => {
    const stocks = getVariantWarehouseStock(variantId);
    return stocks.map((stock: any) => ({
      warehouseId: parseInt(stock.warehouseId.replace("wh-", "")),
      warehouseName:
        getWarehouseById(stock.warehouseId)?.warehouseName ||
        "Unknown Warehouse",
      stockQuantity: stock.stockQuantity,
      lowStockThreshold: stock.stockThreshold,
    }));
  };

  // Warehouse removal function
  const removeWarehouseFromVariant = (
    variantId: number,
    warehouseId: string,
  ) => {
    setVariantWarehouseStock((prev: any) => {
      const variantKey = `variant-${variantId}`;
      const currentStock = prev[variantKey] || [];
      const updatedStock = currentStock.filter(
        (stock: any) => stock.warehouseId !== warehouseId,
      );
      return {
        ...prev,
        [variantKey]: updatedStock,
      };
    });

    const warehouse = getWarehouseById(warehouseId);
    toast({
      title: "Warehouse Removed",
      description: `${
        warehouse?.warehouseName || "Warehouse"
      } has been unassigned from this variant`,
    });
  };

  // Form submission
  const onSubmit = async (data: ProductUpdateForm) => {
    try {
      setIsSubmitting(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: "Product Updated",
        description: "Product has been updated successfully with mock data",
      });
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error updating product",
        description:
          "There was an error updating the product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="border-b border-border/40 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const backUrl = `/dashboard/products/${productId}${shopSlug ? `?shopSlug=${encodeURIComponent(shopSlug)}` : ""}`;
                router.push(backUrl);
              }}
              className="border-primary/20 hover:bg-primary/5 hover:text-primary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                Update Product
              </h1>
              <p className="text-muted-foreground">
                Modify additional information for:{" "}
                <strong>{product.productName}</strong>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const viewUrl = `/dashboard/products/${productId}${shopSlug ? `?shopSlug=${encodeURIComponent(shopSlug)}` : ""}`;
                if (hasUnsavedChanges) {
                  setIsUnsavedChangesModalOpen(true);
                  setPendingAction(() => () => router.push(viewUrl));
                } else {
                  router.push(viewUrl);
                }
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Product
            </Button>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-8 max-w-7xl mx-auto"
      >
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <div className="sticky top-0 z-10 bg-background border-b border-border/40 pb-2">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Media
              </TabsTrigger>
              <TabsTrigger value="variants" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Variants
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="flex items-center gap-2"
              >
                <Warehouse className="h-4 w-4" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Additional Info
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Essential product details and identification
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-full">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter product name"
                      {...form.register("name")}
                      className="border-primary/20 focus-visible:ring-primary mt-2"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-full">
                    <Label htmlFor="shortDescription">Short Description</Label>
                    <Textarea
                      id="shortDescription"
                      placeholder="Brief product description"
                      {...form.register("shortDescription")}
                      className="min-h-[80px] border-primary/20 focus-visible:ring-primary mt-2"
                      rows={3}
                    />
                  </div>

                  <div className="col-span-full">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed product description"
                      {...form.register("description")}
                      className="min-h-[120px] border-primary/20 focus-visible:ring-primary mt-2"
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categorization */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Categorization
                </CardTitle>
                <CardDescription>
                  Organize your product with categories and brands
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <CategoryDropdown
                      value={form.watch("categoryId")}
                      onValueChange={(value) =>
                        form.setValue("categoryId", value)
                      }
                      placeholder="Select Category"
                      label="Category *"
                      required={true}
                      error={form.formState.errors.categoryId?.message}
                    />
                  </div>

                  <div>
                    <BrandDropdown
                      value={form.watch("brandId")}
                      onValueChange={(value) => form.setValue("brandId", value)}
                      placeholder="Select Brand"
                      label="Brand"
                      required={false}
                      error={form.formState.errors.brandId?.message}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Status */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Product Status
                </CardTitle>
                <CardDescription>
                  Control product visibility and special flags
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      {...form.register("active")}
                      checked={form.watch("active")}
                      onCheckedChange={(checked) =>
                        form.setValue("active", checked)
                      }
                    />
                    <Label htmlFor="active" className="text-sm cursor-pointer">
                      Active Product
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      {...form.register("featured")}
                      checked={form.watch("featured")}
                      onCheckedChange={(checked) =>
                        form.setValue("featured", checked)
                      }
                    />
                    <Label
                      htmlFor="featured"
                      className="text-sm cursor-pointer"
                    >
                      Featured Product
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="bestseller"
                      {...form.register("bestseller")}
                      checked={form.watch("bestseller")}
                      onCheckedChange={(checked) =>
                        form.setValue("bestseller", checked)
                      }
                    />
                    <Label
                      htmlFor="bestseller"
                      className="text-sm cursor-pointer"
                    >
                      Bestseller
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="newArrival"
                      {...form.register("newArrival")}
                      checked={form.watch("newArrival")}
                      onCheckedChange={(checked) =>
                        form.setValue("newArrival", checked)
                      }
                    />
                    <Label
                      htmlFor="newArrival"
                      className="text-sm cursor-pointer"
                    >
                      New Arrival
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="onSale"
                      {...form.register("onSale")}
                      checked={form.watch("onSale")}
                      onCheckedChange={(checked) =>
                        form.setValue("onSale", checked)
                      }
                    />
                    <Label htmlFor="onSale" className="text-sm cursor-pointer">
                      On Sale
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="organic"
                      {...form.register("organic")}
                      checked={form.watch("organic")}
                      onCheckedChange={(checked) =>
                        form.setValue("organic", checked)
                      }
                    />
                    <Label htmlFor="organic" className="text-sm cursor-pointer">
                      Organic
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info Save Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSaveBasicInfo}
                disabled={!hasUnsavedChanges || isSubmitting}
                className="bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Basic Info
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing Information
                </CardTitle>
                <CardDescription>
                  Set product pricing and cost information
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="price">Price *</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex text-muted-foreground hover:text-foreground"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            The selling price per unit (e.g. per kg or per
                            piece). Shown to customers.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("price")}
                      className="border-primary/20 focus-visible:ring-primary mt-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="compareAtPrice">Compare At Price</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex text-muted-foreground hover:text-foreground"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            Original price before discount. Shown crossed out
                            next to the current price to show savings.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="compareAtPrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("compareAtPrice")}
                      className="border-primary/20 focus-visible:ring-primary mt-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="costPrice">Cost Price</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex text-muted-foreground hover:text-foreground"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            Your cost per unit. Used for profit calculation
                            only; not shown to customers.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("costPrice")}
                      className="border-primary/20 focus-visible:ring-primary mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Unit of measure</Label>
                  <UnitSelector
                    value={form.watch("unitId") ?? undefined}
                    selectedUnit={pricingUnit}
                    onChange={(unitId, unit) => {
                      form.setValue("unitId", unitId ?? undefined, {
                        shouldDirty: true,
                      });
                      setPricingUnit(unit);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Select unit (e.g. kg, pc)"
                  />
                  <p className="text-xs text-muted-foreground">
                    How this product is sold (e.g. per kilogram, per piece).
                    Price above is per one unit.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Save Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={async () => {
                  try {
                    setIsSubmitting(true);
                    const currentFormData = form.getValues();

                    // Prepare pricing update data
                    const pricingUpdateData: any = {};

                    // Only include fields that have values
                    if (
                      currentFormData.price !== undefined &&
                      currentFormData.price !== null
                    ) {
                      pricingUpdateData.price = currentFormData.price;
                    }
                    if (
                      currentFormData.compareAtPrice !== undefined &&
                      currentFormData.compareAtPrice !== null
                    ) {
                      pricingUpdateData.compareAtPrice =
                        currentFormData.compareAtPrice;
                    }
                    if (
                      currentFormData.costPrice !== undefined &&
                      currentFormData.costPrice !== null
                    ) {
                      pricingUpdateData.costPrice = currentFormData.costPrice;
                    }
                    if (currentFormData.unitId !== undefined) {
                      pricingUpdateData.unitId = currentFormData.unitId ?? null;
                    }

                    // Call the API to update pricing
                    await productService.updateProductPricing(
                      productId,
                      pricingUpdateData,
                    );

                    // Update the initial form data to reflect the saved state
                    initialFormData.current = {
                      ...initialFormData.current,
                      formData: currentFormData,
                    };
                    setHasUnsavedChanges(false);

                    toast({
                      title: "Pricing Saved",
                      description:
                        "Pricing information has been saved successfully",
                    });
                  } catch (error) {
                    console.error("Error saving pricing:", error);
                    toast({
                      title: "Error",
                      description:
                        "Failed to save pricing information. Please try again.",
                      variant: "destructive",
                    });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={!hasUnsavedChanges || isSubmitting}
                className="bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Pricing
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-6">
            {/* Product Images */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Product Images
                </CardTitle>
                <CardDescription>
                  Manage product images and set the main image
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">
                      Current Images
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-2">
                      {existingImages.map((image) => (
                        <div key={image.imageId} className="relative group">
                          <div
                            className={`aspect-square w-full h-24 overflow-hidden bg-muted rounded-lg border ${
                              image.isPrimary
                                ? "border-primary border-2"
                                : "border-border/40"
                            }`}
                          >
                            <img
                              src={image.url}
                              alt={image.altText || "Product image"}
                              className="w-full h-full object-contain p-1"
                            />
                          </div>
                          <div className="absolute -top-2 -right-2 flex space-x-1">
                            {!image.isPrimary && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-6 w-6 rounded-full opacity-90 hover:opacity-100 shadow-sm bg-gray-200"
                                onClick={() => setPrimaryImage(image.imageId)}
                              >
                                <Star className="w-3 h-3 text-gray-500" />
                              </Button>
                            )}
                            {image.isPrimary && (
                              <div className="h-6 w-6 rounded-full flex items-center justify-center bg-yellow-500 text-white shadow-sm">
                                <Star className="w-3 h-3 fill-current text-yellow-100" />
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-6 w-6 rounded-full opacity-90 hover:opacity-100 shadow-sm"
                              onClick={() => removeImageById(image.imageId)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          {image.isPrimary && (
                            <div className="absolute bottom-0 left-0 right-0 bg-primary text-white text-xs text-center py-0.5">
                              Main Image
                            </div>
                          )}
                          <div className="absolute top-0 left-0 bg-black/50 text-white text-xs p-1 rounded-br-md">
                            {image.file
                              ? `${(image.file.size / 1024 / 1024).toFixed(
                                  1,
                                )}MB`
                              : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Upload Area */}
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition">
                    <div className="flex flex-col items-center justify-center pt-4 pb-4">
                      <Upload className="w-8 h-8 mb-2 text-primary" />
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">
                          Click to upload images
                        </span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, JPEG (MAX. 10 files)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isImageUploading
                          ? "Uploading..."
                          : `${existingImages.length}/10 images used`}
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleProductImageUpload}
                      className="hidden"
                      disabled={isImageUploading || existingImages.length >= 10}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Product Videos */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Product Videos
                </CardTitle>
                <CardDescription>Manage product videos</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Existing Videos */}
                {existingVideos.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">
                      Current Videos
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {existingVideos.map((video) => (
                        <div key={video.videoId} className="relative group">
                          <div className="aspect-video w-full bg-muted rounded-lg border border-border/40 overflow-hidden">
                            <video
                              src={video.url}
                              className="w-full h-full object-cover"
                              controls
                              preload="metadata"
                            />
                          </div>
                          <div className="absolute -top-2 -right-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-6 w-6 rounded-full opacity-90 hover:opacity-100 shadow-sm"
                              onClick={() => removeVideoById(video.videoId)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                            {video.altText}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video Upload Area */}
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition">
                    <div className="flex flex-col items-center justify-center pt-4 pb-4">
                      <Video className="w-8 h-8 mb-2 text-primary" />
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">
                          Click to upload videos
                        </span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        MP4, MOV, AVI (MAX. 5 files)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isVideoUploading
                          ? "Uploading..."
                          : `${existingVideos.length}/5 videos used`}
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                      disabled={isVideoUploading || existingVideos.length >= 5}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Media Save Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={async () => {
                  try {
                    setIsSubmitting(true);

                    const newImages = existingImages.filter((img) => img.file);
                    const newVideos = existingVideos.filter(
                      (video) => video.file,
                    );

                    if (newImages.length > 0) {
                      const imageFiles = newImages.map((img) => img.file!);
                      const uploadedImages =
                        await productService.uploadProductImages(
                          productId,
                          imageFiles,
                        );

                      setExistingImages((prev) => [
                        ...prev.filter((img) => !img.file),
                        ...uploadedImages,
                      ]);
                    }

                    if (newVideos.length > 0) {
                      const videoFiles = newVideos.map((video) => video.file!);
                      const uploadedVideos =
                        await productService.uploadProductVideos(
                          productId,
                          videoFiles,
                        );

                      setExistingVideos((prev) => [
                        ...prev.filter((video) => !video.file),
                        ...uploadedVideos,
                      ]);
                    }

                    initialFormData.current = {
                      ...initialFormData.current,
                      existingImages: [...existingImages],
                      existingVideos: [...existingVideos],
                    };
                    setHasUnsavedChanges(false);

                    toast({
                      title: "Media Saved",
                      description:
                        "Media files have been uploaded and saved successfully",
                    });
                  } catch (error) {
                    console.error("Error saving media:", error);
                    toast({
                      title: "Error",
                      description:
                        "Failed to save media files. Please try again.",
                      variant: "destructive",
                    });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={!hasUnsavedChanges || isSubmitting}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Media
              </Button>
            </div>
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants" className="space-y-6">
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Product Variants
                    </CardTitle>
                    <CardDescription>
                      Manage all product variants with their attributes,
                      pricing, images, and stock
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddVariant}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variant
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {variantsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">
                      Loading variants...
                    </span>
                  </div>
                ) : productVariants.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex items-center justify-center mb-6">
                      <div className="p-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/5">
                        <Layers className="w-12 h-12 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      No Variants Found
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      This product doesn't have any variants yet. Create
                      variants to offer different options like size, grade, or
                      origin.
                    </p>
                    <Button
                      type="button"
                      onClick={handleAddVariant}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Variant
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Variants List */}
                    <div className="space-y-6">
                      {productVariants.map((variant, index) => {
                        const isExpanded = expandedVariants.has(
                          variant.variantId,
                        );
                        return (
                          <Card
                            key={variant.variantId}
                            className="border-border/30 shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            <CardHeader
                              className="pb-4 cursor-pointer hover:bg-muted/30 transition-colors"
                              onClick={() =>
                                toggleVariantExpansion(variant.variantId)
                              }
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <Badge
                                      variant="outline"
                                      className="text-xs font-mono"
                                    >
                                      #{variant.variantId}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={
                                          getVariantFieldValue(
                                            variant,
                                            "isActive",
                                          ) as boolean
                                        }
                                        onCheckedChange={(checked) => {
                                          toggleVariantStatus(
                                            variant.variantId,
                                            checked,
                                          );
                                        }}
                                        className="data-[state=checked]:bg-primary"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <Label className="text-sm font-medium">
                                        {variant.isActive
                                          ? "Active"
                                          : "Inactive"}
                                      </Label>
                                    </div>
                                    {variant.isInStock && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs text-primary border-primary/20"
                                      >
                                        In Stock
                                      </Badge>
                                    )}
                                    {variant.isLowStock && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs text-yellow-600 border-yellow-200"
                                      >
                                        Low Stock
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <div className="text-sm text-muted-foreground">
                                      {variant.variantName || "Unnamed Variant"}
                                    </div>
                                    {/* Display variant attributes */}
                                    {variant.attributes &&
                                      variant.attributes.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                          {variant.attributes.map(
                                            (attr, idx) => (
                                              <Badge
                                                key={
                                                  attr.attributeValueId || idx
                                                }
                                                variant="secondary"
                                                className="text-xs font-normal"
                                              >
                                                {attr.attributeType}:{" "}
                                                {attr.attributeValue}
                                              </Badge>
                                            ),
                                          )}
                                        </div>
                                      )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveVariant(variant.variantId);
                                    }}
                                    className="text-primary hover:bg-primary/10"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedVariantForWarehouse(
                                        variant.variantId,
                                      );
                                      setIsWarehouseModalOpen(true);
                                      const currentStocks =
                                        getVariantWarehouseStocks(
                                          variant.variantId,
                                        );
                                      // setVariantWarehouseStocks(currentStocks); // Removed - using batch version
                                    }}
                                    className="text-primary hover:bg-primary/10"
                                  >
                                    <Warehouse className="w-4 h-4 mr-2" />
                                    Stock
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsDeleteVariantModalOpen(true);
                                      setVariantToDelete(variant);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>

                            {/* Collapsible Content */}
                            <div
                              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                isExpanded
                                  ? "max-h-[2000px] opacity-100"
                                  : "max-h-0 opacity-0"
                              }`}
                            >
                              <CardContent className="pt-0 pb-6">
                                {/* Variant Basic Info - Editable */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                  {/* Basic Information */}
                                  <div className="space-y-4">
                                    <h5 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                      Basic Information
                                    </h5>
                                    <div className="space-y-3">
                                      <div>
                                        <Label
                                          htmlFor={`variant-name-${variant.variantId}`}
                                          className="text-xs font-medium"
                                        >
                                          Variant Name
                                        </Label>
                                        <Input
                                          id={`variant-name-${variant.variantId}`}
                                          value={
                                            getVariantFieldValue(
                                              variant,
                                              "variantName",
                                            ) as string
                                          }
                                          onChange={(e) => {
                                            updateVariantField(
                                              variant.variantId,
                                              "variantName",
                                              e.target.value,
                                            );
                                          }}
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <Label
                                          htmlFor={`variant-sku-${variant.variantId}`}
                                          className="text-xs font-medium"
                                        >
                                          SKU
                                        </Label>
                                        <Input
                                          id={`variant-sku-${variant.variantId}`}
                                          value={
                                            getVariantFieldValue(
                                              variant,
                                              "variantSku",
                                            ) as string
                                          }
                                          onChange={(e) => {
                                            updateVariantField(
                                              variant.variantId,
                                              "variantSku",
                                              e.target.value,
                                            );
                                          }}
                                          className="h-8 text-sm font-mono"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Pricing Information */}
                                  <div className="space-y-4">
                                    <h5 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                      Pricing
                                    </h5>
                                    <div className="space-y-3">
                                      <div>
                                        <Label
                                          htmlFor={`variant-price-${variant.variantId}`}
                                          className="text-xs font-medium"
                                        >
                                          Price
                                        </Label>
                                        <Input
                                          id={`variant-price-${variant.variantId}`}
                                          type="number"
                                          step="0.01"
                                          value={
                                            getVariantFieldValue(
                                              variant,
                                              "price",
                                            ) as number
                                          }
                                          onChange={(e) => {
                                            updateVariantField(
                                              variant.variantId,
                                              "price",
                                              parseFloat(e.target.value) || 0,
                                            );
                                          }}
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <Label
                                          htmlFor={`variant-sale-price-${variant.variantId}`}
                                          className="text-xs font-medium"
                                        >
                                          Sale Price
                                        </Label>
                                        <Input
                                          id={`variant-sale-price-${variant.variantId}`}
                                          type="number"
                                          step="0.01"
                                          value={
                                            (getVariantFieldValue(
                                              variant,
                                              "salePrice",
                                            ) as number) || ""
                                          }
                                          onChange={(e) => {
                                            updateVariantField(
                                              variant.variantId,
                                              "salePrice",
                                              parseFloat(e.target.value) ||
                                                null,
                                            );
                                          }}
                                          className="h-8 text-sm"
                                          placeholder="Enter sale price"
                                        />
                                      </div>
                                      <div>
                                        <Label
                                          htmlFor={`variant-cost-price-${variant.variantId}`}
                                          className="text-xs font-medium"
                                        >
                                          Cost Price
                                        </Label>
                                        <Input
                                          id={`variant-cost-price-${variant.variantId}`}
                                          type="number"
                                          step="0.01"
                                          value={
                                            (getVariantFieldValue(
                                              variant,
                                              "costPrice",
                                            ) as number) || ""
                                          }
                                          onChange={(e) => {
                                            updateVariantField(
                                              variant.variantId,
                                              "costPrice",
                                              parseFloat(e.target.value) ||
                                                null,
                                            );
                                          }}
                                          className="h-8 text-sm"
                                          placeholder="Enter cost price"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Images and Attributes Section */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Variant Images */}
                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <h5 className="font-medium flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        Images ({variant.images.length})
                                      </h5>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleVariantImageUpload(
                                            variant.variantId,
                                          )
                                        }
                                      >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Image
                                      </Button>
                                    </div>
                                    {variant.images.length > 0 ? (
                                      <div className="grid grid-cols-3 gap-2">
                                        {variant.images.map((image) => (
                                          <div
                                            key={image.imageId}
                                            className="relative group"
                                          >
                                            <img
                                              src={image.url}
                                              alt={
                                                image.altText ||
                                                variant.variantName
                                              }
                                              className="w-full h-20 object-cover rounded-lg border"
                                            />
                                            {image.isPrimary && (
                                              <div className="absolute top-1 right-1">
                                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                              </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                                              <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => {
                                                  handleSetPrimaryImage(
                                                    variant.variantId,
                                                    image.imageId,
                                                  );
                                                }}
                                              >
                                                <Star className="w-3 h-3 mr-1" />
                                                Primary
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => {
                                                  handleDeleteVariantImage(
                                                    variant.variantId,
                                                    image.imageId,
                                                  );
                                                }}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-md">
                                        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No images</p>
                                        <p className="text-xs">
                                          Click "Add Image" to upload
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Variant Attributes */}
                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <h5 className="font-medium flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Attributes (
                                        {variant.attributes?.length || 0})
                                      </h5>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedVariantForAttributes(
                                            variant.variantId,
                                          );
                                          setIsAttributeModalOpen(true);
                                        }}
                                      >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Manage
                                      </Button>
                                    </div>
                                    {variant.attributes &&
                                    variant.attributes.length > 0 ? (
                                      <div className="space-y-2">
                                        {variant.attributes.map((attr) => (
                                          <div
                                            key={attr.attributeValueId}
                                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                                          >
                                            <div className="flex-1">
                                              <span className="font-medium text-sm">
                                                {attr.attributeType}
                                              </span>
                                              <span className="text-muted-foreground text-sm ml-2">
                                                {attr.attributeValue}
                                              </span>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                              onClick={() => {
                                                handleRemoveVariantAttribute(
                                                  variant.variantId,
                                                  attr.attributeValueId,
                                                );
                                              }}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-md">
                                        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No attributes</p>
                                        <p className="text-xs">
                                          Click "Manage" to add attributes
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Stock & Batch Information */}
                                <div className="mt-6 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                      Stock & Batch Information
                                    </h5>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedVariantForWarehouse(
                                          variant.variantId,
                                        );
                                        setIsWarehouseModalOpen(true);
                                        const currentStocks =
                                          getVariantWarehouseStocks(
                                            variant.variantId,
                                          );
                                        // setVariantWarehouseStocks(currentStocks); // Removed - using batch version
                                      }}
                                      className="text-primary hover:bg-primary/10"
                                    >
                                      <Warehouse className="w-4 h-4 mr-2" />
                                      Manage Stock
                                    </Button>
                                  </div>

                                  {variant.warehouseStocks &&
                                  variant.warehouseStocks.length > 0 ? (
                                    <WarehouseStockBatchDisplay
                                      variantId={variant.variantId}
                                      variantName={
                                        variant.variantName || "Unnamed Variant"
                                      }
                                      warehouseStocks={variant.warehouseStocks}
                                    />
                                  ) : (
                                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-md">
                                      <Warehouse className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm mb-2">
                                        No stock assigned to warehouses
                                      </p>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedVariantForWarehouse(
                                            variant.variantId,
                                          );
                                          setIsWarehouseModalOpen(true);
                                          const currentStocks =
                                            getVariantWarehouseStocks(
                                              variant.variantId,
                                            );
                                          // setVariantWarehouseStocks(currentStocks); // Removed - using batch version
                                        }}
                                        className="text-primary hover:bg-primary/10"
                                      >
                                        <Warehouse className="w-4 h-4 mr-2" />
                                        Assign to Warehouses
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {/* Additional Info */}
                                <div className="mt-6 pt-4 border-t">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">
                                        Created:
                                      </span>
                                      <div className="font-medium">
                                        {new Date(
                                          variant.createdAt,
                                        ).toLocaleDateString()}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">
                                        Updated:
                                      </span>
                                      <div className="font-medium">
                                        {new Date(
                                          variant.updatedAt,
                                        ).toLocaleDateString()}
                                      </div>
                                    </div>
                                    {variant.discount && (
                                      <div>
                                        <span className="text-muted-foreground">
                                          Discount:
                                        </span>
                                        <div className="font-medium text-primary">
                                          {variant.discount.percentage}% off
                                        </div>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-muted-foreground">
                                        Status:
                                      </span>
                                      <div className="font-medium">
                                        {variant.isActive
                                          ? "Active"
                                          : "Inactive"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </div>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {variantsResponse && variantsResponse.totalPages > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {variantsResponse.content.length} of{" "}
                          {variantsResponse.totalElements} variants
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!variantsResponse.hasPrevious}
                            onClick={() =>
                              fetchProductVariants(variantsPage - 1)
                            }
                          >
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {variantsPage + 1} of{" "}
                            {variantsResponse.totalPages}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!variantsResponse.hasNext}
                            onClick={() =>
                              fetchProductVariants(variantsPage + 1)
                            }
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            {variants.length > 0 ? (
              // Product has variants - show message directing to variants tab
              <Card className="border-border/40 shadow-sm">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5" />
                    Inventory Management
                  </CardTitle>
                  <CardDescription>
                    This product has variants. Stock and warehouse management is
                    handled at the variant level.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-4 rounded-full bg-primary/10">
                        <Layers className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      Variants-Based Inventory
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Since this product has variants, inventory management is
                      handled at the variant level. Each variant can have
                      different stock levels across different warehouses.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {variants.length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Active Variants
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Scroll to variants tab
                        const variantsTab = document.querySelector(
                          '[value="variants"]',
                        ) as HTMLElement;
                        if (variantsTab) {
                          variantsTab.click();
                        }
                      }}
                      className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                    >
                      <Layers className="w-4 h-4 mr-2" />
                      Manage Variant Inventory
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Product has no variants - show direct inventory management
              <Card className="border-border/40 shadow-sm">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5" />
                    Direct Inventory Management
                  </CardTitle>
                  <CardDescription>
                    Manage stock levels across different warehouses for this
                    product.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {productWarehouseStocks.length > 0 ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">
                            Warehouse Inventory
                          </h3>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddInventory}
                            className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add More Warehouses
                          </Button>
                        </div>

                        {productWarehouseStocks.map((stock, index) => (
                          <div key={index} className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-border/40 rounded-md bg-muted/20">
                              <div>
                                <h4 className="font-medium text-lg">
                                  {stock.warehouseName}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Total Stock: {stock.stockQuantity} units
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Low Stock Threshold: {stock.lowStockThreshold}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setWarehouseToUnassign({
                                    warehouseId: stock.warehouseId,
                                    warehouseName: stock.warehouseName,
                                  });
                                  setIsUnassignWarehouseDialogOpen(true);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            <BatchManagement
                              stockId={stock.stockId}
                              warehouseName={stock.warehouseName}
                              productName={form.getValues("name") || "Product"}
                              onBatchUpdate={fetchProductStockData}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="flex items-center justify-center mb-4">
                          <div className="p-4 rounded-full bg-muted/20">
                            <Package className="w-8 h-8 text-muted-foreground" />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          No Inventory Data
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          This product doesn't have any inventory data yet. Add
                          stock levels for different warehouses to get started.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddInventory}
                          className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Inventory
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Product Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Additional Information & SEO
                </CardTitle>
                <CardDescription>
                  Configure detailed product information, SEO settings, and
                  policies
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-8">
                  {/* Product Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">
                        Product Information
                      </h3>
                    </div>
                    <div>
                      <Label htmlFor="description">Product Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter detailed product description"
                        value={productDetails.description || ""}
                        onChange={(e) =>
                          setProductDetails((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="border-primary/20 focus-visible:ring-primary mt-2"
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="weightKg">Weight (kg)</Label>
                      <Input
                        id="weightKg"
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={productDetails.weightKg ?? ""}
                        onChange={(e) =>
                          setProductDetails((prev) => ({
                            ...prev,
                            weightKg: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="border-primary/20 focus-visible:ring-primary mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="storageInstructions">
                        Storage Instructions
                      </Label>
                      <Textarea
                        id="storageInstructions"
                        placeholder="e.g., Keep refrigerated at 4°C. Best consumed within 7 days."
                        value={productDetails.storageInstructions || ""}
                        onChange={(e) =>
                          setProductDetails((prev) => ({
                            ...prev,
                            storageInstructions: e.target.value,
                          }))
                        }
                        className="border-primary/20 focus-visible:ring-primary mt-2"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutritionalInfo">
                        Nutritional Information
                      </Label>
                      <Textarea
                        id="nutritionalInfo"
                        placeholder="e.g., Calories: 18 per 100g, Vitamin C: 14mg"
                        value={productDetails.nutritionalInfo || ""}
                        onChange={(e) =>
                          setProductDetails((prev) => ({
                            ...prev,
                            nutritionalInfo: e.target.value,
                          }))
                        }
                        className="border-primary/20 focus-visible:ring-primary mt-2"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Policies Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">
                        Policies & Information
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="shippingInfo">
                          Shipping Information
                        </Label>
                        <Textarea
                          id="shippingInfo"
                          placeholder="Enter shipping information"
                          value={productDetails.shippingInfo || ""}
                          onChange={(e) =>
                            setProductDetails((prev) => ({
                              ...prev,
                              shippingInfo: e.target.value,
                            }))
                          }
                          className="border-primary/20 focus-visible:ring-primary mt-2"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="returnPolicy">Return Policy</Label>
                        <Textarea
                          id="returnPolicy"
                          placeholder="Enter return policy"
                          value={productDetails.returnPolicy || ""}
                          onChange={(e) =>
                            setProductDetails((prev) => ({
                              ...prev,
                              returnPolicy: e.target.value,
                            }))
                          }
                          className="border-primary/20 focus-visible:ring-primary mt-2"
                          rows={3}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="maximumDaysForReturn">
                        Maximum Days for Return
                      </Label>
                      <Input
                        id="maximumDaysForReturn"
                        type="number"
                        placeholder="30"
                        value={productDetails.maximumDaysForReturn || ""}
                        onChange={(e) =>
                          setProductDetails((prev) => ({
                            ...prev,
                            maximumDaysForReturn: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="border-primary/20 focus-visible:ring-primary mt-2"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Number of days after delivery when the product can be
                        returned
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="displayToCustomers">
                        Display to Customers
                      </Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="checkbox"
                          id="displayToCustomers"
                          checked={productDetails.displayToCustomers || false}
                          onChange={(e) =>
                            setProductDetails((prev) => ({
                              ...prev,
                              displayToCustomers: e.target.checked,
                            }))
                          }
                          className="rounded border-primary/20 focus:ring-primary"
                        />
                        <Label htmlFor="displayToCustomers" className="text-sm">
                          Make this product visible to customers
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        When enabled, this product will be visible to customers
                        in the store
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-8">
                  <Button
                    type="button"
                    onClick={handleSaveProductDetails}
                    disabled={!hasProductDetailsChanges || isSubmitting}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Additional Info
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Button */}
      </form>

      {/* Warehouse Selector Modal */}
      {isWarehouseSelectorOpen && selectedVariantForWarehouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-md max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Assign Warehouses</h3>
            <p className="text-muted-foreground mb-4">
              Select warehouses for variant:{" "}
              {productVariants.find(
                (v) => v.variantId === selectedVariantForWarehouse,
              )?.variantName || "Unknown"}
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {warehouses.map((warehouse: any) => (
                <div
                  key={warehouse.warehouseId}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    id={`warehouse-${warehouse.warehouseId}`}
                    checked={getVariantWarehouseStocks(
                      selectedVariantForWarehouse,
                    ).some(
                      (stock: any) =>
                        stock.warehouseId === warehouse.warehouseId,
                    )}
                    onChange={(e) => {
                      const warehouseIds = e.target.checked
                        ? [
                            ...getVariantWarehouseStocks(
                              selectedVariantForWarehouse,
                            ).map((s: any) => s.warehouseId),
                            warehouse.warehouseId,
                          ]
                        : getVariantWarehouseStocks(selectedVariantForWarehouse)
                            .map((s: any) => s.warehouseId)
                            .filter((id: any) => id !== warehouse.warehouseId);

                      // Convert warehouse IDs to WarehouseStock format
                      const warehouseStocks: any[] = warehouseIds.map(
                        (id: any) => ({
                          warehouseId: parseInt(id.replace("wh-", "")),
                          stockQuantity: 0,
                          lowStockThreshold: 10,
                          warehouseName:
                            warehouses.find((w: any) => w.warehouseId === id)
                              ?.name || "Unknown",
                        }),
                      );

                      handleWarehouseAssignment(warehouseStocks);
                    }}
                  />
                  <label
                    htmlFor={`warehouse-${warehouse.warehouseId}`}
                    className="text-sm"
                  >
                    {warehouse.name}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsWarehouseSelectorOpen(false);
                  setSelectedVariantForWarehouse(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIsWarehouseSelectorOpen(false);
                  setSelectedVariantForWarehouse(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      <Dialog
        open={isImageUploadModalOpen}
        onOpenChange={setIsImageUploadModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Upload Images
            </DialogTitle>
            <DialogDescription>
              {selectedVariantForImageUpload && (
                <>
                  Upload images for variant:{" "}
                  <span className="font-semibold">
                    {productVariants.find(
                      (v) => v.variantId === selectedVariantForImageUpload,
                    )?.variantName || "Unknown"}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-border rounded-md p-6 text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="font-medium mb-2">Select Images</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Choose multiple images to upload for this variant
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="inline-flex items-center px-4 py-2 border border-border rounded-lg shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" />
                Choose Files
              </label>
            </div>

            {/* Selected Files Preview */}
            {imageFiles.length > 0 && (
              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-3">
                  Selected Files ({imageFiles.length})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {imageFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-20 object-cover rounded-lg border"
                      />
                      <div className="absolute top-1 right-1">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => {
                            setImageFiles((prev) =>
                              prev.filter((_, i) => i !== index),
                            );
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-md">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImageUploadModalOpen(false);
                setSelectedVariantForImageUpload(null);
                setImageFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={uploadImages}
              disabled={imageFiles.length === 0 || isImageUploading}
            >
              {isImageUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  Upload {imageFiles.length} Image
                  {imageFiles.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attribute Management Modal */}
      <Dialog
        open={isAttributeModalOpen}
        onOpenChange={setIsAttributeModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Manage Variant Attributes
            </DialogTitle>
            <DialogDescription>
              {selectedVariantForAttributes && (
                <>
                  Manage attributes for variant:{" "}
                  <span className="font-semibold">
                    {productVariants.find(
                      (v) => v.variantId === selectedVariantForAttributes,
                    )?.variantName || "Unknown"}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Fetch from Backend */}
            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-3">Available Attributes</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Select from existing attribute types and values
              </p>
              <FetchAttributesDialog
                onAttributesSelected={async (attributes) => {
                  if (!selectedVariantForAttributes) return;

                  const attributeRequests = attributes.flatMap((attr) =>
                    attr.values.map((value) => ({
                      attributeTypeName: attr.name,
                      attributeValue: value,
                    })),
                  );

                  await handleAddVariantAttributes(
                    selectedVariantForAttributes,
                    attributeRequests,
                  );
                }}
              />
            </div>

            {/* Add New Attribute */}
            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-3">Add New Attribute</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="attribute-type">Attribute Type</Label>
                  <Input
                    id="attribute-type"
                    placeholder="e.g., Color, Size, Material"
                    className="h-8"
                    value={attributeTypeName}
                    onChange={(e) => setAttributeTypeName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="attribute-value">Attribute Value</Label>
                  <Input
                    id="attribute-value"
                    placeholder="e.g., Red, Large, Cotton"
                    className="h-8"
                    value={attributeValue}
                    onChange={(e) => setAttributeValue(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                className="mt-3"
                onClick={async () => {
                  if (!attributeTypeName.trim() || !attributeValue.trim()) {
                    toast({
                      title: "Missing Fields",
                      description:
                        "Please fill in both attribute type and value",
                      variant: "destructive",
                    });
                    return;
                  }

                  if (!selectedVariantForAttributes) return;

                  await handleAddVariantAttributes(
                    selectedVariantForAttributes,
                    [
                      {
                        attributeTypeName: attributeTypeName.trim(),
                        attributeValue: attributeValue.trim(),
                      },
                    ],
                  );

                  setAttributeTypeName("");
                  setAttributeValue("");
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Attribute
              </Button>
            </div>

            {/* Current Attributes */}
            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-3">Current Attributes</h4>
              {selectedVariantForAttributes && (
                <div className="space-y-2">
                  {productVariants
                    .find((v) => v.variantId === selectedVariantForAttributes)
                    ?.attributes?.map((attr) => (
                      <div
                        key={attr.attributeValueId}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <span className="font-medium text-sm">
                            {attr.attributeType}
                          </span>
                          <span className="text-muted-foreground text-sm ml-2">
                            {attr.attributeValue}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            handleRemoveVariantAttribute(
                              selectedVariantForAttributes!,
                              attr.attributeValueId,
                            );
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAttributeModalOpen(false);
                setSelectedVariantForAttributes(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warehouse Stock Management Modal */}
      <Dialog
        open={isWarehouseModalOpen}
        onOpenChange={setIsWarehouseModalOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warehouse className="w-5 h-5" />
              Manage Warehouse Stock
            </DialogTitle>
            <DialogDescription>
              {selectedVariantForWarehouse && (
                <>
                  Manage stock for variant:{" "}
                  <span className="font-semibold">
                    {productVariants.find(
                      (v) => v.variantId === selectedVariantForWarehouse,
                    )?.variantName || "Unknown"}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh]">
            <WarehouseSelectorWithBatches
              warehouseStocks={variantWarehouseStocksWithBatches}
              onWarehouseStocksChange={(stocks) => {
                setVariantWarehouseStocksWithBatches(stocks);
                // TODO: Update variant warehouse stocks in backend
                console.log("Updated warehouse stocks with batches:", stocks);
              }}
              title="Warehouse Stock Assignment with Batches"
              description="Assign stock quantities with batch details to warehouses for this variant"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsWarehouseModalOpen(false);
                setSelectedVariantForWarehouse(null);
                setVariantWarehouseStocksWithBatches([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (
                  !selectedVariantForWarehouse ||
                  variantWarehouseStocksWithBatches.length === 0
                ) {
                  toast({
                    title: "No Changes",
                    description: "Please add warehouse stocks before saving.",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  setIsSubmitting(true);

                  await productService.assignVariantStockWithBatches(
                    productId,
                    selectedVariantForWarehouse,
                    variantWarehouseStocksWithBatches,
                  );

                  toast({
                    title: "Success",
                    description:
                      "Variant warehouse stocks have been updated successfully.",
                  });

                  setIsWarehouseModalOpen(false);
                  setSelectedVariantForWarehouse(null);
                  setVariantWarehouseStocksWithBatches([]);

                  // Refresh variant data
                  await fetchProductVariants();
                } catch (error: any) {
                  console.error(
                    "Error saving variant warehouse stocks:",
                    error,
                  );
                  toast({
                    title: "Error",
                    description:
                      error.message ||
                      "Failed to save variant warehouse stocks. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Modal */}
      <AlertDialog
        open={isUnsavedChangesModalOpen}
        onOpenChange={setIsUnsavedChangesModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAction}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardChanges}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
            <AlertDialogAction onClick={handleSaveChanges}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add New Variant Dialog */}
      <Dialog
        open={isAddVariantDialogOpen}
        onOpenChange={setIsAddVariantDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Variant
            </DialogTitle>
            <DialogDescription>
              Add a new variant to this product with all necessary information
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[70vh] pr-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Basic Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label
                      htmlFor="variant-name"
                      className="text-sm font-medium"
                    >
                      Variant Name *
                    </Label>
                    <Input
                      id="variant-name"
                      value={newVariant.variantName}
                      onChange={(e) =>
                        setNewVariant((prev) => ({
                          ...prev,
                          variantName: e.target.value,
                        }))
                      }
                      placeholder="Enter variant name"
                      required
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="variant-sku"
                      className="text-sm font-medium"
                    >
                      SKU *
                    </Label>
                    <Input
                      id="variant-sku"
                      value={newVariant.variantSku}
                      onChange={(e) =>
                        setNewVariant((prev) => ({
                          ...prev,
                          variantSku: e.target.value,
                        }))
                      }
                      placeholder="Enter SKU"
                      className="font-mono"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sort-order" className="text-sm font-medium">
                      Sort Order
                    </Label>
                    <Input
                      id="sort-order"
                      type="number"
                      value={newVariant.sortOrder}
                      onChange={(e) =>
                        setNewVariant((prev) => ({
                          ...prev,
                          sortOrder: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Pricing Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor="variant-price"
                        className="text-sm font-medium"
                      >
                        Price *
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The main selling price of this variant</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="variant-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newVariant.price}
                      onChange={(e) =>
                        setNewVariant((prev) => ({
                          ...prev,
                          price: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor="variant-sale-price"
                        className="text-sm font-medium"
                      >
                        Sale Price (Compare At Price)
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              The original price before discount. Used to show
                              savings to customers
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="variant-sale-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newVariant.salePrice || ""}
                      onChange={(e) =>
                        setNewVariant((prev) => ({
                          ...prev,
                          salePrice: parseFloat(e.target.value) || null,
                        }))
                      }
                      placeholder="Enter sale price"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor="variant-cost-price"
                        className="text-sm font-medium"
                      >
                        Cost Price
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              The cost to produce/purchase this variant. Used
                              for profit calculations
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="variant-cost-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newVariant.costPrice || ""}
                      onChange={(e) =>
                        setNewVariant((prev) => ({
                          ...prev,
                          costPrice: parseFloat(e.target.value) || null,
                        }))
                      }
                      placeholder="Enter cost price"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Status
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={newVariant.isActive}
                      onCheckedChange={(checked) =>
                        setNewVariant((prev) => ({
                          ...prev,
                          isActive: checked,
                        }))
                      }
                      className="data-[state=checked]:bg-primary"
                    />
                    <Label className="text-sm font-medium">Active Status</Label>
                  </div>
                </div>
              </div>

              {/* Attributes */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Variant Attributes
                </h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Add manual attribute logic
                        console.log("Add manual attribute");
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Manually
                    </Button>
                    <FetchAttributesDialog
                      onAttributesSelected={handleAttributesFromBackend}
                    />
                  </div>
                  <div className="space-y-2">
                    {newVariant.attributes?.map((attr, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded"
                      >
                        <span className="text-sm">
                          {attr.attributeTypeId}: {attr.attributeValueId}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={() => {
                            setNewVariant((prev) => ({
                              ...prev,
                              attributes:
                                prev.attributes?.filter(
                                  (_, i) => i !== index,
                                ) || [],
                            }));
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Variant Images
                </h4>
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-border rounded-md p-6 text-center hover:border-primary/50 transition-colors">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload images for this variant
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setNewVariant((prev) => ({
                          ...prev,
                          images: [...prev.images, ...files],
                        }));
                      }}
                      className="hidden"
                      id="variant-images"
                    />
                    <label
                      htmlFor="variant-images"
                      className="inline-flex items-center px-4 py-2 border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Choose Images
                    </label>
                  </div>
                  {newVariant.images.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">
                        Selected Images ({newVariant.images.length})
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {newVariant.images.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-32 object-cover rounded-md border shadow-sm"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setNewVariant((prev) => ({
                                    ...prev,
                                    images: prev.images.filter(
                                      (_, i) => i !== index,
                                    ),
                                  }));
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 rounded-b-lg">
                              <div className="truncate">{file.name}</div>
                              <div className="text-xs opacity-75">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancelAddVariant}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveNewVariant}
              className="bg-primary hover:bg-primary/90"
            >
              Create Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Variant Confirmation Modal */}
      <AlertDialog
        open={isDeleteVariantModalOpen}
        onOpenChange={setIsDeleteVariantModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete Variant
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this variant? This action cannot
              be undone.
              <br />
              <br />
              <strong>This will permanently delete:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All variant images (from Cloudinary and database)</li>
                <li>All variant attributes and associations</li>
                <li>All stock information for this variant</li>
                <li>The variant itself</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteVariantModalOpen(false);
                setVariantToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (variantToDelete) {
                  handleDeleteVariant(variantToDelete.variantId);
                  setIsDeleteVariantModalOpen(false);
                  setVariantToDelete(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Variant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unassign Warehouse Confirmation Dialog */}
      <AlertDialog
        open={isUnassignWarehouseDialogOpen}
        onOpenChange={setIsUnassignWarehouseDialogOpen}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-lg font-semibold text-gray-900">
                Unassign Warehouse
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-4 space-y-3">
              <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  ⚠️ Warning: This action will permanently:
                </p>
                <ul className="text-sm text-amber-700 space-y-1 ml-4">
                  <li>
                    • Remove all stock assignments for warehouse "
                    {warehouseToUnassign?.warehouseName}"
                  </li>
                  <li>
                    • Delete all batches stored in this warehouse for this
                    product
                  </li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to continue with unassigning this
                warehouse?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel
              onClick={() => {
                setIsUnassignWarehouseDialogOpen(false);
                setWarehouseToUnassign(null);
              }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (warehouseToUnassign) {
                  handleUnassignWarehouse(
                    warehouseToUnassign.warehouseId,
                    warehouseToUnassign.warehouseName,
                  );
                  setIsUnassignWarehouseDialogOpen(false);
                  setWarehouseToUnassign(null);
                }
              }}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <X className="w-4 h-4 mr-2" />
              Unassign Warehouse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inventory Management Modal */}
      <Dialog
        open={isInventoryModalOpen}
        onOpenChange={setIsInventoryModalOpen}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warehouse className="w-5 h-5" />
              Manage Product Inventory
            </DialogTitle>
            <DialogDescription>
              Assign stock levels to different warehouses for this product.
            </DialogDescription>
          </DialogHeader>

          <WarehouseSelectorWithBatches
            warehouseStocks={productWarehouseStocksWithBatches}
            onWarehouseStocksChange={setProductWarehouseStocksWithBatches}
            title="Manage Product Inventory with Batches"
            description="Assign stock levels with batch details to different warehouses for this product"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInventoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                handleSaveProductInventory(productWarehouseStocksWithBatches)
              }
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
