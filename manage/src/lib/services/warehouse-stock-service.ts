import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { WarehouseStockDTO } from "@/lib/types/product";

export interface WarehouseStockPageResponse {
  content: WarehouseStockDTO[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface WarehouseStockParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: "asc" | "desc";
}

class WarehouseStockService {
  /**
   * Get warehouse stock information for a product with pagination
   */
  async getProductWarehouseStock(
    productId: string,
    params: WarehouseStockParams = {}
  ): Promise<WarehouseStockPageResponse> {
    try {
      const searchParams = new URLSearchParams();

      if (params.page !== undefined)
        searchParams.append("page", params.page.toString());
      if (params.size !== undefined)
        searchParams.append("size", params.size.toString());
      if (params.sort) searchParams.append("sort", params.sort);
      if (params.direction) searchParams.append("direction", params.direction);

      const queryString = searchParams.toString();
      const url = `${API_ENDPOINTS.PRODUCTS.BASE}/${productId}/warehouse-stock${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching product warehouse stock:", error);
      throw error;
    }
  }

  /**
   * Get warehouse stock information for a specific product variant with pagination
   */
  async getVariantWarehouseStock(
    productId: string,
    variantId: number,
    params: WarehouseStockParams = {}
  ): Promise<WarehouseStockPageResponse> {
    try {
      const searchParams = new URLSearchParams();

      if (params.page !== undefined)
        searchParams.append("page", params.page.toString());
      if (params.size !== undefined)
        searchParams.append("size", params.size.toString());
      if (params.sort) searchParams.append("sort", params.sort);
      if (params.direction) searchParams.append("direction", params.direction);

      const queryString = searchParams.toString();
      const url = `${
        API_ENDPOINTS.PRODUCTS.BASE
      }/${productId}/variants/${variantId}/warehouse-stock${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching variant warehouse stock:", error);
      throw error;
    }
  }
}

export const warehouseStockService = new WarehouseStockService();
