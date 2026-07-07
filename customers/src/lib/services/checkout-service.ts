import { API_BASE_URL, apiCall } from "../api";

export interface AddressDto {
  streetAddress: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface CartItemDTO {
  productId?: string;
  variantId?: number;
  quantity: number;
  weight?: number;
}

// Validation function for cart items
export function validateCartItems(items: CartItemDTO[]): string[] {
  const errors: string[] = [];

  items.forEach((item, index) => {
    if (!item.productId && !item.variantId) {
      errors.push(`Item ${index + 1}: Must have either productId or variantId`);
    }

    if (
      item.variantId &&
      (typeof item.variantId !== "number" || item.variantId <= 0)
    ) {
      errors.push(
        `Item ${index + 1}: Invalid variantId - must be a positive number`,
      );
    }

    if (item.productId && typeof item.productId !== "string") {
      errors.push(`Item ${index + 1}: Invalid productId - must be a string`);
    }

    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
    }
  });

  return errors;
}

export interface ShopFulfillmentPreference {
  shopId: string;
  fulfillmentType: "PICKUP" | "DELIVERY";
}

export interface CalculateOrderShippingRequest {
  deliveryAddress: AddressDto;
  items: CartItemDTO[];
  orderValue: number;
  userId?: string;
  shopFulfillmentPreferences?: ShopFulfillmentPreference[];
}

export interface ShopSummary {
  shopId: string;
  shopName: string;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  rewardPoints: number;
  rewardPointsValue: number;
  productCount: number;
  // Shipping details for this shop
  distanceKm?: number;
  costPerKm?: number;
  selectedWarehouseName?: string;
  selectedWarehouseCountry?: string;
  isInternationalShipping?: boolean;
  // Shop capability and fulfillment information
  shopCapability?:
    | "VISUALIZATION_ONLY"
    | "PICKUP_ORDERS"
    | "FULL_ECOMMERCE"
    | "HYBRID";
  fulfillmentType?: "PICKUP" | "DELIVERY";
  packagingFee?: number;
  requiresFulfillmentChoice?: boolean;
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
  // New fields for distance and shipping details (aggregated from farthest warehouse)
  distanceKm?: number;
  costPerKm?: number;
  selectedWarehouseName?: string;
  selectedWarehouseCountry?: string;
  isInternationalShipping?: boolean;
  // Per-shop summaries
  shopSummaries?: ShopSummary[];
}

class CheckoutService {
  private baseUrl = `${API_BASE_URL}/checkout`;

  async calculateShippingCost(
    request: CalculateOrderShippingRequest,
  ): Promise<number> {
    return apiCall<number>(`${this.baseUrl}/calculate-shipping`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getPaymentSummary(
    request: CalculateOrderShippingRequest,
  ): Promise<PaymentSummaryDTO> {
    return apiCall<PaymentSummaryDTO>(`${this.baseUrl}/payment-summary`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async handlePaymentCancellation(sessionId: string): Promise<void> {
    return apiCall<void>(
      `${this.baseUrl}/webhook/cancel?session_id=${sessionId}`,
      {
        method: "POST",
      },
    );
  }
}

export const checkoutService = new CheckoutService();
