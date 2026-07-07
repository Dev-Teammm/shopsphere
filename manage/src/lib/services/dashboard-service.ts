"use client";

import apiClient from "../api-client";
import { API_ENDPOINTS } from "../constants";
import {
  DashboardResponseDTO,
  AnalyticsResponseDTO,
  AnalyticsRequestDTO,
} from "../types/dashboard";
import { AxiosError } from "axios";

class DashboardService {
  // Fetches dashboard data from the API - matches backend DashboardController
  async getDashboardData(shopSlug?: string): Promise<DashboardResponseDTO> {
    try {
      const params = shopSlug ? { shopSlug } : {};
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD.BASE, {
        params,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error fetching dashboard data:", axiosError);
      if (axiosError.response?.status === 403) {
        throw new Error(
          "Access denied. You don't have permission to view this shop's dashboard.",
        );
      }
      throw new Error(
        (axiosError.response?.data as any)?.message ||
          "Failed to load dashboard data",
      );
    }
  }

  // Fetches analytics data from the API - matches backend AnalyticsController
  async getAnalyticsData(
    request: AnalyticsRequestDTO,
  ): Promise<AnalyticsResponseDTO> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.ANALYTICS.BASE,
        request,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error fetching analytics data:", axiosError);
      throw new Error("Failed to load analytics data");
    }
  }

  // Helper method to check if user has access to revenue data (ADMIN only)
  hasRevenueAccess(data: DashboardResponseDTO): boolean {
    return data.totalRevenue !== null;
  }
}

export const dashboardService = new DashboardService();
