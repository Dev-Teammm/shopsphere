import apiClient from "../api-client";
import { ShopCapability } from "./subscription-service";

export interface PendingOperationsCount {
  pendingOrders: number;
  pendingReturns: number;
  pendingAppeals: number;
  pendingDeliveries: number;
  total: number;
}

export interface CapabilityTransitionDTO {
  id: number;
  shopId: string;
  fromCapability: ShopCapability;
  toCapability: ShopCapability;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  completedAt?: string;
  cancellationReason?: string;
}

const BASE_URL = "/capability-transitions";

export const capabilityTransitionService = {
  getPendingOperations: async (
    shopId: string,
    newCapability: ShopCapability,
  ): Promise<PendingOperationsCount> => {
    const response = await apiClient.get<PendingOperationsCount>(
      `${BASE_URL}/pending-operations/${shopId}`,
      {
        params: { newCapability },
      },
    );
    return response.data;
  },

  requestTransition: async (
    shopId: string,
    newCapability: ShopCapability,
  ): Promise<
    CapabilityTransitionDTO | { message: string; success: boolean }
  > => {
    const response = await apiClient.post(`${BASE_URL}/request`, null, {
      params: { shopId, newCapability },
    });
    return response.data;
  },

  getActiveTransition: async (
    shopId: string,
  ): Promise<
    CapabilityTransitionDTO | { message: string; success: boolean } | null
  > => {
    const response = await apiClient.get(`${BASE_URL}/active/${shopId}`);
    return response.data;
  },

  cancelTransition: async (
    shopId: string,
    reason?: string,
  ): Promise<{ message: string; success: boolean }> => {
    const response = await apiClient.post(
      `${BASE_URL}/cancel/${shopId}`,
      null,
      {
        params: { reason },
      },
    );
    return response.data;
  },
};
