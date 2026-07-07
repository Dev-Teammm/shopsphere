import apiClient from "../api-client";
import { handleApiError } from "../utils/error-handler";

export interface DiscountDTO {
  discountId: string;
  name: string;
  description?: string;
  percentage: number;
  discountCode?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
  discountType: string;
  createdAt: string;
  updatedAt: string;
  isValid: boolean;
  canBeUsed: boolean;
  shopId?: string;
  shopName?: string;
}

export interface CreateDiscountDTO {
  name: string;
  description?: string;
  percentage: number;
  discountCode?: string;
  startDate: string;
  endDate?: string;
  isActive?: boolean;
  usageLimit?: number;
  discountType?: string;
  shopId: string;
}

export interface UpdateDiscountDTO {
  name?: string;
  description?: string;
  percentage?: number;
  discountCode?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  usageLimit?: number;
  discountType?: string;
}

export interface DiscountPaginationResponse {
  content: DiscountDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

class DiscountService {
  /**
   * Get all discounts with pagination
   */
  async getAllDiscounts(
    shopId: string,
    page: number = 0,
    size: number = 10,
    sortBy: string = "createdAt",
    sortDirection: string = "desc",
    activeOnly: boolean = false
  ): Promise<DiscountPaginationResponse> {
    try {
      const response = await apiClient.get(`/discounts`, {
        params: { shopId, page, size, sortBy, sortDirection, activeOnly },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get discount by ID
   */
  async getDiscountById(discountId: string, shopId: string): Promise<DiscountDTO> {
    try {
      const response = await apiClient.get(`/discounts/${discountId}`, {
        params: { shopId },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get discount by code
   */
  async getDiscountByCode(discountCode: string, shopId: string): Promise<DiscountDTO> {
    try {
      const response = await apiClient.get(
        `/discounts/code/${discountCode}`,
        {
          params: { shopId },
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get products and variants by discount ID
   */
  async getProductsByDiscount(discountId: string, shopId: string): Promise<{
    products: any[];
    variants: any[];
    totalProducts: number;
    totalVariants: number;
  }> {
    try {
      const response = await apiClient.get(
        `/discounts/${discountId}/products`,
        {
          params: { shopId },
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Create a new discount
   */
  async createDiscount(discountData: CreateDiscountDTO): Promise<DiscountDTO> {
    try {
      const response = await apiClient.post(`/discounts`, discountData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update an existing discount
   */
  async updateDiscount(
    discountId: string,
    shopId: string,
    discountData: UpdateDiscountDTO
  ): Promise<DiscountDTO> {
    try {
      const response = await apiClient.put(
        `/discounts/${discountId}?shopId=${shopId}`,
        discountData
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Delete a discount
   */
  async deleteDiscount(
    discountId: string,
    shopId: string
  ): Promise<{ message: string; discountId: string }> {
    try {
      const response = await apiClient.delete(
        `/discounts/${discountId}?shopId=${shopId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Check if discount is valid
   */
  async isDiscountValid(
    discountId: string,
    shopId: string
  ): Promise<{ discountId: string; isValid: boolean }> {
    try {
      const response = await apiClient.get(`/discounts/${discountId}/valid`, {
        params: { shopId },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Check if discount code is valid
   */
  async isDiscountCodeValid(
    discountCode: string,
    shopId: string
  ): Promise<{ discountCode: string; isValid: boolean }> {
    try {
      const response = await apiClient.get(
        `/discounts/code/${discountCode}/valid`,
        {
          params: { shopId },
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const discountService = new DiscountService();
