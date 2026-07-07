"use client";

import { useState, useEffect } from 'react';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Search, X, Loader2 } from "lucide-react";
import { ProductSearchFilterRequest, Gender, Size } from '@/lib/types/product';
import { Badge } from '../ui/badge';

// Define prop types
interface AdvancedSearchFiltersProps {
  onSearch: (filters: ProductSearchFilterRequest) => void;
  categories?: { id: string; name: string; hasSubcategories?: boolean }[];
  subcategories?: { categoryId: string; name: string }[];
  onCategorySelect?: (categoryId: string | null) => void;
  selectedCategoryId?: string | null;
  colors?: { name: string }[];
  sizes?: { name: string }[];
  isLoading?: boolean;
  initialFilters?: ProductSearchFilterRequest;
}

// Define discount ranges
const DISCOUNT_RANGES = [
  "1% - 20%",
  "21% - 40%",
  "41% - 60%",
  "Over 60%"
];

// Define rating options
const RATING_OPTIONS = [
  { value: 5, label: "5 Stars & Up" },
  { value: 4, label: "4 Stars & Up" },
  { value: 3, label: "3 Stars & Up" },
  { value: 2, label: "2 Stars & Up" },
  { value: 1, label: "1 Star & Up" }
];

// Define sort options
const SORT_OPTIONS = [
  { value: "name:asc", label: "Name (A-Z)" },
  { value: "name:desc", label: "Name (Z-A)" },
  { value: "price:asc", label: "Price (Low to High)" },
  { value: "price:desc", label: "Price (High to Low)" },
  { value: "createdAt:desc", label: "Newest First" },
  { value: "averageRating:desc", label: "Best Rating" }
];

export function AdvancedSearchFilters({
  onSearch,
  categories = [],
  subcategories = [],
  onCategorySelect,
  selectedCategoryId,
  colors = [],
  sizes = [],
  isLoading = false,
  initialFilters,
}: AdvancedSearchFiltersProps) {
  // Initialize filter state
  const [filters, setFilters] = useState<ProductSearchFilterRequest>(
    initialFilters || {
      page: 0,
      size: 10,
      sortBy: "name",
      sortDirection: "asc"
    }
  );

  // Price range state
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice?.valueOf() || 0,
    filters.maxPrice?.valueOf() || 1000
  ]);
  
  // Selected options for display
  const [selectedCategories, setSelectedCategories] = useState<string[]>(filters.categories || []);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(filters.categoryIds?.map(String) || []);
  const [selectedColors, setSelectedColors] = useState<string[]>(filters.colors || []);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(filters.sizes || []);
  const [selectedDiscountRanges, setSelectedDiscountRanges] = useState<string[]>(filters.discountRanges || []);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Handle input changes
  const handleInputChange = (field: keyof ProductSearchFilterRequest, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Handle price range changes
  const handlePriceChange = (values: number[]) => {
    setPriceRange([values[0], values[1]]);
    handleInputChange('minPrice', values[0]);
    handleInputChange('maxPrice', values[1]);
  };

  // Handle category changes
  const handleCategoryChange = (categoryId: string, categoryName: string, checked: boolean, hasSubcategories?: boolean) => {
    // Update selected category IDs for API
    setSelectedCategoryIds(prev => 
      checked 
        ? [...prev, categoryId]
        : prev.filter(id => id !== categoryId)
    );
    
    // Update selected category names for display
    setSelectedCategories(prev => 
      checked 
        ? [...prev, categoryName]
        : prev.filter(name => name !== categoryName)
    );
    
    // If this category has subcategories and was just checked, expand it and fetch subcategories
    if (checked && hasSubcategories && onCategorySelect) {
      setExpandedCategories(prev => [...prev, categoryId]);
      onCategorySelect(categoryId);
    }
  };

  // Handle subcategory changes
  const handleSubcategoryChange = (categoryId: string, categoryName: string, checked: boolean) => {
    // Update selected category IDs for API
    setSelectedCategoryIds(prev => 
      checked 
        ? [...prev, categoryId]
        : prev.filter(id => id !== categoryId)
    );
    
    // Update selected category names for display
    setSelectedCategories(prev => 
      checked 
        ? [...prev, categoryName]
        : prev.filter(name => name !== categoryName)
    );
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId: string) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(prev => prev.filter(id => id !== categoryId));
    } else {
      setExpandedCategories(prev => [...prev, categoryId]);
      if (onCategorySelect) {
        onCategorySelect(categoryId);
      }
    }
  };

  // Handle color changes
  const handleColorChange = (colorName: string, checked: boolean) => {
    setSelectedColors(prev => 
      checked 
        ? [...prev, colorName]
        : prev.filter(c => c !== colorName)
    );
  };

  // Handle size changes
  const handleSizeChange = (sizeName: string, checked: boolean) => {
    setSelectedSizes(prev => 
      checked 
        ? [...prev, sizeName]
        : prev.filter(s => s !== sizeName)
    );
  };

  // Handle discount range changes
  const handleDiscountChange = (range: string, checked: boolean) => {
    setSelectedDiscountRanges(prev => 
      checked 
        ? [...prev, range]
        : prev.filter(r => r !== range)
    );
  };

  // Handle sort option change
  const handleSortChange = (value: string) => {
    const [sortBy, sortDirection] = value.split(':');
    handleInputChange('sortBy', sortBy);
    handleInputChange('sortDirection', sortDirection);
  };

  // Update filters when selections change
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds.map(id => id as any) : undefined,
      colors: selectedColors.length > 0 ? selectedColors : undefined,
      sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
      discountRanges: selectedDiscountRanges.length > 0 ? selectedDiscountRanges : undefined
    }));
  }, [selectedCategories, selectedCategoryIds, selectedColors, selectedSizes, selectedDiscountRanges]);

  // Apply search filters
  const applyFilters = () => {
    onSearch(filters);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      page: 0,
      size: 10,
      sortBy: "name",
      sortDirection: "asc"
    });
    setPriceRange([0, 1000]);
    setSelectedCategories([]);
    setSelectedCategoryIds([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedDiscountRanges([]);
    setExpandedCategories([]);
    if (onCategorySelect) {
      onCategorySelect(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Keyword Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products..."
            value={filters.keyword || ''}
            onChange={(e) => handleInputChange('keyword', e.target.value)}
            className="pl-9 border-primary/20 focus-visible:ring-primary"
          />
        </div>
        
        <Select 
          value={`${filters.sortBy || 'name'}:${filters.sortDirection || 'asc'}`}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-[180px] border-primary/20 focus-visible:ring-primary">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active filters */}
      {(selectedCategories.length > 0 || 
       selectedColors.length > 0 || 
       selectedSizes.length > 0 || 
       selectedDiscountRanges.length > 0 || 
       filters.inStock || 
       filters.onSale || 
       filters.popular ||
       filters.gender ||
       filters.rating) && (
        <div className="flex flex-wrap gap-2 items-center pt-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          
          {selectedCategories.map(category => (
            <Badge key={category} variant="outline" className="flex items-center gap-1">
              {category}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  setSelectedCategories(prev => prev.filter(c => c !== category));
                  // Find and remove the corresponding ID
                  const categoryObj = categories.find(c => c.name === category);
                  if (categoryObj) {
                    setSelectedCategoryIds(prev => prev.filter(id => id !== categoryObj.id));
                  }
                }}
              />
            </Badge>
          ))}
          
          {selectedColors.map(color => (
            <Badge key={color} variant="outline" className="flex items-center gap-1">
              {color}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleColorChange(color, false)}
              />
            </Badge>
          ))}
          
          {selectedSizes.map(size => (
            <Badge key={size} variant="outline" className="flex items-center gap-1">
              {size}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleSizeChange(size, false)}
              />
            </Badge>
          ))}
          
          {selectedDiscountRanges.map(range => (
            <Badge key={range} variant="outline" className="flex items-center gap-1">
              {range}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleDiscountChange(range, false)}
              />
            </Badge>
          ))}
          
          {filters.rating && (
            <Badge variant="outline" className="flex items-center gap-1">
              {filters.rating}+ Stars
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleInputChange('rating', undefined)}
              />
            </Badge>
          )}
          
          {filters.gender && (
            <Badge variant="outline" className="flex items-center gap-1">
              {filters.gender}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleInputChange('gender', undefined)}
              />
            </Badge>
          )}
          
          {filters.inStock && (
            <Badge variant="outline" className="flex items-center gap-1">
              In Stock
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleInputChange('inStock', undefined)}
              />
            </Badge>
          )}
          
          {filters.onSale && (
            <Badge variant="outline" className="flex items-center gap-1">
              On Sale
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleInputChange('onSale', undefined)}
              />
            </Badge>
          )}
          
          {filters.popular && (
            <Badge variant="outline" className="flex items-center gap-1">
              Popular
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleInputChange('popular', undefined)}
              />
            </Badge>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground h-7"
            onClick={resetFilters}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Detailed Filters */}
      <Accordion type="multiple" className="w-full">
        {/* Categories */}
        <AccordionItem value="categories" className="border-primary/10">
          <AccordionTrigger className="py-3 text-sm hover:no-underline">
            Categories
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <div className="space-y-1 max-h-60 overflow-y-auto pr-2">
              {categories.length > 0 ? (
                categories.map((category) => (
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`category-${category.id}`}
                        checked={selectedCategoryIds.includes(category.id)}
                        onCheckedChange={(checked) => 
                          handleCategoryChange(category.id, category.name, checked === true, category.hasSubcategories)
                        }
                      />
                      <div className="flex items-center flex-1">
                        <Label
                          htmlFor={`category-${category.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {category.name}
                        </Label>
                        
                        {category.hasSubcategories && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-6 w-6 ml-1"
                            onClick={() => toggleCategoryExpansion(category.id)}
                          >
                            {expandedCategories.includes(category.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Subcategories */}
                    {expandedCategories.includes(category.id) && (
                      <div className="pl-6 ml-2 border-l border-border/30 space-y-1">
                        {selectedCategoryId === category.id && subcategories.length === 0 && (
                          <div className="flex items-center ml-2 py-2">
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mr-2" />
                            <span className="text-xs text-muted-foreground">Loading...</span>
                          </div>
                        )}
                        
                        {subcategories
                          .filter(sub => selectedCategoryId === category.id)
                          .map(subcategory => (
                            <div key={subcategory.categoryId} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`subcategory-${subcategory.categoryId}`}
                                checked={selectedCategoryIds.includes(subcategory.categoryId)}
                                onCheckedChange={(checked) => 
                                  handleSubcategoryChange(subcategory.categoryId, subcategory.name, checked === true)
                                }
                              />
                              <Label
                                htmlFor={`subcategory-${subcategory.categoryId}`}
                                className="text-sm cursor-pointer"
                              >
                                {subcategory.name}
                              </Label>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No categories available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Price Range */}
        <AccordionItem value="price" className="border-primary/10">
          <AccordionTrigger className="py-3 text-sm hover:no-underline">
            Price Range
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <div className="space-y-4">
              <div className="pt-2 px-1">
                <Slider
                  value={priceRange}
                  min={0}
                  max={1000}
                  step={10}
                  onValueChange={handlePriceChange}
                  className="[&>span]:bg-primary"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="min-price" className="text-xs">Min</Label>
                  <Input
                    id="min-price"
                    value={priceRange[0]}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      handlePriceChange([value, priceRange[1]]);
                    }}
                    className="h-8 w-20 mt-1"
                  />
                </div>
                <div className="text-center text-muted-foreground">-</div>
                <div>
                  <Label htmlFor="max-price" className="text-xs">Max</Label>
                  <Input
                    id="max-price"
                    value={priceRange[1]}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      handlePriceChange([priceRange[0], value]);
                    }}
                    className="h-8 w-20 mt-1"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Colors */}
        <AccordionItem value="colors" className="border-primary/10">
          <AccordionTrigger className="py-3 text-sm hover:no-underline">
            Colors
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {colors.length > 0 ? (
                colors.map((color) => (
                  <div key={color.name} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`color-${color.name}`}
                      checked={selectedColors.includes(color.name)}
                      onCheckedChange={(checked) => 
                        handleColorChange(color.name, checked === true)
                      }
                    />
                    <Label
                      htmlFor={`color-${color.name}`}
                      className="text-sm cursor-pointer"
                    >
                      {color.name}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No colors available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Sizes */}
        <AccordionItem value="sizes" className="border-primary/10">
          <AccordionTrigger className="py-3 text-sm hover:no-underline">
            Sizes
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <div className="space-y-2">
              {sizes.length > 0 ? (
                sizes.map((size) => (
                  <div key={size.name} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`size-${size.name}`}
                      checked={selectedSizes.includes(size.name)}
                      onCheckedChange={(checked) => 
                        handleSizeChange(size.name, checked === true)
                      }
                    />
                    <Label
                      htmlFor={`size-${size.name}`}
                      className="text-sm cursor-pointer"
                    >
                      {size.name}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No sizes available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Gender */}
        <AccordionItem value="gender" className="border-primary/10">
          <AccordionTrigger className="py-3 text-sm hover:no-underline">
            Gender
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <Select
              value={filters.gender}
              onValueChange={(value) => handleInputChange('gender', value)}
            >
              <SelectTrigger className="border-primary/20 focus-visible:ring-primary">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={undefined as any}>Any</SelectItem>
                <SelectItem value={Gender.MALE}>{Gender.MALE}</SelectItem>
                <SelectItem value={Gender.FEMALE}>{Gender.FEMALE}</SelectItem>
                <SelectItem value={Gender.UNISEX}>{Gender.UNISEX}</SelectItem>
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>
        
        {/* Discount */}
        <AccordionItem value="discount" className="border-primary/10">
          <AccordionTrigger className="py-3 text-sm hover:no-underline">
            Discount
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <div className="space-y-2">
              {DISCOUNT_RANGES.map((range) => (
                <div key={range} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`discount-${range}`}
                    checked={selectedDiscountRanges.includes(range)}
                    onCheckedChange={(checked) => 
                      handleDiscountChange(range, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`discount-${range}`}
                    className="text-sm cursor-pointer"
                  >
                    {range}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Rating */}
        <AccordionItem value="rating" className="border-primary/10">
          <AccordionTrigger className="py-3 text-sm hover:no-underline">
            Rating
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <div className="space-y-2">
              {RATING_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`rating-${option.value}`}
                    checked={filters.rating === option.value}
                    onCheckedChange={(checked) => 
                      handleInputChange('rating', checked === true ? option.value : undefined)
                    }
                  />
                  <Label
                    htmlFor={`rating-${option.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Special Filters */}
        <AccordionItem value="special" className="border-primary/10">
          <AccordionTrigger className="py-3 text-sm hover:no-underline">
            Special Filters
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="in-stock"
                  checked={filters.inStock === true}
                  onCheckedChange={(checked) => 
                    handleInputChange('inStock', checked === true ? true : undefined)
                  }
                />
                <Label
                  htmlFor="in-stock"
                  className="text-sm cursor-pointer"
                >
                  In Stock Only
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="on-sale"
                  checked={filters.onSale === true}
                  onCheckedChange={(checked) => 
                    handleInputChange('onSale', checked === true ? true : undefined)
                  }
                />
                <Label
                  htmlFor="on-sale"
                  className="text-sm cursor-pointer"
                >
                  On Sale
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="popular"
                  checked={filters.popular === true}
                  onCheckedChange={(checked) => 
                    handleInputChange('popular', checked === true ? true : undefined)
                  }
                />
                <Label
                  htmlFor="popular"
                  className="text-sm cursor-pointer"
                >
                  Popular Items
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="new-arrivals"
                  checked={filters.newArrivals === true}
                  onCheckedChange={(checked) => 
                    handleInputChange('newArrivals', checked === true ? true : undefined)
                  }
                />
                <Label
                  htmlFor="new-arrivals"
                  className="text-sm cursor-pointer"
                >
                  New Arrivals
                </Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Apply Filters */}
      <div className="flex items-center space-x-2 pt-4">
        <Button
          onClick={applyFilters}
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90"
        >
          {isLoading ? "Searching..." : "Apply Filters"}
        </Button>
        <Button
          variant="outline"
          onClick={resetFilters}
          disabled={isLoading}
        >
          Reset
        </Button>
      </div>
    </div>
  );
} 