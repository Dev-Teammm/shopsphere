import apiClient from "../api-client";
import { UnitOption } from "./product-service";

export interface UnitsPageResponse {
  content: UnitOption[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export const unitService = {
  async getUnits(params: {
    page?: number;
    size?: number;
    search?: string;
  }): Promise<UnitsPageResponse> {
    const { page = 0, size = 20, search = "" } = params;
    const response = await apiClient.get<UnitsPageResponse>("/units", {
      params: { page, size, ...(search.trim() ? { search: search.trim() } : {}) },
    });
    return response.data;
  },

  async createUnit(symbol: string, name: string): Promise<UnitOption> {
    const response = await apiClient.post<UnitOption>("/units", {
      symbol: symbol.trim(),
      name: name.trim(),
    });
    return response.data;
  },
};
