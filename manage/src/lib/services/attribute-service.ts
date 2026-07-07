import apiClient from "../api-client";

export interface ProductAttributeTypeDTO {
  attributeTypeId: number;
  name: string;
  isRequired: boolean;
}

export interface ProductAttributeValueDTO {
  attributeValueId: number;
  value: string;
  attributeTypeId: number;
  attributeType: ProductAttributeTypeDTO;
}

export interface AttributeTypePageResponse {
  content: ProductAttributeTypeDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

class AttributeService {
  /**
   * Get all attribute types with pagination
   */
  async getAllAttributeTypes(
    page: number = 0,
    size: number = 10,
    sort: string = "name",
    direction: string = "ASC"
  ): Promise<AttributeTypePageResponse> {
    try {
      const response = await apiClient.get(`/product-attribute-types`, {
        params: { page, size, sort, direction },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all attribute types without pagination
   */
  async getAllAttributeTypesList(): Promise<ProductAttributeTypeDTO[]> {
    try {
      const response = await apiClient.get(`/product-attribute-types`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search attribute types by name
   */
  async searchAttributeTypes(
    name: string,
    page: number = 0,
    size: number = 10
  ): Promise<AttributeTypePageResponse> {
    try {
      const response = await apiClient.get(
        `/product-attribute-types/search`,
        {
          params: { name, page, size },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get attribute values for a specific attribute type
   */
  async getAttributeValuesByType(
    attributeTypeId: number
  ): Promise<ProductAttributeValueDTO[]> {
    try {
      const response = await apiClient.get(
        `/product-attribute-values/type/${attributeTypeId}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const attributeService = new AttributeService();
