import apiClient from "@/lib/api-client";

export interface AppealDTO {
  id: number;
  returnRequestId: number;
  customerId?: string;
  level: number;
  reason: string;
  description?: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  submittedAt: string;
  decisionAt?: string;
  decisionNotes?: string;
  createdAt: string;
  updatedAt: string;
  appealMedia?: AppealMediaDTO[];
  returnRequest?: {
    id: number;
    orderId: number;
    orderCode: string;
    customerName: string;
    customerEmail: string;
    status: string;
    reason: string;
    submittedAt: string;
  };
}

export interface AppealMediaDTO {
  id: number;
  appealId: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppealDecisionDTO {
  appealId: number;
  shopId: string;
  decision: "APPROVED" | "DENIED";
  notes?: string;
  refundScreenshot?: File;
}

export interface AppealFilterParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
  status?: string;
  customerName?: string;
  orderCode?: string;
  fromDate?: string;
  toDate?: string;
  shopId?: string;
}

export interface AppealPageResponse {
  content: AppealDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface AppealStats {
  pendingCount: number;
  approvedCount: number;
  deniedCount: number;
  recentCount: number;
  urgentCount: number;
  approvalRate: number;
}

class AppealService {
  private readonly baseUrl = "/appeals";

  /**
   * Get all appeals with filtering and pagination
   */
  async getAllAppeals(
    params: AppealFilterParams = {},
  ): Promise<AppealPageResponse> {
    try {
      const response = await apiClient.get<AppealPageResponse>(this.baseUrl, {
        params: {
          ...params,
          shopId: params.shopId,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching appeals:", error);
      throw error;
    }
  }

  /**
   * Get appeal by ID
   */
  async getAppealById(appealId: number): Promise<AppealDTO> {
    try {
      const response = await apiClient.get<AppealDTO>(
        `${this.baseUrl}/${appealId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching appeal details:", error);
      throw error;
    }
  }

  /**
   * Get appeal by return request ID
   */
  async getAppealByReturnRequestId(
    returnRequestId: number,
  ): Promise<AppealDTO> {
    const response = await apiClient.get(
      `${this.baseUrl}/return-request/${returnRequestId}`,
    );
    return response.data;
  }

  /**
   * Review and make decision on appeal
   */
  async reviewAppeal(decisionData: AppealDecisionDTO): Promise<AppealDTO> {
    const formData = new FormData();
    formData.append("appealId", decisionData.appealId.toString());
    formData.append("shopId", decisionData.shopId);
    formData.append("decision", decisionData.decision);
    if (decisionData.notes) {
      formData.append("notes", decisionData.notes);
    }
    if (decisionData.refundScreenshot) {
      formData.append("refundScreenshot", decisionData.refundScreenshot);
    }

    const response = await apiClient.post(`${this.baseUrl}/review`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  /**
   * Get appeal statistics
   */
  async getAppealStats(shopId?: string): Promise<AppealStats> {
    try {
      const response = await apiClient.get<AppealStats>(
        `${this.baseUrl}/stats`,
        {
          params: { shopId },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching appeal stats:", error);
      throw error;
    }
  }

  /**
   * Get pending appeals count for sidebar badge
   */
  async getPendingAppealsCount(shopId?: string): Promise<number> {
    try {
      const response = await apiClient.get<{ success: boolean; count: number }>(
        `${this.baseUrl}/pending/count`,
        {
          params: { shopId },
        },
      );
      return response.data.count || 0;
    } catch (error) {
      console.error("Error fetching pending appeals count:", error);
      return 0;
    }
  }

  /**
   * Export appeals to CSV
   */
  async exportAppeals(params: AppealFilterParams = {}): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/export`, {
      params,
      responseType: "blob",
    });
    return response.data;
  }

  /**
   * Get appeal media file
   */
  async getAppealMedia(appealId: number): Promise<AppealMediaDTO[]> {
    const response = await apiClient.get(`${this.baseUrl}/${appealId}/media`);
    return response.data;
  }
}

export const appealService = new AppealService();
export default appealService;
