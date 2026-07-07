"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Loader2,
  Upload,
  X,
  Link as LinkIcon,
  Save,
  Plus,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { shopService, ShopDTO } from "@/lib/services/shop-service";
import {
  shopCategoryService,
  ShopCategory,
} from "@/lib/services/shop-category-service";
import {
  capabilityTransitionService,
  PendingOperationsCount,
} from "@/lib/services/capability-transition-service";
import { ShopCapability } from "@/lib/services/subscription-service";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { CapabilityChangeDialog } from "./capability-change-dialog";
import { CapabilityErrorDialog } from "./capability-error-dialog";

interface BasicInfoTabProps {
  shop: ShopDTO | null;
  onShopCreated: (shop: ShopDTO) => void;
  onShopUpdated: (shop: ShopDTO) => void;
  isNewShop: boolean;
}

type LogoInputMethod = "url" | "file" | null;

export function BasicInfoTab({
  shop,
  onShopCreated,
  onShopUpdated,
  isNewShop,
}: BasicInfoTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to extract error message from API error
  const extractErrorMessage = (
    error: any,
  ): { title: string; message: string } => {
    let errorMessage = "An error occurred. Please try again.";
    let errorTitle = "Error";

    if (error?.response?.data) {
      if (typeof error.response.data === "string") {
        errorMessage = error.response.data;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }

    // Determine appropriate title based on error content
    const lowerMessage = errorMessage.toLowerCase();
    if (
      lowerMessage.includes("subscription") ||
      lowerMessage.includes("capability") ||
      lowerMessage.includes("plan")
    ) {
      errorTitle = "Subscription Plan Mismatch";
    } else if (
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("forbidden")
    ) {
      errorTitle = "Access Denied";
    } else if (lowerMessage.includes("not found")) {
      errorTitle = "Not Found";
    }

    return { title: errorTitle, message: errorMessage };
  };

  const [name, setName] = useState(shop?.name || "");
  const [description, setDescription] = useState(shop?.description || "");
  const [contactEmail, setContactEmail] = useState(shop?.contactEmail || "");
  const [contactPhone, setContactPhone] = useState(shop?.contactPhone || "");
  const [address, setAddress] = useState(shop?.address || "");
  const [isActive, setIsActive] = useState(shop?.isActive ?? true);
  const [categoryName, setCategoryName] = useState(
    shop?.shopCategoryName || shop?.category || "",
  );
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [primaryCapability, setPrimaryCapability] = useState<
    ShopCapability | undefined
  >(shop?.primaryCapability as ShopCapability | undefined);

  const [logoInputMethod, setLogoInputMethod] = useState<LogoInputMethod>(null);
  const [logoUrl, setLogoUrl] = useState(shop?.logoUrl || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    shop?.logoUrl || null,
  );
  const [logoUrlValidating, setLogoUrlValidating] = useState(false);
  const [logoUrlError, setLogoUrlError] = useState<string | null>(null);
  const [showCapabilityDialog, setShowCapabilityDialog] = useState(false);
  const [pendingCapabilityChange, setPendingCapabilityChange] =
    useState<ShopCapability | null>(null);
  const [pendingOperations, setPendingOperations] =
    useState<PendingOperationsCount | null>(null);
  const [isLoadingPendingOps, setIsLoadingPendingOps] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogTitle, setErrorDialogTitle] = useState("Error");
  const [errorDialogMessage, setErrorDialogMessage] = useState("");

  // Initialize form with existing shop data
  useEffect(() => {
    if (shop) {
      setName(shop.name || "");
      setDescription(shop.description || "");
      setContactEmail(shop.contactEmail || "");
      setContactPhone(shop.contactPhone || "");
      setAddress(shop.address || "");
      setIsActive(shop.isActive ?? true);
      setLogoUrl(shop.logoUrl || "");
      setLogoPreview(shop.logoUrl || null);
      setCategoryName(shop.shopCategoryName || shop.category || "");
      setPrimaryCapability(
        shop.primaryCapability as ShopCapability | undefined,
      );
    }
  }, [shop]);

  // Debounced search for categories
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(categorySearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [categorySearchQuery]);

  // Search categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["shop-categories-search", debouncedSearchQuery],
    queryFn: () => shopCategoryService.searchCategories(debouncedSearchQuery),
    enabled: categoryOpen || debouncedSearchQuery.length > 0,
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => shopCategoryService.createCategory(name),
    onSuccess: (newCategory) => {
      setCategoryName(newCategory.name);
      setCategoryOpen(false);
      toast({
        title: "Category Created",
        description: `Category "${newCategory.name}" has been created and selected.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category.",
        variant: "destructive",
      });
    },
  });

  const createShopMutation = useMutation({
    mutationFn: async (data: {
      shopData: Partial<ShopDTO>;
      logoFile?: File;
    }) => {
      if (data.logoFile) {
        return shopService.createShopWithLogo(data.shopData, data.logoFile);
      } else {
        return shopService.createShop(data.shopData);
      }
    },
    onSuccess: (createdShop) => {
      toast({
        title: "Shop created successfully",
        description:
          "Your shop has been created with pending status. Please connect your Stripe account to activate it.",
        variant: "default",
      });
      resetForm();
      onShopCreated(createdShop);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating shop",
        description:
          error.message || "Failed to create shop. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateShopMutation = useMutation({
    mutationFn: async (data: {
      shopId: string;
      shopData: Partial<ShopDTO>;
    }) => {
      // For updates, we use the existing shop service update method
      // Note: Logo updates are not supported in the current backend implementation
      const updatedShop = await shopService.updateShop(
        data.shopId,
        data.shopData,
      );
      return updatedShop;
    },
    onSuccess: (updatedShop) => {
      toast({
        title: "Shop updated successfully",
        description: "Your shop information has been updated.",
        variant: "default",
      });
      onShopUpdated(updatedShop);
      // Reset capability dialog state on success
      setShowCapabilityDialog(false);
      setPendingCapabilityChange(null);
      setPendingOperations(null);
    },
    onError: (error: any) => {
      const { title, message } = extractErrorMessage(error);

      // Show error in dialog instead of toast
      setErrorDialogTitle(title);
      setErrorDialogMessage(message);
      setShowErrorDialog(true);

      // If it's a subscription/capability error, reset the capability change
      const lowerMessage = message.toLowerCase();
      if (
        lowerMessage.includes("subscription") ||
        lowerMessage.includes("capability") ||
        lowerMessage.includes("plan")
      ) {
        // Revert to original capability
        setPrimaryCapability(
          shop?.primaryCapability as ShopCapability | undefined,
        );
        setShowCapabilityDialog(false);
        setPendingCapabilityChange(null);
        setPendingOperations(null);
      }
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
    setIsActive(true);
    setCategoryName("");
    setPrimaryCapability(undefined);
    setLogoInputMethod(null);
    setLogoUrl("");
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrlError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateImageUrl = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;

      setTimeout(() => resolve(false), 5000);
    });
  };

  const handleLogoUrlChange = async (url: string) => {
    setLogoUrl(url);
    setLogoUrlError(null);
    setLogoPreview(null);

    if (!url.trim()) {
      return;
    }

    const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
    if (!urlPattern.test(url)) {
      setLogoUrlError(
        "Please enter a valid image URL (jpg, png, gif, webp, svg)",
      );
      return;
    }

    setLogoUrlValidating(true);
    try {
      const isValid = await validateImageUrl(url);
      if (isValid) {
        setLogoPreview(url);
        setLogoUrlError(null);
      } else {
        setLogoUrlError(
          "Unable to load image from this URL. Please check the URL and try again.",
        );
      }
    } catch (error) {
      setLogoUrlError("Failed to validate image URL");
    } finally {
      setLogoUrlValidating(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (jpg, png, gif, webp, svg)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setLogoUrlError(null);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoUrl("");
    setLogoPreview(null);
    setLogoUrlError(null);
    setLogoInputMethod(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Shop name is required",
        variant: "destructive",
      });
      return;
    }

    if (!contactEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Contact email is required",
        variant: "destructive",
      });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(contactEmail)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!contactPhone.trim()) {
      toast({
        title: "Validation Error",
        description: "Contact phone is required",
        variant: "destructive",
      });
      return;
    }

    if (!address.trim()) {
      toast({
        title: "Validation Error",
        description: "Address is required",
        variant: "destructive",
      });
      return;
    }

    if (logoInputMethod === "url" && logoUrl && logoUrlError) {
      toast({
        title: "Validation Error",
        description: "Please fix the logo URL error before submitting",
        variant: "destructive",
      });
      return;
    }

    if (isNewShop && !primaryCapability) {
      toast({
        title: "Validation Error",
        description: "Please select a shop capability to continue",
        variant: "destructive",
      });
      return;
    }

    const shopData: Partial<ShopDTO> = {
      name: name.trim(),
      description: description.trim() || undefined,
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      address: address.trim(),
      isActive: isActive,
      logoUrl: logoInputMethod === "url" && logoUrl ? logoUrl : undefined,
      shopCategoryName: categoryName.trim() || undefined,
      primaryCapability: primaryCapability,
    };

    if (isNewShop) {
      createShopMutation.mutate({
        shopData,
        logoFile: logoInputMethod === "file" && logoFile ? logoFile : undefined,
      });
    } else if (shop) {
      updateShopMutation.mutate({
        shopId: shop.shopId,
        shopData,
      });
    }
  };

  const isLoading =
    createShopMutation.isPending || updateShopMutation.isPending;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isNewShop ? (
              <Plus className="h-5 w-5" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {isNewShop ? "Create Shop" : "Update Shop Information"}
          </CardTitle>
          <CardDescription>
            {isNewShop
              ? "Fill in the details to create your shop. After creation, you'll need to connect a Stripe account to activate it."
              : "Update your shop's basic information. Only you (the shop owner) can make these changes."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Shop Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter shop name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter shop description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="isActive">Active Status</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={isLoading}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  {isActive ? "Active" : "Inactive"}
                </Label>
              </div>
              {isActive && shop && shop.isTrulyActive === false && (
                <p className="text-xs text-yellow-600 mt-1">
                  Note: Although manual status is Active, the shop is currently
                  not visible to customers because of missing requirements (e.g.
                  Stripe connection or active subscription).
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Shop Category (optional)</Label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className="w-full justify-between"
                    disabled={isLoading}
                  >
                    {categoryName || "Select category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search categories..."
                      value={categorySearchQuery}
                      onValueChange={setCategorySearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {categoriesLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : categorySearchQuery.trim() ? (
                          <div className="py-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                              No category found matching "{categorySearchQuery}"
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (categorySearchQuery.trim()) {
                                  createCategoryMutation.mutate(
                                    categorySearchQuery.trim(),
                                  );
                                }
                              }}
                              disabled={
                                createCategoryMutation.isPending ||
                                !categorySearchQuery.trim()
                              }
                              className="gap-2"
                            >
                              {createCategoryMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  Create "{categorySearchQuery}"
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Start typing to search categories...
                          </div>
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {categories?.map((category) => (
                          <CommandItem
                            key={category.id}
                            value={category.name}
                            onSelect={() => {
                              setCategoryName(category.name);
                              setCategoryOpen(false);
                              setCategorySearchQuery("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                categoryName === category.name
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {category.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {categoryName && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Selected: <strong>{categoryName}</strong>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCategoryName("");
                      setCategorySearchQuery("");
                    }}
                    disabled={isLoading}
                    className="h-6 px-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="capability">
                Shop Capability{" "}
                {isNewShop && <span className="text-destructive">*</span>}
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                {isNewShop
                  ? "Select how your shop will operate. This determines which subscription plans are available."
                  : "Update your shop's operational capability. This determines which subscription plans are available."}
              </p>
              <RadioGroup
                value={primaryCapability || ""}
                onValueChange={async (value) => {
                  const newCapability = value as ShopCapability;
                  // If capability is actually changing and shop exists, check for pending operations
                  if (
                    !isNewShop &&
                    shop &&
                    shop.primaryCapability &&
                    shop.primaryCapability !== newCapability
                  ) {
                    setIsLoadingPendingOps(true);
                    try {
                      const ops =
                        await capabilityTransitionService.getPendingOperations(
                          shop.shopId,
                          newCapability,
                        );

                      if (ops.total > 0) {
                        setPendingOperations(ops);
                        setPendingCapabilityChange(newCapability);
                        setShowCapabilityDialog(true);
                      } else {
                        // If no pending operations, we can request transition directly
                        // which might change it immediately on backend
                        await capabilityTransitionService.requestTransition(
                          shop.shopId,
                          newCapability,
                        );
                        setPrimaryCapability(newCapability);
                        toast({
                          title: "Capability Updated",
                          description: `Shop capability has been updated to ${newCapability.replace(/_/g, " ")}.`,
                        });
                      }
                    } catch (error: any) {
                      const { title, message } = extractErrorMessage(error);
                      setShowErrorDialog(true);
                      if (
                        message.toLowerCase().includes("subscription") ||
                        message.toLowerCase().includes("capability") ||
                        message.toLowerCase().includes("plan")
                      ) {
                        setPrimaryCapability(
                          shop?.primaryCapability as ShopCapability | undefined,
                        );
                        setShowCapabilityDialog(false);
                        setPendingCapabilityChange(null);
                        setPendingOperations(null);
                      }
                    } finally {
                      setIsLoadingPendingOps(false);
                    }
                  } else {
                    // For new shops or no change, update immediately
                    setPrimaryCapability(newCapability);
                  }
                }}
                className="space-y-3"
                disabled={isLoading || isLoadingPendingOps}
              >
                <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem
                    value="VISUALIZATION_ONLY"
                    id="VISUALIZATION_ONLY"
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="VISUALIZATION_ONLY"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Visualization Only
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Only display products. No orders, delivery, or returns.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem
                    value="PICKUP_ORDERS"
                    id="PICKUP_ORDERS"
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="PICKUP_ORDERS"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Pickup Orders
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Display products and accept pickup orders. Customers pick
                      up at shop. Returns handled at shop (no delivery agent).
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem
                    value="FULL_ECOMMERCE"
                    id="FULL_ECOMMERCE"
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="FULL_ECOMMERCE"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Full E-commerce
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Full e-commerce: products, orders, delivery with agents,
                      and returns with agents.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="HYBRID" id="HYBRID" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="HYBRID"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Hybrid
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Both pickup orders and full e-commerce capabilities
                      (pickup + delivery).
                    </p>
                  </div>
                </div>
              </RadioGroup>
              {isNewShop && !primaryCapability && (
                <p className="text-sm text-destructive">
                  Please select a shop capability to continue.
                </p>
              )}
              {!isNewShop && primaryCapability && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">
                    Current capability:{" "}
                    <strong className="text-foreground">
                      {primaryCapability.replace(/_/g, " ")}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactEmail">
                Contact Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="contact@shop.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactPhone">
                Contact Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactPhone"
                type="tel"
                placeholder="+1234567890"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">
                Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="address"
                placeholder="Enter shop address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label>Shop Logo (optional)</Label>
              {!logoInputMethod && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLogoInputMethod("url")}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Use URL
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLogoInputMethod("file")}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              )}

              {logoInputMethod === "url" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => handleLogoUrlChange(e.target.value)}
                      disabled={isLoading || logoUrlValidating}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleRemoveLogo}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {logoUrlValidating && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validating image...
                    </p>
                  )}
                  {logoUrlError && (
                    <p className="text-sm text-destructive">{logoUrlError}</p>
                  )}
                  {logoPreview && !logoUrlError && (
                    <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              )}

              {logoInputMethod === "file" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleRemoveLogo}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {logoPreview && (
                    <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )}
                  {logoFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {logoFile.name} (
                      {(logoFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t">
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              size="lg"
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isNewShop ? "Creating..." : "Updating..."}
                </>
              ) : (
                <>
                  {isNewShop ? (
                    <Plus className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isNewShop ? "Create Shop" : "Update Shop"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CapabilityChangeDialog
        open={showCapabilityDialog}
        onOpenChange={(open) => {
          setShowCapabilityDialog(open);
          if (!open) {
            // Reset state when dialog closes
            setPendingCapabilityChange(null);
            setPendingOperations(null);
          }
        }}
        onConfirm={async () => {
          if (!shop || !pendingCapabilityChange) return;

          try {
            setIsLoadingPendingOps(true);
            const result = await capabilityTransitionService.requestTransition(
              shop.shopId,
              pendingCapabilityChange,
            );

            setShowCapabilityDialog(false);

            if ("status" in result && result.status === "PENDING") {
              toast({
                title: "Transition Requested",
                description:
                  "A capability transition has been requested. It will complete once all pending operations are resolved.",
              });
            } else {
              setPrimaryCapability(pendingCapabilityChange);
              toast({
                title: "Capability Updated",
                description: "Shop capability has been updated successfully.",
              });
            }

            setPendingCapabilityChange(null);
            setPendingOperations(null);
          } catch (error: any) {
            const { title, message } = extractErrorMessage(error);
            toast({
              title: title || "Transition Failed",
              description:
                message || "Failed to request capability transition.",
              variant: "destructive",
            });
          } finally {
            setIsLoadingPendingOps(false);
          }
        }}
        currentCapability={
          shop?.primaryCapability as ShopCapability | undefined
        }
        newCapability={pendingCapabilityChange || "VISUALIZATION_ONLY"}
        pendingOperations={
          pendingOperations || {
            pendingOrders: 0,
            pendingReturns: 0,
            pendingAppeals: 0,
            pendingDeliveries: 0,
            total: 0,
          }
        }
        isLoading={isLoadingPendingOps || updateShopMutation.isPending}
      />

      <CapabilityErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        title={errorDialogTitle}
        message={errorDialogMessage}
      />
    </>
  );
}
