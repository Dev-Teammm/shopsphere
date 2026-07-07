// Response types - matching Java DTOs exactly
export interface CategoryResponse {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  slug: string | null;
  parentId: number | null;
  parentName: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  children: CategoryResponse[];
  level: number;
}

// Request types - matching Java DTOs exactly
export interface CategoryCreateRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  shopId?: string;
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

// Search DTO - matching backend CategorySearchDTO
export interface CategorySearchDTO {
  name?: string;
  description?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  slug?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

// Pagination response - matching Spring Data Page
export interface CategoryPageResponse {
  content: CategoryResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

// Type for pagination params
export interface CategoryPaginationParams {
  page: number;
  size: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}
