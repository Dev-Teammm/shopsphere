import apiClient from "../api-client";
import { API_ENDPOINTS } from "../constants";

export interface ShopDTO {
  shopId: string;
  name: string;
  description?: string;
  slug: string;
  logoUrl?: string;
  status: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  isActive?: boolean;
  isTrulyActive?: boolean;
  category?: string;
  shopCategoryId?: number;
  shopCategoryName?: string;
  primaryCapability?: string;
  capabilities?: string[];
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
  stripeAccount?: StripeAccountDTO;
}

export interface StripeAccountDTO {
  id?: string;
  shopId?: string;
  shopName?: string;
  stripeAccountId: string;
  accountStatus: string;
  accountType?: string;
  isVerified?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  country?: string;
  currency?: string;
  businessType?: string;
  businessName?: string;
  businessUrl?: string;
  businessPhone?: string;
  supportEmail?: string;
  bankAccountId?: string;
  bankName?: string;
  bankLast4?: string;
  routingNumber?: string;
  requirements?: string;
  capabilities?: string;
  verificationStatus?: string;
  metadata?: string;
}

class ShopService {
  async getUserShops(): Promise<ShopDTO[]> {
    try {
      const response = await apiClient.get<ShopDTO[]>(
        API_ENDPOINTS.SHOPS.USER_SHOPS,
      );

      if (Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error: any) {
      console.error("Error fetching user shops:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error("Unauthorized. Please log in again.");
      }

      if (error.response?.status === 404) {
        return [];
      }

      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch shops. Please try again later.",
      );
    }
  }

  async getShopById(shopId: string): Promise<ShopDTO> {
    try {
      const response = await apiClient.get<ShopDTO>(
        API_ENDPOINTS.SHOPS.BY_ID(shopId),
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching shop:", error);
      throw error;
    }
  }

  async getShopBySlug(slug: string): Promise<ShopDTO> {
    try {
      const response = await apiClient.get<ShopDTO>(
        `${API_ENDPOINTS.SHOPS.BASE}/slug/${slug}`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching shop by slug:", error);
      if (error.response?.status === 404) {
        throw new Error("Shop not found");
      }
      throw error;
    }
  }

  async createShop(shopData: Partial<ShopDTO>): Promise<ShopDTO> {
    try {
      const token = localStorage.getItem("authToken");
      console.log("[ShopService] Creating shop - token present:", !!token);

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      console.log(
        "[ShopService] Sending JSON request with Authorization header",
      );
      const response = await apiClient.post<ShopDTO>(
        API_ENDPOINTS.SHOPS.BASE,
        shopData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error("[ShopService] Error creating shop:", error);
      if (error.response?.status === 403) {
        throw new Error(
          "Access denied. Please check your permissions or log in again.",
        );
      }
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create shop. Please try again.",
      );
    }
  }

  async createShopWithLogo(
    shopData: Partial<ShopDTO>,
    logoFile: File,
  ): Promise<ShopDTO> {
    try {
      const token = localStorage.getItem("authToken");
      console.log(
        "[ShopService] Creating shop with logo - token present:",
        !!token,
      );

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const formData = new FormData();
      formData.append("name", shopData.name || "");
      if (shopData.description) {
        formData.append("description", shopData.description);
      }
      formData.append("contactEmail", shopData.contactEmail || "");
      formData.append("contactPhone", shopData.contactPhone || "");
      formData.append("address", shopData.address || "");
      formData.append("isActive", String(shopData.isActive ?? true));
      formData.append("logo", logoFile);

      console.log(
        "[ShopService] Sending multipart request with Authorization header",
      );
      const response = await apiClient.post<ShopDTO>(
        `${API_ENDPOINTS.SHOPS.BASE}/with-logo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error("[ShopService] Error creating shop with logo:", error);
      if (error.response?.status === 403) {
        throw new Error(
          "Access denied. Please check your permissions or log in again.",
        );
      }
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create shop. Please try again.",
      );
    }
  }

  async connectStripeAccount(
    shopId: string,
    stripeAccountData: StripeAccountDTO,
  ): Promise<{
    message: string;
    stripeAccount: StripeAccountDTO;
    shopActivated: boolean;
  }> {
    try {
      const token = localStorage.getItem("authToken");
      console.log("[ShopService] Connecting Stripe account for shop:", shopId);

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await apiClient.post(
        `${API_ENDPOINTS.STRIPE_ACCOUNTS.BASE}/shops/${shopId}/connect`,
        stripeAccountData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error("[ShopService] Error connecting Stripe account:", error);
      if (error.response?.status === 403) {
        throw new Error(
          "Access denied. You can only connect Stripe accounts for your own shops.",
        );
      }
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to connect Stripe account. Please try again.",
      );
    }
  }

  async updateShop(
    shopId: string,
    shopData: Partial<ShopDTO>,
  ): Promise<ShopDTO> {
    try {
      const token = localStorage.getItem("authToken");
      console.log("[ShopService] Updating shop:", shopId);

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await apiClient.put<ShopDTO>(
        API_ENDPOINTS.SHOPS.BY_ID(shopId),
        shopData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error("[ShopService] Error updating shop:", error);
      if (error.response?.status === 403) {
        throw new Error("Access denied. You can only update your own shops.");
      }
      if (error.response?.status === 404) {
        throw new Error("Shop not found.");
      }
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update shop. Please try again.",
      );
    }
  }
}

export const shopService = new ShopService();
