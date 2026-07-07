import apiClient from "../api-client";
import { handleApiError } from "../utils/error-handler";

export interface DeliveryGroupDTO {
  deliveryGroupId: number;
  deliveryGroupName: string;
  deliveryGroupDescription?: string;
  delivererId?: string;
  delivererName?: string;
  delivererEmail?: string;
  orderIds?: string[];
  orderCount: number;
  createdAt: string;
  scheduledAt?: string;
  hasDeliveryStarted: boolean;
  deliveryStartedAt?: string;
  hasDeliveryFinished?: boolean;
  deliveryFinishedAt?: string;
}

export interface DeliveryGroupPaginationResponse {
  content: DeliveryGroupDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

class DeliveryGroupsService {
  /**
   * Get all delivery groups with pagination, sorting, and optional search
   * Uses the new /admin/all endpoint that returns ALL groups without exclusions
   * (includes started, finished, and pending groups)
   */
  async getAllGroups(
    shopId: string,
    page: number = 0,
    size: number = 10,
    sortBy: string = "createdAt",
    sortDirection: string = "desc",
    search?: string
  ): Promise<DeliveryGroupPaginationResponse> {
    try {
      const params: any = {
        shopId,
        page,
        size,
        sort: `${sortBy},${sortDirection}`,
      };

      // Add search parameter if provided
      if (search && search.trim()) {
        params.search = search.trim();
      }

      const response = await apiClient.get<ApiResponse<DeliveryGroupDTO[]>>(
        `/delivery-groups/admin/all`,
        { params }
      );

      return {
        content: response.data.data,
        totalElements: response.data.pagination?.totalElements || 0,
        totalPages: response.data.pagination?.totalPages || 0,
        size: response.data.pagination?.size || size,
        number: response.data.pagination?.page || page,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get delivery group by ID
   */
  async getGroupById(groupId: number): Promise<DeliveryGroupDTO> {
    try {
      const response = await apiClient.get<ApiResponse<DeliveryGroupDTO>>(
        `/delivery-groups/${groupId}`
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get orders for a specific delivery group with pagination
   */
  async getOrdersForGroup(
    groupId: number,
    page: number = 0,
    size: number = 10,
    sortBy: string = "createdAt",
    sortDirection: string = "desc"
  ): Promise<{
    content: any[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  }> {
    try {
      const params: any = {
        page,
        size,
        sort: `${sortBy},${sortDirection}`,
      };

      const response = await apiClient.get<ApiResponse<any[]>>(
        `/delivery-groups/${groupId}/orders`,
        { params }
      );

      return {
        content: response.data.data,
        totalElements: response.data.pagination?.totalElements || 0,
        totalPages: response.data.pagination?.totalPages || 0,
        size: response.data.pagination?.size || size,
        number: response.data.pagination?.page || page,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get all groups without pagination
   */
  async getAllGroupsWithoutPagination(
    shopId: string
  ): Promise<DeliveryGroupDTO[]> {
    try {
      const response = await apiClient.get<ApiResponse<DeliveryGroupDTO[]>>(
        `/delivery-groups/all`,
        { params: { shopId } }
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const deliveryGroupsService = new DeliveryGroupsService();
