import { API_ENDPOINTS, publicApiCall } from "./api";

export interface DeliveryAreaDTO {
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
  children?: DeliveryAreaDTO[];
  childrenCount?: number;
}

export interface PaginatedDeliveryAreasResponse {
  content: DeliveryAreaDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export const DeliveryAreaService = {
  /**
   * Get delivery areas for a shop (public endpoint, no auth required)
   */
  getDeliveryAreasByShopId: async (
    shopId: string,
    page: number = 0,
    size: number = 10
  ): Promise<PaginatedDeliveryAreasResponse> => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("size", size.toString());
    params.append("sortBy", "name");
    params.append("sortDirection", "ASC");

    const url = `${API_ENDPOINTS.DELIVERY_AREAS_PUBLIC_BY_SHOP(shopId)}?${params.toString()}`;
    return publicApiCall<PaginatedDeliveryAreasResponse>(url);
  },
};
