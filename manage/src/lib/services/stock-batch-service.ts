import apiClient from "../api-client";
import { handleApiError } from "../utils/error-handler";

export interface StockBatch {
  id: number;
  stockId: number;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  status: string;
  supplierName?: string;
  supplierBatchNumber?: string;
  originFarm?: string;
  gradeQuality?: string;
  createdAt: string;
  updatedAt: string;
  productName: string;
  warehouseName: string;
  warehouseId: number;
  productId: string;
  variantId?: string;
  variantName?: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isEmpty: boolean;
  isRecalled: boolean;
  isAvailable: boolean;
}

export interface CreateStockBatchRequest {
  stockId: number;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  supplierName?: string;
  supplierBatchNumber?: string;
  originFarm?: string;
  gradeQuality?: string;
}

export interface CreateVariantBatchRequest {
  batchNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  supplierName?: string;
  supplierBatchNumber?: string;
  originFarm?: string;
  gradeQuality?: string;
}

export interface UpdateStockBatchRequest {
  batchNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  supplierName?: string;
  supplierBatchNumber?: string;
  originFarm?: string;
  gradeQuality?: string;
}

class StockBatchService {
  async getBatchesByStock(stockId: number): Promise<StockBatch[]> {
    try {
      const response = await apiClient.get(
        `/stock-batches/stock/${stockId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getBatchesByProduct(productId: string): Promise<StockBatch[]> {
    try {
      const response = await apiClient.get(
        `/stock-batches/product/${productId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getBatchesByVariantId(variantId: number): Promise<StockBatch[]> {
    try {
      const response = await apiClient.get(
        `/stock-batches/variant/${variantId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getBatchById(batchId: number): Promise<StockBatch> {
    try {
      const response = await apiClient.get(`/stock-batches/${batchId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createBatch(request: CreateStockBatchRequest): Promise<StockBatch> {
    try {
      const response = await apiClient.post(`/stock-batches`, request);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createBatchForVariant(
    variantId: number,
    warehouseId: number,
    request: CreateVariantBatchRequest
  ): Promise<StockBatch> {
    try {
      const response = await apiClient.post(
        `/stock-batches/variant/${variantId}/warehouse/${warehouseId}`,
        request
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateBatch(
    batchId: number,
    request: UpdateStockBatchRequest
  ): Promise<StockBatch> {
    try {
      const response = await apiClient.put(
        `/stock-batches/${batchId}`,
        request
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteBatch(batchId: number): Promise<void> {
    try {
      await apiClient.delete(`/stock-batches/${batchId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async recallBatch(batchId: number, reason?: string): Promise<StockBatch> {
    try {
      const response = await apiClient.post(
        `/stock-batches/${batchId}/recall`,
        null,
        { params: { reason } }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getBatchesExpiringSoon(
    daysThreshold: number = 30
  ): Promise<StockBatch[]> {
    try {
      const response = await apiClient.get(`/stock-batches/expiring-soon`, {
        params: { daysThreshold },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const stockBatchService = new StockBatchService();
