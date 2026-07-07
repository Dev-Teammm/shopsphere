"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, X, Link as LinkIcon } from "lucide-react";
import { shopService, ShopDTO } from "@/lib/services/shop-service";
import Image from "next/image";

interface CreateShopDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type LogoInputMethod = "url" | "file" | null;

export function CreateShopDialog({
  isOpen,
  onOpenChange,
}: CreateShopDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  const [logoInputMethod, setLogoInputMethod] = useState<LogoInputMethod>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrlValidating, setLogoUrlValidating] = useState(false);
  const [logoUrlError, setLogoUrlError] = useState<string | null>(null);

  const createShopMutation = useMutation({
    mutationFn: async (data: { shopData: Partial<ShopDTO>; logoFile?: File }) => {
      if (data.logoFile) {
        return shopService.createShopWithLogo(data.shopData, data.logoFile);
      } else {
        return shopService.createShop(data.shopData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userShops"] });
      toast({
        title: "Shop created successfully",
        description: "Your shop has been created and is now active. Your role has been updated to VENDOR.",
        variant: "default",
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating shop",
        description: error.message || "Failed to create shop. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
    setIsActive(true);
    setLogoInputMethod(null);
    setLogoUrl("");
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrlError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

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
      setLogoUrlError("Please enter a valid image URL (jpg, png, gif, webp, svg)");
      return;
    }

    setLogoUrlValidating(true);
    try {
      const isValid = await validateImageUrl(url);
      if (isValid) {
        setLogoPreview(url);
        setLogoUrlError(null);
      } else {
        setLogoUrlError("Unable to load image from this URL. Please check the URL and try again.");
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

  const handleCreateShop = () => {
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

    const shopData: Partial<ShopDTO> = {
      name: name.trim(),
      description: description.trim() || undefined,
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      address: address.trim(),
      isActive: isActive,
      logoUrl: logoInputMethod === "url" && logoUrl ? logoUrl : undefined,
    };

    createShopMutation.mutate({
      shopData,
      logoFile: logoInputMethod === "file" && logoFile ? logoFile : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Shop</DialogTitle>
          <DialogDescription>
            Fill in the details to create your shop. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Shop Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter shop name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createShopMutation.isPending}
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
              disabled={createShopMutation.isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="isActive">Active Status</Label>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={createShopMutation.isPending}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                {isActive ? "Active" : "Inactive"}
              </Label>
            </div>
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
              disabled={createShopMutation.isPending}
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
              disabled={createShopMutation.isPending}
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
              disabled={createShopMutation.isPending}
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
                  disabled={createShopMutation.isPending}
                  className="flex-1"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Use URL
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogoInputMethod("file")}
                  disabled={createShopMutation.isPending}
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
                    disabled={createShopMutation.isPending || logoUrlValidating}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRemoveLogo}
                    disabled={createShopMutation.isPending}
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
                    disabled={createShopMutation.isPending}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRemoveLogo}
                    disabled={createShopMutation.isPending}
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
                    Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createShopMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateShop}
            disabled={createShopMutation.isPending}
          >
            {createShopMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Shop"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

