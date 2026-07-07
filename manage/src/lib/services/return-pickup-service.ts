import apiClient from '../api-client';

export interface ReturnPickupRequest {
  returnRequestId: number;
  returnItems: ReturnItemPickup[];
}

export interface ReturnItemPickup {
  returnItemId: number;
  pickupStatus: ReturnItemPickupStatus;
  notes?: string;
}

export enum ReturnItemPickupStatus {
  UNDAMAGED = 'UNDAMAGED',
  DAMAGED = 'DAMAGED',
  MISSING = 'MISSING',
  DEFECTIVE = 'DEFECTIVE'
}

export interface ReturnPickupResponse {
  returnRequestId: number;
  message: string;
  pickupCompletedAt: string;
  itemResults: ReturnItemProcessingResult[];
}

export interface ReturnItemProcessingResult {
  returnItemId: number;
  productName: string;
  variantName: string;
  quantityProcessed: number;
  status: ReturnItemPickupStatus;
  restockedSuccessfully: boolean;
  warehouseName: string;
  batchNumber: string;
  message: string;
}

export const returnPickupService = {
  /**
   * Process return pickup
   */
  async processReturnPickup(pickupRequest: ReturnPickupRequest): Promise<ReturnPickupResponse> {
    const response = await apiClient.post('/delivery-agent/pickup/process', pickupRequest);
    return response.data;
  },

  /**
   * Validate return pickup request
   */
  async validateReturnPickup(pickupRequest: ReturnPickupRequest): Promise<string> {
    const response = await apiClient.post('/delivery-agent/pickup/validate', pickupRequest);
    return response.data;
  },

  /**
   * Get pickup status options for display
   */
  getPickupStatusOptions() {
    return [
      {
        value: ReturnItemPickupStatus.UNDAMAGED,
        label: 'Undamaged',
        description: 'Item is in perfect condition and can be restocked',
        color: 'bg-green-500'
      },
      {
        value: ReturnItemPickupStatus.DAMAGED,
        label: 'Damaged',
        description: 'Item has visible damage but was received',
        color: 'bg-yellow-500'
      },
      {
        value: ReturnItemPickupStatus.MISSING,
        label: 'Missing',
        description: 'Item was not provided by customer',
        color: 'bg-red-500'
      },
      {
        value: ReturnItemPickupStatus.DEFECTIVE,
        label: 'Defective',
        description: 'Item has functional issues or defects',
        color: 'bg-orange-500'
      }
    ];
  }
};
