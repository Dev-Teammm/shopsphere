import apiClient from "../api-client";
import { API_ENDPOINTS } from "../constants";

// Types based on backend DTOs
export interface CreateAdminInvitationDTO {
  email: string;
  firstName: string;
  lastName: string;
  assignedRole: string;
  shopId?: string;
  invitationMessage?: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  notes?: string;
}

export interface UpdateAdminInvitationDTO {
  email?: string;
  role?: string;
  message?: string;
}

export interface AdminInvitationDTO {
  invitationId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  assignedRole: string;
  invitationToken: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  invitedById: string;
  invitedByName: string;
  invitedByEmail: string;
  acceptedById: string | null;
  acceptedByName: string | null;
  acceptedByEmail: string | null;
  invitationMessage: string | null;
  department: string | null;
  position: string | null;
  phoneNumber: string | null;
  notes: string | null;
  shopId?: string | null;
  shopName?: string | null;
  canBeAccepted: boolean;
  canBeCancelled: boolean;
  expired: boolean;
}

export interface AdminInvitationSearchDTO {
  email?: string;
  assignedRole?: string;
  status?: string;
  invitedById?: string;
  createdAfter?: string;
  createdBefore?: string;
  expiredAfter?: string;
  expiredBefore?: string;
}

export interface AcceptInvitationDTO {
  invitationToken: string;
  password?: string;
  phoneNumber?: string;
}

export interface InvitationValidationResponse {
  isValid: boolean;
  isExpired: boolean;
  canBeAccepted: boolean;
  userExists?: boolean;
}

export interface InvitationStatistics {
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  cancelled: number;
  expiredPending: number;
  total: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalElements: number;
    size: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string>; // Field-specific validation errors
}

class AdminInvitationService {
  // Create a new admin invitation
  async createInvitation(
    invitationData: CreateAdminInvitationDTO,
    shopId?: string
  ): Promise<ApiResponse<AdminInvitationDTO>> {
    try {
      const payload: CreateAdminInvitationDTO = {
        ...invitationData,
        shopId: invitationData.shopId ?? shopId,
      };
      const response = await apiClient.post(
        `${API_ENDPOINTS.INVITATIONS.BASE}`,
        payload
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create invitation",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Update an existing admin invitation
  async updateInvitation(
    invitationId: string,
    updateData: UpdateAdminInvitationDTO
  ): Promise<ApiResponse<AdminInvitationDTO>> {
    try {
      const response = await apiClient.put(
        `${API_ENDPOINTS.INVITATIONS.BASE}/${invitationId}`,
        updateData
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update invitation",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Delete an admin invitation
  async deleteInvitation(invitationId: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiClient.delete(
        `${API_ENDPOINTS.INVITATIONS.BASE}/${invitationId}`
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete invitation",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Cancel an admin invitation
  async cancelInvitation(invitationId: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiClient.post(
        `${API_ENDPOINTS.INVITATIONS.BASE}/${invitationId}/cancel`
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to cancel invitation",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Resend an admin invitation
  async resendInvitation(invitationId: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiClient.post(
        `${API_ENDPOINTS.INVITATIONS.BASE}/${invitationId}/resend`
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to resend invitation",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Get invitation by ID
  async getInvitationById(
    invitationId: string
  ): Promise<ApiResponse<AdminInvitationDTO>> {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.INVITATIONS.BASE}/${invitationId}`
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get invitation",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Get invitation by token (public endpoint)
  async getInvitationByToken(
    invitationToken: string
  ): Promise<ApiResponse<AdminInvitationDTO>> {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.INVITATIONS.BASE}/token/${invitationToken}`
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get invitation",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Get all invitations with pagination
  async getAllInvitations(
    page: number = 0,
    size: number = 10,
    sortBy: string = "createdAt",
    sortDirection: string = "desc",
    shopId?: string
  ): Promise<ApiResponse<AdminInvitationDTO[]>> {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.INVITATIONS.BASE}`,
        {
          params: {
            page,
            size,
            sortBy,
            sortDirection,
            ...(shopId ? { shopId } : {}),
          },
        }
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get invitations",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Search invitations
  async searchInvitations(
    searchDTO: AdminInvitationSearchDTO,
    page: number = 0,
    size: number = 10,
    shopId?: string
  ): Promise<ApiResponse<AdminInvitationDTO[]>> {
    try {
      const response = await apiClient.post(
        `${API_ENDPOINTS.INVITATIONS.BASE}/search`,
        searchDTO,
        {
          params: { page, size, ...(shopId ? { shopId } : {}) },
        }
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to search invitations",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Get invitations by status
  async getInvitationsByStatus(
    status: string,
    page: number = 0,
    size: number = 10,
    shopId?: string
  ): Promise<ApiResponse<AdminInvitationDTO[]>> {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.INVITATIONS.BASE}/status/${status}`,
        {
          params: { page, size, ...(shopId ? { shopId } : {}) },
        }
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to get invitations by status",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Accept invitation (public endpoint)
  async acceptInvitation(
    acceptData: AcceptInvitationDTO
  ): Promise<ApiResponse<AdminInvitationDTO>> {
    try {
      const response = await apiClient.post(
        `${API_ENDPOINTS.INVITATIONS.BASE}/accept`,
        acceptData
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to accept invitation",
        error: error.response?.data?.message || "Network error",
        errors: error.response?.data?.errors || undefined, // Include field-specific errors
      };
    }
  }

  // Decline invitation (public endpoint)
  async declineInvitation(
    invitationToken: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiClient.post(
        `${API_ENDPOINTS.INVITATIONS.BASE}/decline/${invitationToken}`
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to decline invitation",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Validate invitation (public endpoint)
  async validateInvitation(
    invitationToken: string
  ): Promise<ApiResponse<InvitationValidationResponse>> {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.INVITATIONS.BASE}/validate/${invitationToken}`
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to validate invitation",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Check if user exists for invitation (public endpoint)
  async checkUserExists(
    invitationToken: string
  ): Promise<ApiResponse<{ userExists: boolean }>> {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.INVITATIONS.BASE}/check-user-exists/${invitationToken}`
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to check user existence",
        error: error.response?.data?.message || "Network error",
        data: { userExists: false },
      };
    }
  }

  // Get invitation statistics
  async getInvitationStatistics(
    shopId?: string
  ): Promise<ApiResponse<InvitationStatistics>> {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.INVITATIONS.BASE}/statistics`,
        { params: { ...(shopId ? { shopId } : {}) } }
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to get invitation statistics",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Mark expired invitations
  async markExpiredInvitations(shopId?: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiClient.post(
        `${API_ENDPOINTS.INVITATIONS.BASE}/expired/mark`,
        undefined,
        { params: { ...(shopId ? { shopId } : {}) } }
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to mark expired invitations",
        error: error.response?.data?.message || "Network error",
      };
    }
  }

  // Delete expired invitations
  async deleteExpiredInvitations(
    shopId?: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiClient.delete(
        `${API_ENDPOINTS.INVITATIONS.BASE}/expired`,
        { params: { ...(shopId ? { shopId } : {}) } }
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to delete expired invitations",
        error: error.response?.data?.message || "Network error",
      };
    }
  }
  // Release a shop member back to CUSTOMER (vendor-only)
  async releaseShopMember(
    shopId: string,
    userId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiClient.delete(
        `${API_ENDPOINTS.INVITATIONS.BASE}/shops/${shopId}/members/${userId}/release`
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to release shop member",
        error: error.response?.data?.message || "Network error",
      };
    }
  }
}

export const adminInvitationService = new AdminInvitationService();
export default adminInvitationService;
