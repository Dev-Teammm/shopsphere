// Response types for admin orders matching AdminOrderDTO

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  RETURNED = "RETURNED",
  READY_FOR_DELIVERY = "READY_FOR_DELIVERY", // Backend uses READY_FOR_PICKUP but keeping for safety if used elsewhere
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
}

export enum OrderPaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export interface SimpleProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
}

export interface ProductImageDTO {
  id: string;
  imageUrl: string;
  altText?: string;
  title?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface VariantImageDTO {
  id: string;
  imageUrl: string;
  altText?: string;
  title?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface AdminOrderBatchDTO {
  batchId: string;
  batchNumber: string;
  quantityFromBatch: number;
  manufactureDate?: string;
  expiryDate?: string;
  batchStatus: string;
  supplierName?: string;
  costPrice?: number;
}

export interface AdminOrderWarehouseDTO {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation?: string;
  warehouseAddress?: string;
  warehousePhone?: string;
  warehouseManager?: string;
  quantityFromWarehouse: number;
  batches: AdminOrderBatchDTO[];
}

export interface AdminOrderItemDTO {
  id: string;
  productId: string;
  variantId?: string;
  product: SimpleProductDTO;
  quantity: number;
  price: number;
  originalPrice?: number;
  totalPrice: number;
  discountPercentage?: number;
  discountName?: string;
  hasDiscount?: boolean;
  availableStock: number;
  warehouses: AdminOrderWarehouseDTO[];
}

export interface AdminOrderAddressDTO {
  id: string;
  street: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  latitude?: number;
  longitude?: number;
}

export interface AdminPaymentInfoDTO {
  paymentMethod: string;
  paymentStatus: string;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  transactionRef?: string;
  paymentDate?: string;
  receiptUrl?: string;
  pointsUsed?: number;
  pointsValue?: number;
}

export interface DeliveryGroupInfoDTO {
  deliveryGroupId: number;
  deliveryGroupName: string;
  deliveryGroupDescription?: string;
  delivererId: string;
  delivererName: string;
  shopId: string;
  delivererEmail?: string;
  delivererPhone?: string;
  memberCount: number;
  hasDeliveryStarted: boolean;
  deliveryStartedAt?: string;
  hasDeliveryFinished: boolean;
  deliveryFinishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  status: "READY" | "IN_PROGRESS" | "COMPLETED";
}

export interface AdminShopOrderDTO {
  shopOrderId: string;
  shopOrderCode: string;
  shopId: string;
  shopName: string;
  shopLogo?: string;
  status: string;
  items: AdminOrderItemDTO[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  pickupToken?: string;
  pickupTokenUsed?: boolean;
  fulfillmentType?: string; // "PICKUP" or "DELIVERY"
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  deliveryGroup?: DeliveryGroupInfoDTO;
  // Points-related fields for this shop order
  pointsUsed?: number;
  pointsValue?: number;
  paymentMethod?: string; // "POINTS", "HYBRID", "CARD", or "STRIPE"
}

export interface AdminOrderDTO {
  id: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  items: AdminOrderItemDTO[];
  shopOrders: AdminShopOrderDTO[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  shippingAddress: AdminOrderAddressDTO;
  billingAddress: AdminOrderAddressDTO;
  paymentInfo: AdminPaymentInfoDTO;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  deliveryGroup?: DeliveryGroupInfoDTO; // Delivery group assignment info
}

// Keep backward compatibility
export type OrderResponse = AdminOrderDTO;
export type OrderItemDTO = AdminOrderItemDTO;
export type OrderAddressDTO = AdminOrderAddressDTO;

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errorCode?: string;
  details?: string;
}

// For simple list responses
export type OrderListResponse = ApiResponse<AdminOrderDTO[]>;
export type AdminOrderListResponse = ApiResponse<AdminOrderDTO[]>;
