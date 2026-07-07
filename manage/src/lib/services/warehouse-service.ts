import apiClient from "../api-client";

export interface WarehouseDTO {
  id: number;
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  productCount: number;
  shopId?: string;
  shopName?: string;
  createdAt: string;
  updatedAt: string;
  images: WarehouseImageDTO[];
}

export interface WarehouseImageDTO {
  id: number;
  imageUrl: string;
  isPrimary?: boolean;
  sortOrder?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
}

export interface CreateWarehouseDTO {
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  country: string;
  phone?: string;
  email?: string;
  capacity: number;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  shopId?: string;
}

export interface UpdateWarehouseDTO {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export interface WarehouseProductDTO {
  productId: string;
  productName: string;
  productSku?: string;
  productDescription?: string;
  productPrice?: number;
  totalQuantity: number; // Total quantity from all active batches for this product
  activeBatchCount: number; // Number of active batches for this product
  expiredBatchCount: number; // Number of expired batches for this product
  recalledBatchCount: number; // Number of recalled batches for this product
  lowStockThreshold: number; // Minimum threshold across all stock entries
  isLowStock: boolean; // Whether the product is below threshold
  isOutOfStock: boolean; // Whether the product has no active stock
  productImages: string[];
}

export interface ProductVariantWarehouseDTO {
  variantId: number;
  variantName: string;
  variantSku?: string;
  totalQuantity: number;
  activeBatchCount: number;
  expiredBatchCount: number;
  recalledBatchCount: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  variantImages: string[];
  variantPrice?: number;
  stockId: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string;
}

class WarehouseService {
  private baseUrl = "/warehouses";

  async getWarehouses(
    page: number = 0,
    size: number = 10,
    shopId?: string,
  ): Promise<PaginatedResponse<WarehouseDTO>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (shopId) {
      params.append("shopId", shopId);
    }
    const response = await apiClient.get(
      `${this.baseUrl}?${params.toString()}`,
    );
    return response.data;
  }

  async getWarehouseById(id: number): Promise<WarehouseDTO> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async createWarehouse(
    warehouse: CreateWarehouseDTO,
    images?: File[],
  ): Promise<WarehouseDTO> {
    const formData = new FormData();

    // Add warehouse data as JSON
    formData.append("warehouse", JSON.stringify(warehouse));

    // Add images if provided
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        formData.append("images", image);
      });
    }

    const response = await apiClient.post(this.baseUrl, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  async updateWarehouse(
    id: number,
    warehouse: UpdateWarehouseDTO,
    images?: File[],
  ): Promise<WarehouseDTO> {
    const formData = new FormData();

    // Add warehouse data as JSON
    formData.append("warehouse", JSON.stringify(warehouse));

    // Add images if provided
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        formData.append("images", image);
      });
    }

    const response = await apiClient.put(`${this.baseUrl}/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  async removeImageFromWarehouse(
    warehouseId: number,
    imageId: number,
  ): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${warehouseId}/images/${imageId}`);
  }

  async deleteWarehouse(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  async getWarehouseProducts(
    id: number,
    page: number = 0,
    size: number = 10,
  ): Promise<PaginatedResponse<WarehouseProductDTO>> {
    const response = await apiClient.get(
      `${this.baseUrl}/${id}/products?page=${page}&size=${size}`,
    );
    return response.data;
  }

  async getProductVariantsInWarehouse(
    warehouseId: number,
    productId: string,
  ): Promise<ProductVariantWarehouseDTO[]> {
    const response = await apiClient.get(
      `${this.baseUrl}/${warehouseId}/products/${productId}/variants`,
    );
    return response.data;
  }

  async addProductToWarehouse(
    warehouseId: number,
    productId: string,
    quantity: number,
    lowStockThreshold: number = 10,
  ): Promise<void> {
    await apiClient.post(
      `${this.baseUrl}/${warehouseId}/products/${productId}`,
      {
        quantity,
        lowStockThreshold,
      },
    );
  }

  async removeProductFromWarehouse(
    warehouseId: number,
    productId: string,
  ): Promise<void> {
    await apiClient.delete(
      `${this.baseUrl}/${warehouseId}/products/${productId}`,
    );
  }

  async updateProductStock(
    warehouseId: number,
    productId: string,
    quantity: number,
    lowStockThreshold: number,
  ): Promise<void> {
    await apiClient.put(
      `${this.baseUrl}/${warehouseId}/products/${productId}`,
      {
        quantity,
        lowStockThreshold,
      },
    );
  }

  async searchWarehouses(
    query: string,
    page: number = 0,
    size: number = 10,
    shopId?: string,
  ): Promise<PaginatedResponse<WarehouseDTO>> {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      size: size.toString(),
    });
    if (shopId) {
      params.append("shopId", shopId);
    }
    const response = await apiClient.get(
      `${this.baseUrl}/search?${params.toString()}`,
    );
    return response.data;
  }

  async getWarehousesByLocation(
    location: string,
    shopId?: string,
  ): Promise<WarehouseDTO[]> {
    const params = new URLSearchParams({
      location: location,
    });
    if (shopId) {
      params.append("shopId", shopId);
    }
    const response = await apiClient.get(
      `${this.baseUrl}/location?${params.toString()}`,
    );
    return response.data.data;
  }

  async getWarehousesNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    shopId?: string,
  ): Promise<WarehouseDTO[]> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radiusKm: radiusKm.toString(),
    });
    if (shopId) {
      params.append("shopId", shopId);
    }
    const response = await apiClient.get(
      `${this.baseUrl}/nearby?${params.toString()}`,
    );
    return response.data.data;
  }
}

export const warehouseService = new WarehouseService();
