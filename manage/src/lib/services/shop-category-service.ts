import apiClient from "@/lib/api-client";

export interface ShopCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class ShopCategoryService {
  async searchCategories(query: string): Promise<ShopCategory[]> {
    try {
      const params = new URLSearchParams();
      if (query) {
        params.append("query", query);
      }
      const response = await apiClient.get<ShopCategory[]>(
        `/shop-categories/search?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error searching shop categories:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to search categories"
      );
    }
  }

  async getAllActiveCategories(): Promise<ShopCategory[]> {
    try {
      const response = await apiClient.get<ShopCategory[]>(
        "/shop-categories"
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch categories"
      );
    }
  }

  async createCategory(name: string, description?: string): Promise<ShopCategory> {
    try {
      const params = new URLSearchParams();
      params.append("name", name);
      if (description) {
        params.append("description", description);
      }
      const response = await apiClient.post<ShopCategory>(
        `/shop-categories?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error creating category:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create category"
      );
    }
  }

  async getCategoryById(id: number): Promise<ShopCategory> {
    try {
      const response = await apiClient.get<ShopCategory>(
        `/shop-categories/${id}`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching category:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch category"
      );
    }
  }
}

export const shopCategoryService = new ShopCategoryService();
