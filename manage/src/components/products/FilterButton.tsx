"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterIcon } from "lucide-react";
import { FilterDialog } from './FilterDialog';
import { ProductSearchFilterRequest } from '@/lib/types/product';

interface FilterButtonProps {
  onApplyFilters: (filters: ProductSearchFilterRequest) => void;
  currentFilters: ProductSearchFilterRequest;
}

export function FilterButton({ onApplyFilters, currentFilters }: FilterButtonProps) {
  const [open, setOpen] = useState(false);
  
  // Get active filter count
  const getActiveFilterCount = (): number => {
    let count = 0;
    if (currentFilters.categories?.length) count += currentFilters.categories.length;
    if (currentFilters.categoryIds?.length) count += currentFilters.categoryIds.length;
    if (currentFilters.colors?.length) count += 1;
    if (currentFilters.sizes?.length) count += 1;
    if (currentFilters.discountRanges?.length) count += 1;
    if (currentFilters.rating) count += 1;
    if (currentFilters.gender) count += 1;
    if (currentFilters.inStock) count += 1;
    if (currentFilters.onSale) count += 1;
    if (currentFilters.popular) count += 1;
    if (currentFilters.newArrivals) count += 1;
    if (currentFilters.keyword) count += 1;
    if (currentFilters.minPrice || currentFilters.maxPrice) count += 1;
    return count;
  };
  
  return (
    <>
      <Button 
        variant="outline"
        size="sm"
        className="flex items-center gap-1.5"
        onClick={() => setOpen(true)}
      >
        <FilterIcon className="h-4 w-4" />
        Filters
        {getActiveFilterCount() > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full">
            {getActiveFilterCount()}
          </Badge>
        )}
      </Button>
      
      <FilterDialog
        open={open}
        onOpenChange={setOpen}
        onApplyFilters={onApplyFilters}
        currentFilters={currentFilters}
      />
    </>
  );
} 