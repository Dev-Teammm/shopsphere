export interface ShippingCost {
  id: number;
  name: string;
  description?: string;
  distanceKmCost?: number;
  weightKgCost?: number;
  baseFee?: number;
  internationalFee?: number;
  freeShippingThreshold?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShippingCost {
  name: string;
  description?: string;
  distanceKmCost?: number;
  weightKgCost?: number;
  baseFee?: number;
  internationalFee?: number;
  freeShippingThreshold?: number;
  isActive: boolean;
}

export interface UpdateShippingCost {
  name?: string;
  description?: string;
  distanceKmCost?: number;
  weightKgCost?: number;
  baseFee?: number;
  internationalFee?: number;
  freeShippingThreshold?: number;
  isActive?: boolean;
}

export interface ShippingCostFilters {
  search?: string;
  isActive?: boolean;
}
