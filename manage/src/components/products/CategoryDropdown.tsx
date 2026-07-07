"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { X, Search, ChevronDown, Loader2 } from "lucide-react";
import { categoryService } from "@/lib/services/category-service";
import { CategoryResponse } from "@/lib/types/category";

interface CategoryDropdownProps {
  value?: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
}

export function CategoryDropdown({
  value,
  onValueChange,
  placeholder = "Select Category",
  label = "Category",
  required = false,
  error,
}: CategoryDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const pageSize = 5;

  const {
    data: categoriesData,
    isLoading,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: ["categories", currentPage, pageSize, "name", "asc"],
    queryFn: () =>
      categoryService.getAllCategories(currentPage, pageSize, "name", "asc"),
    enabled: isOpen,
  });

  const {
    data: searchData,
    isLoading: isSearching,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ["categories-search", searchQuery],
    queryFn: () =>
      categoryService.searchCategories({
        name: searchQuery,
        page: 0,
        size: 100, // Get more results for search
      }),
    enabled: searchQuery.length > 0 && isOpen,
  });

  const categories =
    searchQuery.length > 0
      ? searchData?.content || []
      : categoriesData?.content || [];
  const totalPages =
    searchQuery.length > 0
      ? searchData?.totalPages || 0
      : categoriesData?.totalPages || 0;

  // Get selected category name - we need to fetch it separately if not in current page
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryResponse | null>(null);

  // Fetch selected category details when value changes
  useEffect(() => {
    if (value) {
      // First check if it's in current categories
      const categoryInCurrentPage = categories.find((cat) => cat.id === value);
      if (categoryInCurrentPage) {
        setSelectedCategory(categoryInCurrentPage);
      } else {
        // If not in current page, fetch it separately
        categoryService
          .getCategoryById(value)
          .then((category) => {
            setSelectedCategory(category);
          })
          .catch((error) => {
            console.error("Error fetching category by ID", error);
            setSelectedCategory(null);
          });
      }
    } else {
      setSelectedCategory(null);
    }
  }, [value]);

  // Handle when categories are loaded and we need to find the selected category
  useEffect(() => {
    if (value && categories.length > 0 && !selectedCategory) {
      const categoryInCurrentPage = categories.find((cat) => cat.id === value);
      if (categoryInCurrentPage) {
        setSelectedCategory(categoryInCurrentPage);
      }
    }
  }, [categories, value, selectedCategory]);

  // Handle search
  useEffect(() => {
    if (searchQuery.length > 0) {
      refetchSearch();
    }
  }, [searchQuery, refetchSearch]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleCategorySelect = (categoryId: number) => {
    onValueChange(categoryId);
    setIsOpen(false);
    setSearchQuery("");
    setCurrentPage(0);
  };

  const handleClearSelection = () => {
    onValueChange(0);
    setSearchQuery("");
    setCurrentPage(0);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 3;

    let startPage = Math.max(0, currentPage - 1);
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className="h-6 px-2 text-xs"
        >
          {i + 1}
        </Button>
      );
    }

    return (
      <div className="flex items-center justify-center gap-1 mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="h-6 px-2 text-xs"
        >
          ←
        </Button>
        {pages}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="h-6 px-2 text-xs"
        >
          →
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between border-primary/20 focus-visible:ring-primary"
          >
            {selectedCategory ? selectedCategory.name : placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {isLoading || isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading categories...
                </span>
              </div>
            ) : isError ? (
              <div className="p-4 text-center text-sm text-destructive">
                Failed to load categories
              </div>
            ) : categories.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? "No categories found"
                  : "No categories available"}
              </div>
            ) : (
              <>
                <div className="p-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded-lg cursor-pointer"
                      onClick={() => handleCategorySelect(category.id)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{category.name}</span>
                        {category.description && (
                          <span className="text-xs text-muted-foreground">
                            {category.description}
                          </span>
                        )}
                      </div>
                      {category.id === value && (
                        <Badge variant="secondary" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {!searchQuery && renderPagination()}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected category badge */}
      {selectedCategory && (
        <div className="flex items-center gap-2 mt-2">
          <Badge
            variant="secondary"
            className="pl-2 pr-1 py-1 flex items-center gap-1"
          >
            {selectedCategory.name}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-4 w-4 rounded-full"
              onClick={handleClearSelection}
            >
              <X className="w-3 h-3" />
            </Button>
          </Badge>
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
