import apiClient from "../api-client";
import {
  ProductPaginationResponse,
  ProductSearchFilterRequest,
  ManyProductsPaginationResponse,
  ProductSearchDTO,
} from "../types/product";

export interface UnitOption {
  id: number;
  symbol: string;
  name: string;
}

export interface ProductPricing {
  productId: string;
  productName: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  profitMargin?: number;
  profitPercentage?: number;
  currency: string;
  costPrice: number;
  unit?: UnitOption | null;
}

export interface ProductPricingUpdate {
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  unitId?: number | null;
}

export interface ProductMedia {
  imageId: number;
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder?: number;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface ProductVideo {
  videoId: number;
  url: string;
  title?: string;
  description?: string;
  sortOrder?: number;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
}

export interface ProductVariant {
  variantId: number;
  variantSku: string;
  variantName: string;
  price: number;
  salePrice?: number;
  costPrice?: number;
  isActive: boolean;
  isInStock: boolean;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
  discount?: {
    discountId: number;
    name: string;
    percentage: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  discountedPrice?: number;
  hasActiveDiscount: boolean;
  images: ProductVariantImage[];
  attributes: ProductVariantAttribute[];
  warehouseStocks: ProductVariantWarehouseStock[];
}

export interface ProductVariantImage {
  imageId: number;
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder?: number;
}

export interface ProductVariantAttribute {
  attributeValueId: number;
  attributeValue: string;
  attributeTypeId: number;
  attributeType: string;
}

export interface ProductVariantWarehouseStock {
  warehouseId: number;
  warehouseName: string;
  warehouseLocation: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  lastUpdated: string;
}

export interface ProductVariantsResponse {
  content: ProductVariant[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ProductDetails {
  description?: string;
  weightKg?: number;
  shippingInfo?: string;
  returnPolicy?: string;
  maximumDaysForReturn?: number;
  displayToCustomers?: boolean;
  // Category-specific fields (product-level only)
  storageInstructions?: string;
  nutritionalInfo?: string;
}

export interface ProductDetailsUpdate {
  description?: string;
  weightKg?: number;
  shippingInfo?: string;
  returnPolicy?: string;
  maximumDaysForReturn?: number;
  displayToCustomers?: boolean;
  // Category-specific fields (product-level only)
  storageInstructions?: string;
  nutritionalInfo?: string;
}

export interface ProductBasicInfoUpdate {
  productName?: string;
  shortDescription?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number;
  categoryId?: number;
  brandId?: string;
  active?: boolean;
  featured?: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
  onSale?: boolean;
  salePercentage?: number;
  costPrice?: number;
  organic?: boolean;
  unitId?: number;
}

export interface ProductBasicInfo {
  productId: string;
  productName: string;
  shortDescription?: string;
  description?: string;
  sku: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  categoryId?: number;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  brandLogoUrl?: string;
  active: boolean;
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  onSale: boolean;
  salePercentage?: number;
  costPrice?: number;
  organic?: boolean;
}
import { handleApiError } from "../utils/error-handler";

class ProductService {
  /**
   * Get all products with pagination, sorting, and filtering
   * Uses the backend /products endpoint
   * @param shopId Optional shop ID to filter products by shop
   */
  async getAllProducts(
    page: number = 0,
    size: number = 10,
    sortBy: string = "createdAt",
    sortDir: string = "desc",
    shopId?: string,
  ): Promise<ManyProductsPaginationResponse> {
    try {
      const params: any = { page, size, sortBy, sortDirection: sortDir };
      if (shopId) {
        params.shopId = shopId;
      }
      const response = await apiClient.get(`/products`, { params });
      return response.data;
    } catch (error: any) {
      // Handle shop-related errors
      if (error.response?.status === 403 || error.response?.status === 400) {
        const errorMessage =
          error.response?.data?.message || "Access denied to this shop";
        if (
          errorMessage.toLowerCase().includes("shop") ||
          errorMessage.toLowerCase().includes("authorized")
        ) {
          // Redirect to shops page will be handled by API client interceptor
          throw new Error(errorMessage);
        }
      }
      throw handleApiError(error);
    }
  }

  /**
   * Get products by category ID
   */
  async getProductsByCategory(
    categoryId: string,
    page: number = 0,
    size: number = 10,
  ): Promise<ProductPaginationResponse> {
    try {
      const response = await apiClient.get(`/products/category/${categoryId}`, {
        params: { page, size },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get product basic info for update form
   */
  async getProductBasicInfo(productId: string): Promise<ProductBasicInfo> {
    try {
      const response = await apiClient.get(`/products/${productId}/basic-info`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update product basic info
   */
  async updateProductBasicInfo(
    productId: string,
    updateData: ProductBasicInfoUpdate,
  ): Promise<ProductBasicInfo> {
    try {
      const response = await apiClient.put(
        `/products/${productId}/basic-info`,
        updateData,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get a product by ID
   */
  async getProductById(productId: string) {
    try {
      const response = await apiClient.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createEmptyProduct(
    name: string,
    shopId: string,
  ): Promise<{
    productId: string;
    status: string;
    completionPercentage: number;
    displayToCustomers: boolean;
  }> {
    try {
      if (!shopId) {
        throw new Error("Shop ID is required to create a product");
      }

      const url = `/products/create-empty?name=${encodeURIComponent(name)}&shopId=${encodeURIComponent(shopId)}`;
      console.log("Creating empty product - URL:", url);
      console.log("Creating empty product - shopId:", shopId);

      const response = await apiClient.post(url);
      return response.data;
    } catch (error: any) {
      // Handle shop-related errors
      if (error.response?.status === 403 || error.response?.status === 400) {
        const errorMessage =
          error.response?.data?.message || "Access denied to this shop";
        if (
          errorMessage.toLowerCase().includes("shop") ||
          errorMessage.toLowerCase().includes("authorized")
        ) {
          throw new Error(errorMessage);
        }
      }
      throw handleApiError(error);
    }
  }

  async checkProductHasVariants(productId: string): Promise<{
    hasVariants: boolean;
    message: string;
  }> {
    try {
      const response = await apiClient.get(
        `/products/${productId}/has-variants`,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async assignProductStock(
    productId: string,
    warehouseStocks: Array<{
      warehouseId: number;
      stockQuantity: number;
      lowStockThreshold: number;
    }>,
  ): Promise<{
    success: boolean;
    message: string;
    assignedWarehouses: number;
  }> {
    try {
      const response = await apiClient.post(
        `/products/${productId}/assign-stock`,
        warehouseStocks,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
  async assignProductStockWithBatches(
    productId: string,
    warehouseStocks: Array<{
      warehouseId: number;
      lowStockThreshold: number;
      batches: Array<{
        batchNumber: string;
        manufactureDate?: string;
        expiryDate?: string;
        quantity: number;
        supplierName?: string;
        supplierBatchNumber?: string;
      }>;
    }>,
  ): Promise<any> {
    try {
      const response = await apiClient.post(
        `/products/${productId}/assign-stock-with-batches`,
        warehouseStocks,
      );
      return response.data;
    } catch (error) {
      console.error("Error assigning product stock with batches:", error);
      throw error;
    }
  }

  async unassignWarehouseFromProduct(
    productId: string,
    warehouseId: number,
  ): Promise<any> {
    try {
      const response = await apiClient.delete(
        `/products/${productId}/unassign-warehouse/${warehouseId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error unassigning warehouse from product:", error);
      throw error;
    }
  }

  async assignVariantStockWithBatches(
    productId: string,
    variantId: number,
    warehouseStocks: Array<{
      warehouseId: number;
      warehouseName?: string;
      lowStockThreshold: number;
      batches: Array<{
        batchNumber: string;
        manufactureDate?: string;
        expiryDate?: string;
        quantity: number;
        supplierName?: string;
        supplierBatchNumber?: string;
      }>;
    }>,
  ): Promise<{
    success: boolean;
    message: string;
    assignedWarehouses: number;
    totalBatchesCreated: number;
  }> {
    try {
      const response = await apiClient.post(
        `/products/${productId}/variants/${variantId}/assign-stock-with-batches`,
        warehouseStocks,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async checkProductHasStock(productId: string): Promise<{
    hasStock: boolean;
    message: string;
  }> {
    try {
      const response = await apiClient.get(`/products/${productId}/has-stock`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async removeProductStock(productId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await apiClient.delete(`/products/${productId}/stock`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(productId: string, productData: FormData | any) {
    try {
      // Check if productData is FormData or a regular object
      const isFormData = productData instanceof FormData;

      const response = await apiClient.put(
        `/products/${productId}`,
        productData,
        {
          headers: isFormData
            ? { "Content-Type": "multipart/form-data" }
            : { "Content-Type": "application/json" },
        },
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string) {
    try {
      const response = await apiClient.delete(`/products/${productId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Advanced search for products with complex filtering
   * Uses the backend /products/search endpoint
   * @param shopId Optional shop ID to filter products by shop
   */
  async advancedSearchProducts(
    filters: ProductSearchDTO,
    shopId?: string,
  ): Promise<ManyProductsPaginationResponse> {
    try {
      // Add shopId to filters if provided
      const searchFilters = shopId ? { ...filters, shopId } : filters;
      const response = await apiClient.post(`/products/search`, searchFilters);
      return response.data;
    } catch (error: any) {
      // Handle shop-related errors
      if (error.response?.status === 403 || error.response?.status === 400) {
        const errorMessage =
          error.response?.data?.message || "Access denied to this shop";
        if (
          errorMessage.toLowerCase().includes("shop") ||
          errorMessage.toLowerCase().includes("authorized")
        ) {
          throw new Error(errorMessage);
        }
      }
      throw handleApiError(error);
    }
  }

  /**
   * Legacy search method for backward compatibility
   */
  async searchProducts(
    filters: ProductSearchFilterRequest,
  ): Promise<ManyProductsPaginationResponse> {
    try {
      // Convert legacy filters to new ProductSearchDTO format
      const searchDTO: ProductSearchDTO = {
        page: filters.page,
        size: filters.size,
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection,
        searchKeyword: filters.keyword,
        basePriceMin: filters.minPrice,
        basePriceMax: filters.maxPrice,
        inStock: filters.inStock,
        isOnSale: filters.onSale,
        isFeatured: filters.popular,
        isNewArrival: filters.newArrivals,
        isBestseller: filters.popular,
      };

      // Add category filters if present
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        searchDTO.categoryIds = filters.categoryIds.map((id) => parseInt(id));
      }

      return this.advancedSearchProducts(searchDTO);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Assign discount to products and/or variants
   */
  async assignDiscount(
    discountId: string,
    productIds?: string[],
    variantIds?: string[],
  ) {
    try {
      const response = await apiClient.post(`/products/discount/assign`, {
        discountId,
        productIds,
        variantIds,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Remove discount from products and/or variants
   */
  async removeDiscount(productIds?: string[], variantIds?: string[]) {
    try {
      const response = await apiClient.delete(`/products/discount/remove`, {
        data: { productIds, variantIds },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get products with a specific discount
   */
  async getProductsByDiscount(
    discountId: string,
    page: number = 0,
    size: number = 10,
  ) {
    try {
      const response = await apiClient.get(`/products/discount/${discountId}`, {
        params: { page, size },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get product pricing information
   */
  async getProductPricing(productId: string): Promise<ProductPricing> {
    try {
      const response = await apiClient.get(`/products/${productId}/pricing`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update product pricing information
   */
  async updateProductPricing(
    productId: string,
    updateData: ProductPricingUpdate,
  ): Promise<ProductPricing> {
    try {
      const response = await apiClient.put(
        `/products/${productId}/pricing`,
        updateData,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getProductImages(productId: string): Promise<ProductMedia[]> {
    try {
      const response = await apiClient.get(
        `/products/${productId}/media/images`,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getProductVideos(productId: string): Promise<ProductVideo[]> {
    try {
      const response = await apiClient.get(
        `/products/${productId}/media/videos`,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteProductImage(productId: string, imageId: number): Promise<void> {
    try {
      await apiClient.delete(`/products/${productId}/media/images/${imageId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteProductVideo(productId: string, videoId: number): Promise<void> {
    try {
      await apiClient.delete(`/products/${productId}/media/videos/${videoId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async setPrimaryImage(productId: string, imageId: number): Promise<void> {
    try {
      await apiClient.put(
        `/products/${productId}/media/images/${imageId}/primary`,
      );
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async uploadProductImages(
    productId: string,
    images: File[],
  ): Promise<ProductMedia[]> {
    try {
      const formData = new FormData();
      images.forEach((image) => {
        formData.append("images", image);
      });

      const response = await apiClient.post(
        `/products/${productId}/media/images`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async uploadProductVideos(
    productId: string,
    videos: File[],
  ): Promise<ProductVideo[]> {
    try {
      const formData = new FormData();
      videos.forEach((video) => {
        formData.append("videos", video);
      });

      const response = await apiClient.post(
        `/products/${productId}/media/videos`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get all variants for a product with pagination
   */
  async getProductVariants(
    productId: string,
    page: number = 0,
    size: number = 10,
    sortBy: string = "id",
    sortDir: string = "asc",
  ): Promise<ProductVariantsResponse> {
    try {
      const response = await apiClient.get(
        `/products/${productId}/variants?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateProductVariant(
    productId: string,
    variantId: number,
    updates: Record<string, any>,
  ): Promise<ProductVariant> {
    try {
      const response = await apiClient.put(
        `/products/${productId}/variants/${variantId}`,
        updates,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteVariantImage(
    productId: string,
    variantId: number,
    imageId: number,
  ): Promise<void> {
    try {
      await apiClient.delete(
        `/products/${productId}/variants/${variantId}/images/${imageId}`,
      );
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteVariant(
    productId: string,
    variantId: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete(
        `/products/${productId}/variants/${variantId}`,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async setPrimaryVariantImage(
    productId: string,
    variantId: number,
    imageId: number,
  ): Promise<void> {
    try {
      await apiClient.put(
        `/products/${productId}/variants/${variantId}/images/${imageId}/primary`,
      );
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async uploadVariantImages(
    productId: string,
    variantId: number,
    images: File[],
  ): Promise<ProductVariantImage[]> {
    try {
      const formData = new FormData();
      images.forEach((image) => {
        formData.append("images", image);
      });

      const response = await apiClient.post(
        `/products/${productId}/variants/${variantId}/images`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async removeVariantAttribute(
    productId: string,
    variantId: number,
    attributeValueId: number,
  ): Promise<void> {
    try {
      await apiClient.delete(
        `/products/${productId}/variants/${variantId}/attributes/${attributeValueId}`,
      );
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async addVariantAttributes(
    productId: string,
    variantId: number,
    attributes: Array<{ attributeTypeName: string; attributeValue: string }>,
  ): Promise<ProductVariantAttribute[]> {
    try {
      const response = await apiClient.post(
        `/products/${productId}/variants/${variantId}/attributes`,
        attributes,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createProductVariant(
    productId: string,
    variantData: {
      variantName: string;
      variantSku: string;
      price: number;
      salePrice?: number;
      costPrice?: number;
      isActive: boolean;
      attributes: Array<{ attributeTypeName: string; attributeValue: string }>;
      images: File[];
      warehouseStocks: Array<{
        warehouseId: number;
        warehouseName: string;
        stockQuantity: number;
        lowStockThreshold: number;
      }>;
    },
  ): Promise<ProductVariant> {
    try {
      const formData = new FormData();

      formData.append("variantName", variantData.variantName);
      formData.append("variantSku", variantData.variantSku);
      formData.append("price", variantData.price.toString());
      if (variantData.salePrice) {
        formData.append("salePrice", variantData.salePrice.toString());
      }
      if (variantData.costPrice) {
        formData.append("costPrice", variantData.costPrice.toString());
      }
      formData.append("isActive", variantData.isActive.toString());
      formData.append("attributes", JSON.stringify(variantData.attributes));
      formData.append(
        "warehouseStocks",
        JSON.stringify(variantData.warehouseStocks),
      );

      variantData.images.forEach((image) => {
        formData.append("images", image);
      });

      const response = await apiClient.post(
        `/products/${productId}/variants`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getProductDetails(productId: string): Promise<ProductDetails> {
    try {
      const response = await apiClient.get(`/products/${productId}/details`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateProductDetails(
    productId: string,
    updateData: ProductDetailsUpdate,
  ): Promise<ProductDetails> {
    try {
      const response = await apiClient.put(
        `/products/${productId}/details`,
        updateData,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getProductWarehouseStock(
    productId: string,
    page: number = 0,
    size: number = 10,
    sort: string = "warehouse.name",
    direction: string = "asc",
  ): Promise<{
    content: Array<{
      warehouseId: number;
      warehouseName: string;
      stockQuantity: number;
      lowStockThreshold: number;
      stockId?: string;
    }>;
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  }> {
    try {
      const response = await apiClient.get(
        `/products/${productId}/warehouse-stock?page=${page}&size=${size}&sort=${sort}&direction=${direction}`,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const productService = new ProductService();
