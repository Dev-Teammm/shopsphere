import {
  ReturnRequestDTO,
  ReturnRequestsResponse,
  ReturnDecisionDTO,
  ReturnRequestSearchParams,
  ReturnRequestFilters,
  ReturnStatus,
} from "@/types/return";
import apiClient from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";

class ReturnService {
  /**
   * Get all return requests with comprehensive filtering (Admin/Employee only)
   */
  async getAllReturnRequests(
    params: ReturnRequestSearchParams = {},
  ): Promise<ReturnRequestsResponse> {
    const {
      page = 0,
      size = 20,
      sort = "submittedAt",
      direction = "DESC",
      filters = {},
    } = params;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: `${sort},${direction}`,
    });

    // Add filters to query params
    if (filters.status && filters.status !== "ALL") {
      queryParams.append("status", filters.status);
    }

    if (filters.customerType && filters.customerType !== "ALL") {
      queryParams.append("customerType", filters.customerType);
    }

    if (filters.search && filters.search.trim()) {
      queryParams.append("search", filters.search.trim());
    }

    if (filters.dateFrom) {
      queryParams.append("dateFrom", filters.dateFrom);
    }

    if (filters.dateTo) {
      queryParams.append("dateTo", filters.dateTo);
    }

    if (filters.shopId) {
      queryParams.append("shopId", filters.shopId);
    }

    const response = await apiClient.get(
      `${API_ENDPOINTS.RETURNS.ADMIN_ALL}?${queryParams}`,
    );
    const result = response.data;
    // Normalize response to handle both custom Map and standard Page formats
    return {
      ...result,
      content: result.data || result.content || [],
      totalElements: result.totalElements || 0,
      totalPages: result.totalPages || 0,
      size: result.pageSize || result.size || 0,
      number: result.currentPage ?? result.number ?? 0,
    };
  }

  /**
   * Get return requests by status (Admin/Employee only)
   */
  async getReturnRequestsByStatus(
    status: ReturnStatus,
    params: ReturnRequestSearchParams = {},
  ): Promise<ReturnRequestsResponse> {
    const {
      page = 0,
      size = 20,
      sort = "submittedAt",
      direction = "DESC",
    } = params;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: `${sort},${direction}`,
    });

    if (params.filters?.shopId) {
      queryParams.append("shopId", params.filters.shopId);
    }

    const response = await apiClient.get(
      `${API_ENDPOINTS.RETURNS.ADMIN_BY_STATUS(status)}?${queryParams}`,
    );
    const result = response.data;
    return {
      ...result,
      content: result.data || result.content || [],
      totalElements: result.totalElements || 0,
      totalPages: result.totalPages || 0,
      size: result.pageSize || result.size || 0,
      number: result.currentPage ?? result.number ?? 0,
    };
  }

  /**
   * Get guest return requests (Admin/Employee only)
   */
  async getGuestReturnRequests(
    params: ReturnRequestSearchParams = {},
  ): Promise<ReturnRequestsResponse> {
    const {
      page = 0,
      size = 20,
      sort = "submittedAt",
      direction = "DESC",
    } = params;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: `${sort},${direction}`,
    });

    if (params.filters?.shopId) {
      queryParams.append("shopId", params.filters.shopId);
    }

    const response = await apiClient.get(
      `${API_ENDPOINTS.RETURNS.ADMIN_GUEST}?${queryParams}`,
    );
    const result = response.data;
    return {
      ...result,
      content: result.data || result.content || [],
      totalElements: result.totalElements || 0,
      totalPages: result.totalPages || 0,
      size: result.pageSize || result.size || 0,
      number: result.currentPage ?? result.number ?? 0,
    };
  }

  /**
   * Get specific return request details
   */
  async getReturnRequestById(id: string): Promise<ReturnRequestDTO> {
    const response = await apiClient.get(API_ENDPOINTS.RETURNS.BY_ID(id));
    return response.data;
  }

  /**
   * Review return request (Admin/Employee only)
   */
  async reviewReturnRequest(
    decision: ReturnDecisionDTO,
    refundScreenshot?: File,
  ): Promise<ReturnRequestDTO> {
    // Backend expects multipart/form-data because it accepts file uploads
    const formData = new FormData();
    formData.append("returnRequestId", String(decision.returnRequestId));
    formData.append("decision", decision.decision);

    if (decision.decisionNotes) {
      formData.append("decisionNotes", decision.decisionNotes);
    }

    if (refundScreenshot) {
      formData.append("refundScreenshot", refundScreenshot);
    }

    const response = await apiClient.post(
      API_ENDPOINTS.RETURNS.ADMIN_REVIEW,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  }

  /**
   * Get return statistics efficiently from a single API call
   */
  async getReturnStatistics(filters: ReturnRequestFilters = {}): Promise<{
    total: number;
    pending: number;
    approved: number;
    denied: number;
    completed: number;
  }> {
    try {
      // Get all return requests with current filters to calculate statistics
      const response = await this.getAllReturnRequests({
        page: 0,
        size: 1000, // Get a large number to calculate accurate statistics
        filters: { ...filters, status: "ALL" }, // Override status to get all for statistics
      });

      const returnRequests = response.content;

      // Calculate statistics from the filtered results
      const statistics = {
        total: returnRequests.length,
        pending: returnRequests.filter((r) => r.status === "PENDING").length,
        approved: returnRequests.filter((r) => r.status === "APPROVED").length,
        denied: returnRequests.filter((r) => r.status === "DENIED").length,
        completed: returnRequests.filter((r) => r.status === "COMPLETED")
          .length,
      };

      return statistics;
    } catch (error) {
      console.error("Failed to fetch return statistics:", error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        denied: 0,
        completed: 0,
      };
    }
  }
}

export const returnService = new ReturnService();
export default returnService;
