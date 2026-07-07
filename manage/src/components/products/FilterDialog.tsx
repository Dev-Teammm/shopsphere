"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Filter as FilterIcon, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { categoryService } from "@/lib/services/category-service";
import {
  ProductSearchFilterRequest,
  CategoryResponse,
} from "@/lib/types/product";
import { AdvancedSearchFilters } from "./AdvancedSearchFilters";

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: ProductSearchFilterRequest) => void;
  currentFilters: ProductSearchFilterRequest;
}

export function FilterDialog({
  open,
  onOpenChange,
  onApplyFilters,
  currentFilters,
}: FilterDialogProps) {
  // Check if we're on mobile
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Fetch all categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getAllCategories(),
  });

  // Format categories for display
  const formattedCategories = React.useMemo(() => {
    if (!categories) return [];

    // Handle both paginated and non-paginated responses
    const categoryList = categories.content || categories;

    // Create a map of parent categories and their children
    const parentCategories = categoryList.filter((cat: any) => !cat.parentId);

    return parentCategories.map((category: any) => ({
      id: category.id || category.categoryId,
      name: category.name,
      hasSubcategories: category.hasSubcategories,
    }));
  }, [categories]);

  // For fetching subcategories when a parent is selected
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  // Fetch subcategories for a selected category
  const { data: subcategories, isLoading: isSubcategoriesLoading } = useQuery({
    queryKey: ["subcategories", selectedCategoryId],
    queryFn: () =>
      selectedCategoryId
        ? categoryService.getSubcategories(parseInt(selectedCategoryId))
        : Promise.resolve([]),
    enabled: !!selectedCategoryId,
  });

  // Format colors (in a real app these would come from the API)
  const colors = [
    { name: "Black" },
    { name: "White" },
    { name: "Red" },
    { name: "green" },
    { name: "Green" },
    { name: "Yellow" },
    { name: "Purple" },
    { name: "Orange" },
    { name: "Gray" },
    { name: "Brown" },
  ];

  // Format sizes based on the enum
  const sizes = [{ name: "SMALL" }, { name: "MEDIUM" }, { name: "LARGE" }];

  // Handle applying filters and closing dialog
  const handleApplyFilters = (filters: ProductSearchFilterRequest) => {
    onApplyFilters(filters);
    onOpenChange(false);
  };

  // Use Dialog for desktop and Sheet for mobile
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center">
              <FilterIcon className="h-5 w-5 mr-2" />
              Filters
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-5rem)] p-4">
            {isCategoriesLoading ? (
              <div className="flex justify-center items-center h-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <AdvancedSearchFilters
                onSearch={handleApplyFilters}
                categories={formattedCategories}
                subcategories={
                  subcategories
                    ? subcategories.map((cat: any) => ({
                        categoryId:
                          cat.id?.toString() ||
                          cat.categoryId?.toString() ||
                          "",
                        name: cat.name,
                      }))
                    : []
                }
                onCategorySelect={setSelectedCategoryId}
                selectedCategoryId={selectedCategoryId}
                colors={colors}
                sizes={sizes}
                isLoading={false}
                initialFilters={currentFilters}
              />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 max-h-[85vh]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center">
            <FilterIcon className="h-5 w-5 mr-2" />
            Filter Products
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(85vh-6rem)] p-4">
          {isCategoriesLoading ? (
            <div className="flex justify-center items-center h-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <AdvancedSearchFilters
              onSearch={handleApplyFilters}
              categories={formattedCategories}
              subcategories={
                subcategories
                  ? subcategories.map((cat: any) => ({
                      categoryId:
                        cat.id?.toString() || cat.categoryId?.toString() || "",
                      name: cat.name,
                    }))
                  : []
              }
              onCategorySelect={setSelectedCategoryId}
              selectedCategoryId={selectedCategoryId}
              colors={colors}
              sizes={sizes}
              isLoading={false}
              initialFilters={currentFilters}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
