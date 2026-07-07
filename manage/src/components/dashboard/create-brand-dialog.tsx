"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
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
import { Loader2 } from "lucide-react";
import { brandService } from "@/lib/services/brand-service";
import { CreateBrandRequest } from "@/lib/types/brand";

interface CreateBrandDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBrandDialog({
  isOpen,
  onOpenChange,
}: CreateBrandDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  // Brand form states
  const [brandFormName, setBrandFormName] = useState("");
  const [brandFormDescription, setBrandFormDescription] = useState("");
  const [brandFormLogoUrl, setBrandFormLogoUrl] = useState("");
  const [brandFormWebsiteUrl, setBrandFormWebsiteUrl] = useState("");
  const [brandFormIsActive, setBrandFormIsActive] = useState(true);
  const [brandFormIsFeatured, setBrandFormIsFeatured] = useState(false);

  // Create brand mutation
  const createBrandMutation = useMutation({
    mutationFn: (data: CreateBrandRequest) => brandService.createBrand(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.toast({
        title: "Brand created",
        description: "The brand was created successfully.",
        variant: "success",
      });
      resetBrandForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.toast({
        title: "Error",
        description: error.message || "Failed to create brand.",
        variant: "destructive",
      });
    },
  });

  // Reset brand form fields
  const resetBrandForm = () => {
    setBrandFormName("");
    setBrandFormDescription("");
    setBrandFormLogoUrl("");
    setBrandFormWebsiteUrl("");
    setBrandFormIsActive(true);
    setBrandFormIsFeatured(false);
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetBrandForm();
    }
  }, [isOpen]);

  const handleCreateBrand = () => {
    if (!brandFormName.trim()) {
      toast.toast({
        title: "Error",
        description: "Brand name is required.",
        variant: "destructive",
      });
      return;
    }
    createBrandMutation.mutate({
      brandName: brandFormName.trim(),
      description: brandFormDescription.trim() || undefined,
      logoUrl: brandFormLogoUrl.trim() || undefined,
      websiteUrl: brandFormWebsiteUrl.trim() || undefined,
      isActive: brandFormIsActive,
      isFeatured: brandFormIsFeatured,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
            onClick={() => onOpenChange(false)}
            className="border-primary/20 hover:bg-primary/5 hover:text-primary"
            disabled={createBrandMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateBrand}
            disabled={createBrandMutation.isPending}
            className="bg-primary hover:bg-primary/90"
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
  );
}
