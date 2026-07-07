import { API_BASE_URL, apiCall } from "../api";

export interface RewardRange {
  rangeType: string;
  minValue: number;
  maxValue: number | null;
  points: number;
  description: string | null;
}

export interface RewardSettings {
  pointValue: number;
  isReviewPointsEnabled: boolean;
  reviewPointsAmount: number;
  isPurchasePointsEnabled: boolean;
  isPercentageBasedEnabled: boolean;
  percentageRate: number | null;
  rewardRanges: RewardRange[];
}

export interface ShopRewardPoints {
  shopId: string;
  shopName: string;
  logoUrl: string | null;
  points: number;
  monetaryValue: number;
  category: string;
  rewardSettings: RewardSettings | null;
}

export interface UserRewardSummary {
  totalPoints: number;
  totalMonetaryValue: number;
  shopPoints: ShopRewardPoints[];
  totalShops: number;
  totalPages: number;
  currentPage: number;
}

export const rewardService = {
  getMyRewards: async (params: {
    query?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  }): Promise<UserRewardSummary> => {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.append("query", params.query);
    if (params.page !== undefined)
      queryParams.append("page", params.page.toString());
    if (params.size !== undefined)
      queryParams.append("size", params.size.toString());
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortDir) queryParams.append("sortDir", params.sortDir);

    return apiCall<UserRewardSummary>(
      `${API_BASE_URL}/rewards/my-points?${queryParams.toString()}`,
    );
  },
};
