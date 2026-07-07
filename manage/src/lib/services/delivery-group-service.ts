import apiClient from "../api-client";

export interface DeliveryGroupDto {
  deliveryGroupId: number;
  deliveryGroupName: string;
  deliveryGroupDescription: string;
  delivererId: string;
  delivererName: string;
  orderIds: number[];
  memberCount: number;
  createdAt: string;
  scheduledAt?: string;
  hasDeliveryStarted: boolean;
  deliveryStartedAt?: string;
  shopId: string;
  status: string;
}

export interface AgentDto {
  agentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  isAvailable: boolean;
  hasAGroup: boolean;
  activeGroupCount: number;
  lastActiveAt: string;
}

export interface CreateReadyForDeliveryGroupDTO {
  deliveryGroupName: string;
  deliveryGroupDescription?: string;
  delivererId: string;
  shopId: string;
  orderIds?: number[];
}

export interface BulkAddResult {
  totalRequested: number;
  successfullyAdded: number;
  skipped: number;
  skippedOrders: SkippedOrder[];
}

export interface SkippedOrder {
  orderId: number;
  reason: string;
  details: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

class DeliveryGroupService {
  private baseUrl = "/delivery-groups";

  async getAvailableGroups(
    shopId: string,
    page: number = 0,
    size: number = 10,
    search?: string
  ): Promise<PaginatedResponse<DeliveryGroupDto>> {
    const params: any = { shopId, page, size };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const response = await apiClient.get(`${this.baseUrl}/available`, {
      params,
    });
    return response.data;
  }

  async createGroup(
    request: CreateReadyForDeliveryGroupDTO
  ): Promise<DeliveryGroupDto> {
    const response = await apiClient.post(this.baseUrl, request);
    return response.data.data;
  }

  async bulkAddOrdersToGroup(
    groupId: number,
    orderIds: number[]
  ): Promise<BulkAddResult> {
    const response = await apiClient.post(
      `${this.baseUrl}/bulk-add/${groupId}`,
      orderIds
    );
    return response.data.data;
  }

  async removeOrderFromGroup(groupId: number, orderId: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${groupId}/order/${orderId}`);
  }

  async getAvailableAgents(
    shopId: string,
    page: number = 0,
    size: number = 10,
    search?: string
  ): Promise<PaginatedResponse<AgentDto>> {
    const params: any = { shopId, page, size };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const response = await apiClient.get(`${this.baseUrl}/agents`, {
      params,
    });
    return response.data;
  }

  async findGroupByOrder(orderId: number): Promise<DeliveryGroupDto | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/order/${orderId}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async updateGroup(
    groupId: number,
    request: Partial<CreateReadyForDeliveryGroupDTO>
  ): Promise<DeliveryGroupDto> {
    const response = await apiClient.put(`${this.baseUrl}/${groupId}`, request);
    return response.data.data;
  }

  async deleteGroup(groupId: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${groupId}`);
  }

  async startDelivery(groupId: number): Promise<DeliveryGroupDto> {
    const response = await apiClient.put(
      `${this.baseUrl}/${groupId}/start-delivery`
    );
    return response.data.data;
  }

  async changeOrderGroup(
    orderId: number,
    newGroupId: number
  ): Promise<DeliveryGroupDto> {
    const response = await apiClient.put(
      `${this.baseUrl}/order/${orderId}/change-group/${newGroupId}`
    );
    return response.data.data;
  }
}

export const deliveryGroupService = new DeliveryGroupService();
