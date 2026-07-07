import { API_ENDPOINTS, publicApiCall } from "./api";

export interface WarehouseDTO {
  id: number;
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  country: string;
  phone?: string;
  email?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  productCount: number;
  shopId?: string;
  shopName?: string;
  createdAt: string;
  updatedAt: string;
  images?: WarehouseImageDTO[];
}

export interface WarehouseImageDTO {
  id: number;
  imageUrl: string;
  isPrimary?: boolean;
  sortOrder?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
}

export interface PaginatedWarehousesResponse {
  content: WarehouseDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export const WarehouseService = {
  /**
   * Get warehouses for a shop (public endpoint, no auth required)
   */
  getWarehousesByShopId: async (
    shopId: string,
    page: number = 0,
    size: number = 10
  ): Promise<PaginatedWarehousesResponse> => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("size", size.toString());
    params.append("sort", "name");

    const url = `${API_ENDPOINTS.WAREHOUSES_PUBLIC_BY_SHOP(shopId)}?${params.toString()}`;
    return publicApiCall<PaginatedWarehousesResponse>(url);
  },
};
