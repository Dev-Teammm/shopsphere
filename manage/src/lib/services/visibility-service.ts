import apiClient from "@/lib/api-client";

export interface VisibilityIssue {
  code: string;
  title: string;
  description: string;
  severity: "error" | "warning";
  actionLabel?: string;
  actionPath?: string;
}

export interface VisibilityStatus {
  visibleToCustomers: boolean;
  issues: VisibilityIssue[];
}

export const visibilityService = {
  async getShopVisibilityStatus(shopId: string): Promise<VisibilityStatus> {
    const response = await apiClient.get(`/shops/${shopId}/visibility-status`);
    return response.data;
  },

  async getProductVisibilityStatus(productId: string): Promise<VisibilityStatus> {
    const response = await apiClient.get(
      `/products/${productId}/visibility-status`,
    );
    return response.data;
  },
};
