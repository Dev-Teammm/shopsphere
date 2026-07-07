import apiClient from "@/lib/api-client";

export interface ShopMember {
  id: string;
  firstName: string;
  lastName: string;
  userEmail: string;
  phoneNumber?: string;
  role: "EMPLOYEE" | "DELIVERY_AGENT";
  shopId: string;
  shopName?: string;
  createdAt: string;
  lastLogin?: string;
  enabled: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface ShopMembersResponse {
  content: ShopMember[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ShopMembersFilters {
  email?: string;
  username?: string;
  role?: "EMPLOYEE" | "DELIVERY_AGENT" | "";
  joinDateFrom?: string;
  joinDateTo?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

class ShopMemberService {
  async getShopMembers(
    shopId: string,
    filters: ShopMembersFilters = {}
  ): Promise<ShopMembersResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.email) params.append("email", filters.email);
      if (filters.username) params.append("username", filters.username);
      if (filters.role) params.append("role", filters.role);
      if (filters.joinDateFrom) params.append("joinDateFrom", filters.joinDateFrom);
      if (filters.joinDateTo) params.append("joinDateTo", filters.joinDateTo);
      params.append("page", String(filters.page || 0));
      params.append("size", String(filters.size || 10));
      params.append("sortBy", filters.sortBy || "createdAt");
      params.append("sortDirection", filters.sortDirection || "DESC");

      const response = await apiClient.get<ShopMembersResponse>(
        `/shops/${shopId}/members?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching shop members:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch shop members. Please try again."
      );
    }
  }

  async changeMemberRole(
    shopId: string,
    memberId: string,
    newRole: "EMPLOYEE" | "DELIVERY_AGENT"
  ): Promise<ShopMember> {
    try {
      const response = await apiClient.put<ShopMember>(
        `/shops/${shopId}/members/${memberId}/role?newRole=${newRole}`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error changing member role:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to change member role. Please try again."
      );
    }
  }

  async removeMemberFromShop(
    shopId: string,
    memberId: string
  ): Promise<void> {
    try {
      await apiClient.delete(`/shops/${shopId}/members/${memberId}`);
    } catch (error: any) {
      console.error("Error removing member from shop:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to remove member from shop. Please try again."
      );
    }
  }
}

export const shopMemberService = new ShopMemberService();
