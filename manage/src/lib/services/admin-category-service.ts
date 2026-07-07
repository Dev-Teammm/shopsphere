import apiClient from "../api-client";
import { handleApiError } from "../utils/error-handler";
import {
  CategoryResponse,
  CategoryCreateRequest,
  CategoryUpdateRequest,
  CategorySearchDTO,
  CategoryPageResponse,
} from "../types/category";

class AdminCategoryService {
  /**
   * Get all categories with pagination
   */
  async getAllCategories(
    page: number = 0,
    size: number = 10,
    sortBy: string = "name",
    sortDir: string = "asc",
    shopId?: string
  ): Promise<CategoryPageResponse> {
    try {
      const params: any = { page, size, sortBy, sortDir };
      if (shopId) {
        params.shopId = shopId;
      }
      const response = await apiClient.get(`/categories`, { params });
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
   * Get subcategories of a specific category
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
   * Get category by ID
   */
  async getCategoryById(categoryId: number): Promise<CategoryResponse> {
    try {
      const response = await apiClient.get(`/categories/${categoryId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Search categories
   */
  async searchCategories(
    searchDTO: CategorySearchDTO
  ): Promise<CategoryPageResponse> {
    try {
      const response = await apiClient.post(`/categories/search`, searchDTO);
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
      console.log("[AdminCategoryService] Creating category with data:", JSON.stringify(categoryData, null, 2));
      console.log("[AdminCategoryService] shopId in payload:", categoryData.shopId);
      const response = await apiClient.post(`/categories`, categoryData);
      return response.data;
    } catch (error) {
      console.error("[AdminCategoryService] Error creating category:", error);
      throw handleApiError(error);
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    categoryId: number,
    categoryData: CategoryUpdateRequest
  ): Promise<CategoryResponse> {
    try {
      const response = await apiClient.put(
        `/categories/${categoryId}`,
        categoryData
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: number): Promise<void> {
    try {
      await apiClient.delete(`/categories/${categoryId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const adminCategoryService = new AdminCategoryService();
