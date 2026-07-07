import apiClient from "../api-client";

export interface ShippingCostDTO {
  id: number;
  name: string;
  description?: string;
  distanceKmCost?: number;
  weightKgCost?: number;
  baseFee?: number;
  internationalFee?: number;
  freeShippingThreshold?: number;
  isActive: boolean;
  shopId?: string;
  shopName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShippingCostDTO {
  name: string;
  description?: string;
  distanceKmCost?: number;
  weightKgCost?: number;
  baseFee?: number;
  internationalFee?: number;
  freeShippingThreshold?: number;
  isActive: boolean;
  shopId: string;
}

export interface UpdateShippingCostDTO {
  name?: string;
  description?: string;
  distanceKmCost?: number;
  weightKgCost?: number;
  baseFee?: number;
  internationalFee?: number;
  freeShippingThreshold?: number;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
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

export interface CalculateShippingCostRequest {
  weight?: number;
  distance?: number;
  orderValue?: number;
  shopId: string;
}

export interface CalculateOrderShippingRequest {
  deliveryAddress: {
    streetAddress: string;
    city: string;
    country: string;
  };
  items: Array<{
    productId: string;
    variantId?: number;
    quantity: number;
    weight?: number;
  }>;
  orderValue: number;
  shopId: string;
}

class ShippingCostService {
  private baseUrl = "/shipping-costs";

  async getAllShippingCosts(
    page: number = 0,
    size: number = 10,
    shopId: string,
    sort?: string
  ): Promise<PaginatedResponse<ShippingCostDTO>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      shopId,
    });

    if (sort) {
      params.append("sort", sort);
    }

    const response = await apiClient.get(`${this.baseUrl}?${params}`);
    return response.data;
  }

  async getActiveShippingCosts(shopId: string): Promise<ShippingCostDTO[]> {
    const params = new URLSearchParams({ shopId });
    const response = await apiClient.get(`${this.baseUrl}/active?${params}`);
    return response.data;
  }

  async getShippingCostById(id: number, shopId: string): Promise<ShippingCostDTO> {
    const params = new URLSearchParams({ shopId });
    const response = await apiClient.get(`${this.baseUrl}/${id}?${params}`);
    return response.data;
  }

  async createShippingCost(
    data: CreateShippingCostDTO
  ): Promise<ShippingCostDTO> {
    const response = await apiClient.post(this.baseUrl, data);
    return response.data;
  }

  async updateShippingCost(
    id: number,
    data: UpdateShippingCostDTO,
    shopId: string
  ): Promise<ShippingCostDTO> {
    const params = new URLSearchParams({ shopId });
    const response = await apiClient.put(`${this.baseUrl}/${id}?${params}`, data);
    return response.data;
  }

  async deleteShippingCost(id: number, shopId: string): Promise<void> {
    const params = new URLSearchParams({ shopId });
    await apiClient.delete(`${this.baseUrl}/${id}?${params}`);
  }

  async searchShippingCosts(
    name: string,
    page: number = 0,
    size: number = 10,
    shopId: string
  ): Promise<PaginatedResponse<ShippingCostDTO>> {
    const params = new URLSearchParams({
      name,
      page: page.toString(),
      size: size.toString(),
      shopId,
    });

    const response = await apiClient.get(`${this.baseUrl}/search?${params}`);
    return response.data;
  }

  async calculateShippingCost(
    request: CalculateShippingCostRequest
  ): Promise<number> {
    const params = new URLSearchParams();

    params.append("shopId", request.shopId);
    if (request.weight !== undefined) {
      params.append("weight", request.weight.toString());
    }
    if (request.distance !== undefined) {
      params.append("distance", request.distance.toString());
    }
    if (request.orderValue !== undefined) {
      params.append("orderValue", request.orderValue.toString());
    }

    const response = await apiClient.get(`${this.baseUrl}/calculate?${params}`);
    return response.data;
  }

  async toggleShippingCostStatus(id: number, shopId: string): Promise<ShippingCostDTO> {
    const params = new URLSearchParams({ shopId });
    const response = await apiClient.put(`${this.baseUrl}/${id}/toggle?${params}`);
    return response.data;
  }

  async calculateOrderShippingCost(
    request: CalculateOrderShippingRequest
  ): Promise<number> {
    const response = await apiClient.post(
      `${this.baseUrl}/calculate-order`,
      request
    );
    return response.data;
  }
}

export const shippingCostService = new ShippingCostService();
