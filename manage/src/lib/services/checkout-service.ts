import apiClient from "../api-client";

export interface AddressDto {
  streetAddress: string;
  city: string;
  country: string;
}

export interface CartItemDTO {
  productId: string;
  variantId?: number;
  quantity: number;
  weight?: number;
}

export interface CalculateOrderShippingRequest {
  deliveryAddress: AddressDto;
  items: CartItemDTO[];
  orderValue: number;
  userId?: string;
}

export interface PaymentSummaryDTO {
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  rewardPoints: number;
  rewardPointsValue: number;
  currency: string;
}

class CheckoutService {
  private baseUrl = "/checkout";

  async calculateShippingCost(
    request: CalculateOrderShippingRequest
  ): Promise<number> {
    const response = await apiClient.post(
      `${this.baseUrl}/calculate-shipping`,
      request
    );
    return response.data;
  }

  async getPaymentSummary(
    request: CalculateOrderShippingRequest
  ): Promise<PaymentSummaryDTO> {
    const response = await apiClient.post(
      `${this.baseUrl}/payment-summary`,
      request
    );
    return response.data;
  }
}

export const checkoutService = new CheckoutService();
