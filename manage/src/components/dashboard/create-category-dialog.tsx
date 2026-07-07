"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { adminCategoryService } from "@/lib/services/admin-category-service";
import { CategoryResponse, CategoryCreateRequest } from "@/lib/types/category";

interface CreateCategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCategoryDialog({
  isOpen,
  onOpenChange,
}: CreateCategoryDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

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

  // Fetch all categories for dropdown selection
  const { data: allCategoriesData, isLoading: isLoadingAllCategories } =
    useQuery({
      queryKey: ["allCategories"],
      queryFn: () =>
        adminCategoryService.getAllCategories(0, 1000, "name", "asc"),
      enabled: isOpen,
    });

  const allCategories = allCategoriesData?.content || [];

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryCreateRequest) =>
      adminCategoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["allCategories"] });
      toast.toast({
        title: "Category created",
        description: "The category was created successfully.",
        variant: "success",
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.toast({
        title: "Error",
        description: error.message || "Failed to create category.",
        variant: "destructive",
      });
    },
  });

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
  };

  // Handle create category
  const handleCreateCategory = () => {
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

    createCategoryMutation.mutate(categoryData);
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
          <DialogDescription>
            Add a new category to your product catalog
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
          <div className="grid gap-2">
            <Label htmlFor="parent">Parent Category (optional)</Label>
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
                <SelectItem value="none">None (Top-level category)</SelectItem>
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
            onClick={() => onOpenChange(false)}
            className="border-primary/20 hover:bg-primary/5 hover:text-primary"
            disabled={createCategoryMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreateCategory}
            disabled={!formName || createCategoryMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createCategoryMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Category"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
