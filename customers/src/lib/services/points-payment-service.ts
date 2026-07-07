import { API_ENDPOINTS, apiCall } from "../api";

export interface PointsPaymentPreview {
  totalAmount: number;
  availablePoints: number;
  pointsValue: number;
  remainingToPay: number;
  canPayWithPointsOnly: boolean;
  pointValue: number;
}

export interface ShopPointsSelection {
  shopId: string;
  pointsToUse: number;
}

export interface PointsPaymentRequest {
  userId: string;
  items: Array<{
    productId: string;
    variantId?: number;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  useAllAvailablePoints: boolean;
  selectedShopsForPoints?: ShopPointsSelection[];
}

export interface ShopPointsDeduction {
  shopId: string;
  shopName: string;
  pointsUsed: number;
  pointsValue: number;
  shopOrderAmount: number;
  remainingForShop: number;
}

export interface PointsPaymentResult {
  success: boolean;
  message: string;
  orderId?: number;
  orderNumber?: string;
  pointsUsed: number;
  pointsValue: number;
  remainingAmount: number;
  stripeSessionId?: string;
  hybridPayment: boolean;
  shopPointsDeductions?: ShopPointsDeduction[];
}

export interface ShopPointsEligibility {
  shopId: string;
  shopName: string;
  isRewardingEnabled: boolean;
  currentPointsBalance: number;
  currentPointsValue: number;
  potentialEarnedPoints: number;
  totalAmount: number;
  canPayWithPoints: boolean;
  maxPointsPayableAmount: number;
  message: string;
}

export interface PointsEligibilityResponse {
  shopEligibilities: ShopPointsEligibility[];
}

export interface PointsEligibilityRequest {
  userId: string;
  items: Array<{
    productId: string;
    variantId?: number;
    quantity: number;
  }>;
  shippingAddress?: {
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
}

class PointsPaymentService {
  async previewPointsPayment(
    request: PointsPaymentRequest,
  ): Promise<PointsPaymentPreview> {
    return apiCall<PointsPaymentPreview>(API_ENDPOINTS.POINTS_PAYMENT_PREVIEW, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async processPointsPayment(
    request: PointsPaymentRequest,
  ): Promise<PointsPaymentResult> {
    return apiCall<PointsPaymentResult>(API_ENDPOINTS.POINTS_PAYMENT_PROCESS, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async completeHybridPayment(
    userId: string,
    orderId: string,
    stripeSessionId: string,
  ): Promise<PointsPaymentResult> {
    const endpoint = `${API_ENDPOINTS.POINTS_PAYMENT_COMPLETE_HYBRID(
      userId,
      orderId,
    )}?stripeSessionId=${encodeURIComponent(stripeSessionId)}`;

    return apiCall<PointsPaymentResult>(endpoint, {
      method: "POST",
    });
  }

  async checkPointsEligibility(
    request: PointsEligibilityRequest,
  ): Promise<PointsEligibilityResponse> {
    return apiCall<PointsEligibilityResponse>(
      API_ENDPOINTS.POINTS_PAYMENT_ELIGIBILITY,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    );
  }
}

export const pointsPaymentService = new PointsPaymentService();
