// Return Request Types for Admin Dashboard

export interface ExpectedRefundDTO {
  paymentMethod: string;
  monetaryRefund: number;
  pointsRefund: number;
  pointsRefundValue: number;
  totalRefundValue: number;
  isFullReturn: boolean;
  itemsRefund: number;
  shippingRefund: number;
  refundDescription: string;
}

export interface ReturnRequestDTO {
  id: string | number;
  orderId: string | number;
  customerId?: string | null;
  reason: string;
  status: ReturnStatus;
  submittedAt: string;
  decisionAt?: string | null;
  decisionNotes?: string | null;
  createdAt: string;
  updatedAt: string;

  // Related data
  returnMedia?: ReturnMediaDTO[];
  returnItems: ReturnItemDTO[];
  returnAppeal?: ReturnAppealDTO | null;
  customerName?: string;
  customerEmail?: string;
  orderNumber: string;

  // Helper fields
  canBeAppealed: boolean;
  daysUntilExpiry: number;
  eligibleForReturn: boolean;
  expectedRefund?: ExpectedRefundDTO;
  totalAmount?: number;
  shopId?: string;
  shopName?: string;
  shopSlug?: string;

  // Delivery agent (when assigned)
  deliveryAgentId?: string | null;
  deliveryAgentName?: string | null;
  deliveryStatus?: string | null;
}

export interface ReturnItemDTO {
  id?: string | number;
  orderItemId: string | number;
  returnQuantity: number;
  itemReason?: string;
  productId?: string;
  variantId?: string | number;
  maxQuantity?: number;
  productName: string;
  variantName?: string;
  productImage?: string;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ReturnMediaDTO {
  id: string | number;
  returnRequestId: string | number;
  fileUrl: string;
  publicId?: string;
  fileType: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
  fileExtension?: string;
  image?: boolean;
  video?: boolean;
}

export interface ReturnAppealDTO {
  id: string;
  reason: string;
  submittedAt: string;
  status: string;
  decisionAt?: string;
  decisionNotes?: string;
  appealMedia?: ReturnMediaDTO[];
}

export type ReturnStatus = "PENDING" | "APPROVED" | "DENIED" | "COMPLETED";

export interface ReturnRequestsResponse {
  content: ReturnRequestDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  // Support for custom Map response
  data?: ReturnRequestDTO[];
  pageSize?: number;
  currentPage?: number;
  success?: boolean;
}

export interface ReturnDecisionDTO {
  returnRequestId: string | number;
  decision: "APPROVED" | "DENIED";
  decisionNotes?: string;
}

// Filter and search interfaces
export interface ReturnRequestFilters {
  status?: ReturnStatus | "ALL";
  customerType?: "ALL" | "REGISTERED" | "GUEST";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  shopId?: string;
}

export interface ReturnRequestSearchParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: "ASC" | "DESC";
  filters?: ReturnRequestFilters;
}
