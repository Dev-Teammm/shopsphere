export interface RewardRangeDTO {
  id?: number;
  rewardSystemId?: number;
  rangeType: "QUANTITY" | "AMOUNT";
  minValue: number;
  maxValue?: number;
  points: number;
  description?: string;
}

export interface RewardSystemDTO {
  id?: number;
  pointValue: number;
  isActive?: boolean;
  isSystemEnabled: boolean;
  isReviewPointsEnabled: boolean;
  reviewPointsAmount: number;
  isPurchasePointsEnabled: boolean;
  isQuantityBasedEnabled: boolean;
  isAmountBasedEnabled: boolean;
  isPercentageBasedEnabled: boolean;
  percentageRate?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  rewardRanges?: RewardRangeDTO[];
  shopId?: string;
  shopName?: string;
}

export interface UserPointsDTO {
  id?: number;
  userId: string;
  userFullName: string;
  userEmail: string;
  points: number;
  pointsType: string;
  description?: string;
  orderId?: number;
  pointsValue?: number;
  balanceAfter: number;
  createdAt: string;
}

export interface UserRewardSummaryDTO {
  userId: string;
  userFullName: string;
  userEmail: string;
  currentPoints: number;
  currentPointsValue: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  totalPointsExpired: number;
  totalValueEarned: number;
  totalValueSpent: number;
  formattedCurrentPointsValue: string;
  formattedTotalValueEarned: string;
  formattedTotalValueSpent: string;
  pointValue: number;
  formattedPointValue: string;
}

export interface CreateRewardSystemRequest {
  pointValue: number;
  isSystemEnabled: boolean;
  isReviewPointsEnabled: boolean;
  reviewPointsAmount: number;
  isPurchasePointsEnabled: boolean;
  isQuantityBasedEnabled: boolean;
  isAmountBasedEnabled: boolean;
  isPercentageBasedEnabled: boolean;
  percentageRate?: number;
  description?: string;
}

export interface ToggleRequest {
  enabled: boolean;
  pointsAmount?: number;
  percentageRate?: number;
}
