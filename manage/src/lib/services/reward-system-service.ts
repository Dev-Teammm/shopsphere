import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import {
  RewardSystemDTO,
  RewardRangeDTO,
  UserPointsDTO,
  UserRewardSummaryDTO,
} from "@/lib/types/reward-system";

class RewardSystemService {
  async getActiveRewardSystem(shopId: string): Promise<RewardSystemDTO> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.REWARDS.SYSTEM}?shopId=${shopId}`
    );
    return response.data;
  }

  async getAllRewardSystems(
    shopId: string,
    page: number = 0,
    size: number = 10,
    sortBy: string = "id",
    sortDir: string = "desc"
  ): Promise<{
    content: RewardSystemDTO[];
    currentPage: number;
    totalPages: number;
    totalElements: number;
    size: number;
    first: boolean;
    last: boolean;
    empty: boolean;
  }> {
    const params = new URLSearchParams({
      shopId,
      page: page.toString(),
      size: size.toString(),
      sortBy,
      sortDir,
    });

    const response = await apiClient.get(
      `${API_ENDPOINTS.REWARDS.SYSTEMS}?${params}`
    );
    return response.data;
  }

  async getRewardSystemById(id: number, shopId: string): Promise<RewardSystemDTO> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.REWARDS.SYSTEM_BY_ID(id)}?shopId=${shopId}`
    );
    return response.data;
  }

  async saveRewardSystem(
    rewardSystem: RewardSystemDTO,
    shopId: string
  ): Promise<RewardSystemDTO> {
    const response = await apiClient.post(
      `${API_ENDPOINTS.REWARDS.SYSTEM}?shopId=${shopId}`,
      rewardSystem
    );
    return response.data;
  }

  async activateRewardSystem(id: number, shopId: string): Promise<RewardSystemDTO> {
    const response = await apiClient.put(
      `${API_ENDPOINTS.REWARDS.SYSTEM_BY_ID(id)}/activate?shopId=${shopId}`
    );
    return response.data;
  }

  async toggleSystemEnabled(
    id: number,
    shopId: string,
    enabled: boolean
  ): Promise<RewardSystemDTO> {
    const response = await apiClient.put(
      `${API_ENDPOINTS.REWARDS.SYSTEM_BY_ID(
        id
      )}/toggle-system?shopId=${shopId}&enabled=${enabled}`
    );
    return response.data;
  }

  async toggleReviewPoints(
    id: number,
    shopId: string,
    enabled: boolean,
    pointsAmount?: number
  ): Promise<RewardSystemDTO> {
    const params = new URLSearchParams({ 
      shopId,
      enabled: enabled.toString() 
    });
    if (pointsAmount !== undefined) {
      params.append("pointsAmount", pointsAmount.toString());
    }

    const response = await apiClient.put(
      `${API_ENDPOINTS.REWARDS.SYSTEM_BY_ID(id)}/toggle-review-points?${params}`
    );
    return response.data;
  }

  async togglePurchasePoints(
    id: number,
    shopId: string,
    enabled: boolean
  ): Promise<RewardSystemDTO> {
    const response = await apiClient.put(
      `${API_ENDPOINTS.REWARDS.SYSTEM_BY_ID(
        id
      )}/toggle-purchase-points?shopId=${shopId}&enabled=${enabled}`
    );
    return response.data;
  }

  async toggleQuantityBased(
    id: number,
    shopId: string,
    enabled: boolean
  ): Promise<RewardSystemDTO> {
    const response = await apiClient.put(
      `${API_ENDPOINTS.REWARDS.SYSTEM_BY_ID(
        id
      )}/toggle-quantity-based?shopId=${shopId}&enabled=${enabled}`
    );
    return response.data;
  }

  async toggleAmountBased(
    id: number,
    shopId: string,
    enabled: boolean
  ): Promise<RewardSystemDTO> {
    const response = await apiClient.put(
      `${API_ENDPOINTS.REWARDS.SYSTEM_BY_ID(
        id
      )}/toggle-amount-based?shopId=${shopId}&enabled=${enabled}`
    );
    return response.data;
  }

  async togglePercentageBased(
    id: number,
    shopId: string,
    enabled: boolean,
    percentageRate?: number
  ): Promise<RewardSystemDTO> {
    const params = new URLSearchParams({ 
      shopId,
      enabled: enabled.toString() 
    });
    if (percentageRate !== undefined) {
      params.append("percentageRate", percentageRate.toString());
    }

    const response = await apiClient.put(
      `${API_ENDPOINTS.REWARDS.SYSTEM_BY_ID(
        id
      )}/toggle-percentage-based?${params}`
    );
    return response.data;
  }

  async getUserCurrentPoints(userId: string): Promise<number> {
    const response = await apiClient.get(
      API_ENDPOINTS.REWARDS.USER_CURRENT_POINTS(userId)
    );
    return response.data;
  }

  async getUserRewardSummary(userId: string): Promise<UserRewardSummaryDTO> {
    const response = await apiClient.get(
      API_ENDPOINTS.REWARDS.USER_SUMMARY(userId)
    );
    return response.data;
  }

  async getUserPointsHistory(
    userId: string,
    page: number = 0,
    size: number = 20
  ): Promise<UserPointsDTO[]> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.REWARDS.USER_HISTORY(userId)}?page=${page}&size=${size}`
    );
    return response.data;
  }

  async calculateOrderPoints(
    productCount: number,
    orderAmount: number
  ): Promise<number> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.REWARDS.CALCULATE_POINTS}?productCount=${productCount}&orderAmount=${orderAmount}`
    );
    return response.data;
  }

  async calculatePointsValue(points: number): Promise<number> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.REWARDS.POINTS_VALUE}?points=${points}`
    );
    return response.data;
  }

  async hasEnoughPoints(
    userId: string,
    requiredPoints: number
  ): Promise<boolean> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.REWARDS.HAS_ENOUGH_POINTS(
        userId
      )}?requiredPoints=${requiredPoints}`
    );
    return response.data;
  }

  async getPointsRequiredForProduct(productPrice: number): Promise<number> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.REWARDS.POINTS_REQUIRED}?productPrice=${productPrice}`
    );
    return response.data;
  }
}

export const rewardSystemService = new RewardSystemService();
