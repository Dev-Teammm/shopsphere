import apiClient from "../api-client";
import { CategoryResponse } from "../types/category";
import { handleApiError } from "../utils/error-handler";

export interface CategoryCreateRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  sortOrder?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  sortOrder?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export interface CategoryPageResponse {
  content: CategoryResponse[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

class CategoryService {
  /**
   * Get all categories with pagination
   */
  async getAllCategories(
    page: number = 0,
    size: number = 10,
    sortBy: string = "name",
    sortDir: string = "asc"
  ): Promise<CategoryPageResponse> {
    try {
      const response = await apiClient.get(`/categories`, {
        params: { page, size, sortBy, sortDir },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get subcategories for a specific category
   */
  async getSubcategories(parentId: number): Promise<CategoryResponse[]> {
    try {
      const response = await apiClient.get(
        `/categories/sub-categories/${parentId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get top-level categories
   */
  async getTopLevelCategories(): Promise<CategoryResponse[]> {
    try {
      const response = await apiClient.get(`/categories/top-level`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Search categories with criteria
   */
  async searchCategories(searchDTO: any): Promise<CategoryPageResponse> {
    try {
      const response = await apiClient.post(`/categories/search`, searchDTO);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<CategoryResponse> {
    try {
      const response = await apiClient.get(`/categories/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Create a new category
   */
  async createCategory(
    categoryData: CategoryCreateRequest
  ): Promise<CategoryResponse> {
    try {
      const response = await apiClient.post(`/categories`, categoryData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    id: number,
    categoryData: CategoryUpdateRequest
  ): Promise<CategoryResponse> {
    try {
      const response = await apiClient.put(`/categories/${id}`, categoryData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number): Promise<void> {
    try {
      await apiClient.delete(`/categories/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get all categories for dropdown (non-paginated, limited to 1000)
   */
  async getAllCategoriesForDropdown(): Promise<CategoryResponse[]> {
    try {
      const response = await apiClient.get(`/categories`, {
        params: { page: 0, size: 1000, sortBy: "name", sortDir: "asc" },
      });
      return response.data.content;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const categoryService = new CategoryService();
