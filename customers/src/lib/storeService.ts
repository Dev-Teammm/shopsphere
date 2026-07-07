import { API_ENDPOINTS, API_BASE_URL, apiCall } from "./api";

export interface Shop {
  shopId: string;
  name: string;
  description: string;
  logoUrl?: string; // Corresponds to 'image' in UI
  rating: number;
  totalReviews: number;
  productCount: number;
  followerCount?: number;
  isFollowing?: boolean;
  primaryCapability?: string;
  capabilities?: string[];
  address?: string; // Corresponds to 'location' in UI
  ownerName?: string; // Corresponds to 'owner' in UI
  ownerEmail?: string;
  category?: string;
  isActive: boolean;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
  createdAt: string; // Corresponds to 'joinedDate' in UI
}

export interface ShopSearchResponse {
  content: Shop[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export const StoreService = {
  /**
   * Search shops with parameters
   */
  searchShops: async (
    search: string = "",
    category: string = "",
    page: number = 0,
    size: number = 10,
    sort: string = "followers-desc",
    followedOnly: boolean = false,
  ): Promise<ShopSearchResponse> => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (category && category !== "all") params.append("category", category);
    if (followedOnly) params.append("followedOnly", "true");
    params.append("page", page.toString());
    params.append("size", size.toString());
    params.append("sort", sort);

    const url = `${API_ENDPOINTS.SEARCH_SHOPS}?${params.toString()}`;

    // Send auth token if available so backend can include isFollowing status
    const token = localStorage.getItem("authToken");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `${response.status == 403 ? "Not logged in" : "Something went wrong"}`,
      );
    }

    return await response.json();
  },

  /**
   * Follow a shop
   */
  followShop: async (shopId: string): Promise<void> => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authentication required");
    }
    await fetch(`${API_ENDPOINTS.SHOP_BY_ID(shopId)}/follow`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  },

  /**
   * Unfollow a shop
   */
  unfollowShop: async (shopId: string): Promise<void> => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authentication required");
    }
    await fetch(`${API_ENDPOINTS.SHOP_BY_ID(shopId)}/follow`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  },

  /**
   * Get shop by ID
   */
  getShopById: async (shopId: string): Promise<Shop> => {
    return apiCall<Shop>(API_ENDPOINTS.SHOP_BY_ID(shopId));
  },

  /**
   * Get shop details including owner and featured products
   */
  getShopDetails: async (shopId: string): Promise<any> => {
    const token = localStorage.getItem("authToken");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add auth header if token exists (for authenticated users to get isFollowing)
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(API_ENDPOINTS.SHOP_DETAILS(shopId), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `${response.status == 403 ? "Not logged in" : "Something went wrong"}`,
      );
    }

    return await response.json();
  },

  /**
   * Get warehouses for a shop (public, paginated)
   */
  getWarehouses: async (
    shopId: string,
    page: number = 0,
    size: number = 10,
  ): Promise<{
    content: Warehouse[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
  }> => {
    const response = await fetch(
      `${API_BASE_URL}/warehouses/public/shops/${shopId}?page=${page}&size=${size}&sort=name`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `${response.status == 403 ? "Not logged in" : "Something went wrong"}`,
      );
    }

    return await response.json();
  },

  /**
   * Get delivery areas for a shop (public, paginated)
   */
  getDeliveryAreas: async (
    shopId: string,
    page: number = 0,
    size: number = 10,
  ): Promise<{
    content: DeliveryArea[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
  }> => {
    const response = await fetch(
      `${API_BASE_URL}/shops/${shopId}/delivery-areas/public?page=${page}&size=${size}&sortBy=name&sortDirection=ASC`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `${response.status == 403 ? "Not logged in" : "Something went wrong"}`,
      );
    }

    return await response.json();
  },
};

export interface Warehouse {
  id: number;
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  country: string;
  phone?: string;
  email?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  productCount: number;
  shopId: string;
  shopName?: string;
  createdAt: string;
  updatedAt: string;
  images?: WarehouseImage[];
}

export interface WarehouseImage {
  id: number;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface DeliveryArea {
  id: number;
  name: string;
  description?: string;
  country: string;
  shopId: string;
  shopName?: string;
  warehouseId: number;
  warehouseName?: string;
  parentId?: number;
  parentName?: string;
  isActive: boolean;
  depth?: number;
  isRoot?: boolean;
  createdAt: string;
  updatedAt: string;
  children?: DeliveryArea[];
  childrenCount?: number;
}
