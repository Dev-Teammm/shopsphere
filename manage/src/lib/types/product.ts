import { UUID } from "crypto";

// Gender enum to match backend
export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  UNISEX = "UNISEX",
}

// Size enum to match backend
export enum Size {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
}

// Product image response
export interface ProductImageResponse {
  imageId: string;
  imageUrl: string;
  isMain: boolean;
  position: number;
}

// Category response
export interface CategoryResponse {
  categoryId: string;
  name: string;
  description: string;
  parentId?: string;
  parentName?: string;
  hasSubcategories: boolean;
  subcategoryCount: number;
  productCount: number;
}

// Rating response
export interface RatingResponse {
  ratingId: string;
  stars: number;
  comment: string;
  productId: string;
  productName: string;
  userId: string;
  username: string;
  userProfilePicture?: string;
  createdAt: string;
  verifiedPurchase: boolean;
}

// Product color response
export interface ProductColorResponse {
  colorId: string;
  colorName: string;
  colorHexCode: string;
}

// Product color for form handling
export interface ProductColor {
  colorId?: string;
  colorName: string;
  colorHexCode: string;
  productId?: string;
}

// Product size response
export interface ProductSizeResponse {
  sizeId: string;
  size: Size;
  stockForSize: number;
}

// Product size for form handling
export interface ProductSize {
  sizeId?: string;
  size: Size;
  stockForSize: number;
  productId?: string;
}

// Product discount response
export interface ProductDiscountResponse {
  discountId: string;
  name: string;
  percentage: number;
  startDate: string;
  endDate: string;
  active: boolean;
  current: boolean;
}

// Main product response
export interface ProductResponse {
  productId: string;
  name: string;
  description: string;
  price: number;
  previousPrice?: number;
  gender: Gender;
  stock: number;
  popular: boolean;
  images: ProductImageResponse[];
  categories: CategoryResponse[];
  mainImage?: string; // URL of the main product image for quick access
  averageRating: number | null;
  ratingCount: number | null;
  topRatings: RatingResponse[];

  // Color and size options
  colors: ProductColorResponse[];
  sizes: ProductSizeResponse[];

  // Discount information
  discounts: ProductDiscountResponse[];
  activeDiscount?: ProductDiscountResponse; // Currently active discount if any
  discountedPrice?: number; // Price after applying the active discount
  onSale: boolean; // True if there's an active discount
}

// Pagination response structure
export interface Page<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

// Product pagination response
export type ProductPaginationResponse = Page<ProductResponse>;

// Advanced search filter request
export interface ProductSearchFilterRequest {
  // Text search
  keyword?: string;

  // Price filters
  minPrice?: number;
  maxPrice?: number;

  // Category filters
  categories?: string[]; // Category names
  categoryIds?: string[];

  // Color filters
  colors?: string[];

  // Size filters
  sizes?: string[];

  // Discount filters
  discountRanges?: string[]; // String format like "1% - 20%", "21% - 40%", etc.

  // Rating filters
  rating?: number; // Single rating value (e.g., 4 means 4+ stars)
  minRating?: number; // For backward compatibility
  maxRating?: number; // For backward compatibility

  // Stock filters
  inStock?: boolean;

  // Special filters
  onSale?: boolean; // Has discount/previous price
  newArrivals?: boolean; // Recently added products
  popular?: boolean; // Products marked as popular

  // Gender filter
  gender?: Gender;

  // Sorting
  sortBy?: string;
  sortDirection?: string;

  // Pagination
  page?: number;
  size?: number;
}

// Backend ManyProductsDto structure
export interface ManyProductsDto {
  productId: string;
  productName: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  category?: {
    id: number;
    name: string;
    description?: string;
    slug: string;
    imageUrl?: string;
  };
  brand?: {
    brandId: string;
    brandName: string;
    description?: string;
    logoUrl?: string;
  };
  isBestSeller?: boolean;
  isFeatured?: boolean;
  discountInfo?: {
    discountId: string;
    name: string;
    percentage: number;
    startDate: string;
    endDate: string;
    active: boolean;
  };
  primaryImage?: {
    id: number;
    imageUrl: string;
    altText?: string;
    title?: string;
    isPrimary: boolean;
    sortOrder: number;
    width?: number;
    height?: number;
    fileSize?: number;
    mimeType?: string;
  };
}

// Backend ProductDTO structure for detailed product view
export interface ProductDTO {
  productId: string;
  name: string;
  description: string;
  sku: string;
  basePrice: number;
  salePrice?: number;
  discountedPrice?: number;
  stockQuantity: number;
  categoryId?: number;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  slug: string;
  isActive: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;

  // Product media
  images?: ProductImageDTO[];
  videos?: ProductVideoDTO[];

  // Product variants
  variants?: ProductVariantDTO[];

  // Warehouse stock information
  warehouseStock?: WarehouseStockDTO[];
  totalWarehouseStock?: number;
  totalWarehouses?: number;

  // Product details
  fullDescription?: string;
  weightKg?: number;

  // Category-specific fields (product-level only; batch-level fields are on StockBatch)
  storageInstructions?: string;
  nutritionalInfo?: string;
}

// Keep ProductDetailDTO for backward compatibility
export interface ProductDetailDTO extends ProductDTO {}

export interface ProductImageDTO {
  imageId: number;
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVideoDTO {
  videoId: number;
  url: string;
  title?: string;
  description?: string;
  sortOrder: number;
  durationSeconds?: number;
}

// Keep ProductImageDetailDTO and ProductVideoDetailDTO for backward compatibility
export interface ProductImageDetailDTO extends ProductImageDTO {}
export interface ProductVideoDetailDTO extends ProductVideoDTO {}

export interface ProductVariantDTO {
  variantId: number;
  variantSku: string;
  variantName?: string;
  price: number;
  salePrice?: number;
  costPrice?: number;
  stockQuantity: number;
  isActive: boolean;
  isInStock: boolean;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;

  // Variant images
  images?: VariantImageDTO[];

  // Variant attributes
  attributes?: VariantAttributeDTO[];
}

// Keep ProductVariantDetailDTO for backward compatibility
export interface ProductVariantDetailDTO extends ProductVariantDTO {}

export interface VariantImageDTO {
  imageId: number;
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface VariantAttributeDTO {
  attributeValueId: number;
  attributeValue: string;
  attributeTypeId: number;
  attributeType: string;
}

export interface WarehouseStockDTO {
  stockId: number;
  warehouseId: number;
  warehouseName: string;
  warehouseAddress: string;
  warehouseCity: string;
  warehouseState: string;
  warehouseCountry: string;
  warehouseContactNumber?: string;
  warehouseEmail?: string;
  quantity: number;
  lowStockThreshold: number;
  isInStock: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
  createdAt: string;
  updatedAt: string;
  variantId?: number;
  variantSku?: string;
  variantName?: string;
  isVariantBased: boolean;
}

// Keep VariantImageDetailDTO and VariantAttributeDetailDTO for backward compatibility
export interface VariantImageDetailDTO extends VariantImageDTO {}
export interface VariantAttributeDetailDTO extends VariantAttributeDTO {}

// Backend ProductSearchDTO structure
export interface ProductSearchDTO {
  // Basic product identifiers
  productId?: string;
  name?: string;
  description?: string;
  sku?: string;
  slug?: string;

  // Price filters
  basePriceMin?: number;
  basePriceMax?: number;
  salePriceMin?: number;
  salePriceMax?: number;
  compareAtPriceMin?: number;
  compareAtPriceMax?: number;

  // Stock filters
  stockQuantityMin?: number;
  stockQuantityMax?: number;
  inStock?: boolean;

  // Category and brand filters
  categoryId?: number;
  categoryIds?: number[];
  includeSubcategories?: boolean;
  brandId?: string;
  brandIds?: string[];

  // Discount filters
  discountId?: string;
  discountIds?: string[];
  discountPercentageMin?: number;
  discountPercentageMax?: number;
  hasDiscount?: boolean;
  isOnSale?: boolean;

  // Feature flags
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;

  // Rating and review filters
  averageRatingMin?: number;
  averageRatingMax?: number;
  reviewCountMin?: number;
  reviewCountMax?: number;

  // Variant filters
  variantCountMin?: number;
  variantCountMax?: number;
  variantAttributes?: string[];

  // Physical attributes
  weightMin?: number;
  weightMax?: number;
  dimensionsMin?: number;
  dimensionsMax?: number;

  // Date filters
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;

  // Creator filter
  createdBy?: string;

  // Pagination and sorting
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;

  // Text search
  searchKeyword?: string;
}

// ManyProductsDto pagination response
export type ManyProductsPaginationResponse = Page<ManyProductsDto>;
