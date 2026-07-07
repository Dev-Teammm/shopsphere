import apiClient from "@/lib/api-client";

export interface DeliveryArea {
  id: number;
  name: string;
  description?: string;
  country: string;
  shopId: string;
  shopName?: string;
  warehouseId: number;
  warehouseName?: string;
  parentId?: number;
  parentName?: string;
  isActive: boolean;
  depth?: number;
  isRoot?: boolean;
  createdAt: string;
  updatedAt: string;
  children?: DeliveryArea[];
  childrenCount?: number;
}

export interface CountryDeliveryAreas {
  country: string;
  hasWarehouse: boolean;
  hasDeliveryAreas: boolean;
  deliversEverywhere: boolean;
  rootAreas: DeliveryArea[];
  totalAreasCount: number;
}

export interface CreateDeliveryAreaRequest {
  name: string;
  description?: string;
  country: string;
  warehouseId: number;
  parentId?: number;
}

export interface UpdateDeliveryAreaRequest {
  name: string;
  description?: string;
  parentId?: number | null;
}

export interface DeliveryAreaFilters {
  searchQuery?: string;
  country?: string;
  warehouseId?: number;
  parentId?: number | null;
  isActive?: boolean;
  rootOnly?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

export interface DeliveryAreasResponse {
  content: DeliveryArea[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

class DeliveryAreaService {
  async getCountriesWithDeliveryAreas(shopId: string): Promise<CountryDeliveryAreas[]> {
    try {
      const response = await apiClient.get<CountryDeliveryAreas[]>(
        `/shops/${shopId}/delivery-areas/countries`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching countries with delivery areas:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch countries with delivery areas"
      );
    }
  }

  async getDeliveryAreas(
    shopId: string,
    filters: DeliveryAreaFilters = {}
  ): Promise<DeliveryAreasResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.searchQuery) params.append("searchQuery", filters.searchQuery);
      if (filters.country) params.append("country", filters.country);
      if (filters.warehouseId) params.append("warehouseId", String(filters.warehouseId));
      if (filters.parentId !== undefined) {
        if (filters.parentId === null) {
          params.append("rootOnly", "true");
        } else {
          params.append("parentId", String(filters.parentId));
        }
      }
      if (filters.isActive !== undefined) params.append("isActive", String(filters.isActive));
      if (filters.rootOnly) params.append("rootOnly", String(filters.rootOnly));
      params.append("page", String(filters.page || 0));
      params.append("size", String(filters.size || 10));
      params.append("sortBy", filters.sortBy || "name");
      params.append("sortDirection", filters.sortDirection || "ASC");

      const response = await apiClient.get<DeliveryAreasResponse>(
        `/shops/${shopId}/delivery-areas?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching delivery areas:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch delivery areas"
      );
    }
  }

  async getDeliveryAreaById(shopId: string, areaId: number): Promise<DeliveryArea> {
    try {
      const response = await apiClient.get<DeliveryArea>(
        `/shops/${shopId}/delivery-areas/${areaId}`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching delivery area:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch delivery area"
      );
    }
  }

  async getDeliveryAreasTreeByCountry(
    shopId: string,
    country: string
  ): Promise<DeliveryArea[]> {
    try {
      const response = await apiClient.get<DeliveryArea[]>(
        `/shops/${shopId}/delivery-areas/countries/${encodeURIComponent(country)}/tree`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching delivery areas tree:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch delivery areas tree"
      );
    }
  }

  async createDeliveryArea(
    shopId: string,
    data: CreateDeliveryAreaRequest
  ): Promise<DeliveryArea> {
    try {
      const response = await apiClient.post<DeliveryArea>(
        `/shops/${shopId}/delivery-areas`,
        data
      );
      return response.data;
    } catch (error: any) {
      console.error("Error creating delivery area:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create delivery area"
      );
    }
  }

  async updateDeliveryArea(
    shopId: string,
    areaId: number,
    data: UpdateDeliveryAreaRequest
  ): Promise<DeliveryArea> {
    try {
      const response = await apiClient.put<DeliveryArea>(
        `/shops/${shopId}/delivery-areas/${areaId}`,
        data
      );
      return response.data;
    } catch (error: any) {
      console.error("Error updating delivery area:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update delivery area"
      );
    }
  }

  async deleteDeliveryArea(shopId: string, areaId: number): Promise<void> {
    try {
      await apiClient.delete(`/shops/${shopId}/delivery-areas/${areaId}`);
    } catch (error: any) {
      console.error("Error deleting delivery area:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete delivery area"
      );
    }
  }
}

export const deliveryAreaService = new DeliveryAreaService();
