import apiClient from "../api-client";

// Streamlined interface for delivery agent returns table
export interface DeliveryAgentReturnRequest {
  id: number;
  reason: string;
  status: ReturnStatus;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
  
  // Order information
  orderId: number;
  orderNumber: string;
  orderDate: string;
  
  // Customer information
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  
  // Delivery agent information
  deliveryAgentId: string;
  deliveryAgentName: string;
}

// Comprehensive interface for return request details page
export interface DeliveryAgentReturnDetails {
  id: number;
  reason: string;
  status: ReturnStatus;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  decisionAt?: string;
  decisionNotes?: string;
  
  // Order information
  orderId: number;
  orderNumber: string;
  orderDate: string;
  orderTotal: number;
  
  // Customer information
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  
  // Pickup address with coordinates
  pickupAddress: {
    street: string;
    country: string;
    regions: string;
    roadName?: string;
    latitude?: number;
    longitude?: number;
    fullAddress: string;
  };
  
  // Return items with product details
  returnItems: ReturnItemDetails[];
  
  // Delivery agent information
  deliveryAgentId: string;
  deliveryAgentName: string;
  assignedAt?: string;
  
  // Pickup tracking
  pickupScheduledAt?: string;
  pickupStartedAt?: string;
  pickupCompletedAt?: string;
}

export interface ReturnItemDetails {
  id: number;
  returnQuantity: number;
  itemReason?: string;
  returnable: boolean;
  
  // Product information
  product: {
    productId: string;
    name: string;
    description?: string;
    brand?: string;
    category?: string;
    imageUrls: string[];
    returnable: boolean;
    returnWindowDays?: number;
  };
  
  // Variant information (if applicable)
  variant?: {
    variantId: number;
    variantName?: string;
    color?: string;
    size?: string;
    material?: string;
    variantImageUrls: string[];
    variantPrice: number;
  };
  
  // Order item reference
  orderQuantity: number;
  unitPrice: number;
  totalPrice: number;
}

export enum ReturnStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  DENIED = "DENIED",
  COMPLETED = "COMPLETED"
}

export enum DeliveryStatus {
  NOT_ASSIGNED = "NOT_ASSIGNED",
  ASSIGNED = "ASSIGNED",
  PICKUP_SCHEDULED = "PICKUP_SCHEDULED",
  PICKUP_IN_PROGRESS = "PICKUP_IN_PROGRESS",
  PICKUP_COMPLETED = "PICKUP_COMPLETED",
  PICKUP_FAILED = "PICKUP_FAILED",
  CANCELLED = "CANCELLED"
}

export interface DeliveryAgentStats {
  totalAssigned: number;
  pickupScheduled: number;
  pickupInProgress: number;
  pickupCompleted: number;
  pickupFailed: number;
  successRate: number;
}

export interface ReturnRequestFilters {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  returnStatus?: string;
  deliveryStatus?: string;
  startDate?: string;
  endDate?: string;
  customerName?: string;
  orderNumber?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

class DeliveryAgentReturnsService {
  private readonly baseUrl = '/delivery-agent/returns';

  /**
   * Get return requests assigned to the current delivery agent
   */
  async getAssignedReturnRequests(filters: ReturnRequestFilters = {}): Promise<PaginatedResponse<DeliveryAgentReturnRequest>> {
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);
    
    // Add filter parameters
    if (filters.returnStatus) params.append('returnStatus', filters.returnStatus);
    if (filters.deliveryStatus) params.append('deliveryStatus', filters.deliveryStatus);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.customerName) params.append('customerName', filters.customerName);
    if (filters.orderNumber) params.append('orderNumber', filters.orderNumber);

    const response = await apiClient.get(`${this.baseUrl}?${params.toString()}`);
    return response.data;
  }

  /**
   * Get return request details by ID
   */
  async getReturnRequestById(returnRequestId: string): Promise<DeliveryAgentReturnRequest> {
    const response = await apiClient.get(`${this.baseUrl}/${returnRequestId}`);
    return response.data;
  }

  /**
   * Get comprehensive return request details for delivery agent
   */
  async getReturnRequestDetails(returnRequestId: string): Promise<DeliveryAgentReturnDetails> {
    const response = await apiClient.get(`${this.baseUrl}/${returnRequestId}/details`);
    return response.data;
  }

  /**
   * Update delivery status of a return request
   */
  async updateDeliveryStatus(
    returnRequestId: string, 
    deliveryStatus: DeliveryStatus, 
    notes?: string
  ): Promise<DeliveryAgentReturnRequest> {
    const params = new URLSearchParams();
    params.append('deliveryStatus', deliveryStatus);
    if (notes) params.append('notes', notes);

    const response = await apiClient.put(`${this.baseUrl}/${returnRequestId}/delivery-status?${params.toString()}`);
    return response.data;
  }

  /**
   * Get delivery agent statistics
   */
  async getDeliveryAgentStats(): Promise<DeliveryAgentStats> {
    const response = await apiClient.get(`${this.baseUrl}/stats`);
    return response.data;
  }

  /**
   * Helper method to get status display information
   */
  getReturnStatusInfo(status: ReturnStatus) {
    switch (status) {
      case ReturnStatus.PENDING:
        return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
      case ReturnStatus.APPROVED:
        return { label: 'Approved', color: 'bg-green-100 text-green-800' };
      case ReturnStatus.DENIED:
        return { label: 'Denied', color: 'bg-red-100 text-red-800' };
      case ReturnStatus.COMPLETED:
        return { label: 'Completed', color: 'bg-green-100 text-green-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  }

  /**
   * Helper method to get delivery status display information
   */
  getDeliveryStatusInfo(status: DeliveryStatus) {
    switch (status) {
      case DeliveryStatus.NOT_ASSIGNED:
        return { label: 'Not Assigned', color: 'bg-gray-100 text-gray-800' };
      case DeliveryStatus.ASSIGNED:
        return { label: 'Assigned', color: 'bg-green-100 text-green-800' };
      case DeliveryStatus.PICKUP_SCHEDULED:
        return { label: 'Pickup Scheduled', color: 'bg-purple-100 text-purple-800' };
      case DeliveryStatus.PICKUP_IN_PROGRESS:
        return { label: 'Pickup In Progress', color: 'bg-orange-100 text-orange-800' };
      case DeliveryStatus.PICKUP_COMPLETED:
        return { label: 'Pickup Completed', color: 'bg-green-100 text-green-800' };
      case DeliveryStatus.PICKUP_FAILED:
        return { label: 'Pickup Failed', color: 'bg-red-100 text-red-800' };
      case DeliveryStatus.CANCELLED:
        return { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  }

  /**
   * Helper method to check if status can be updated
   */
  canUpdateDeliveryStatus(currentStatus: DeliveryStatus, newStatus: DeliveryStatus): boolean {
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      [DeliveryStatus.NOT_ASSIGNED]: [],
      [DeliveryStatus.ASSIGNED]: [
        DeliveryStatus.PICKUP_SCHEDULED,
        DeliveryStatus.PICKUP_IN_PROGRESS,
        DeliveryStatus.CANCELLED
      ],
      [DeliveryStatus.PICKUP_SCHEDULED]: [
        DeliveryStatus.PICKUP_IN_PROGRESS,
        DeliveryStatus.CANCELLED
      ],
      [DeliveryStatus.PICKUP_IN_PROGRESS]: [
        DeliveryStatus.PICKUP_COMPLETED,
        DeliveryStatus.PICKUP_FAILED
      ],
      [DeliveryStatus.PICKUP_COMPLETED]: [],
      [DeliveryStatus.PICKUP_FAILED]: [
        DeliveryStatus.PICKUP_SCHEDULED,
        DeliveryStatus.PICKUP_IN_PROGRESS
      ],
      [DeliveryStatus.CANCELLED]: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Get available next statuses for current delivery status
   */
  getAvailableNextStatuses(currentStatus: DeliveryStatus): DeliveryStatus[] {
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      [DeliveryStatus.NOT_ASSIGNED]: [],
      [DeliveryStatus.ASSIGNED]: [
        DeliveryStatus.PICKUP_SCHEDULED,
        DeliveryStatus.PICKUP_IN_PROGRESS,
        DeliveryStatus.CANCELLED
      ],
      [DeliveryStatus.PICKUP_SCHEDULED]: [
        DeliveryStatus.PICKUP_IN_PROGRESS,
        DeliveryStatus.CANCELLED
      ],
      [DeliveryStatus.PICKUP_IN_PROGRESS]: [
        DeliveryStatus.PICKUP_COMPLETED,
        DeliveryStatus.PICKUP_FAILED
      ],
      [DeliveryStatus.PICKUP_COMPLETED]: [],
      [DeliveryStatus.PICKUP_FAILED]: [
        DeliveryStatus.PICKUP_SCHEDULED,
        DeliveryStatus.PICKUP_IN_PROGRESS
      ],
      [DeliveryStatus.CANCELLED]: []
    };

    return validTransitions[currentStatus] || [];
  }
}

export const deliveryAgentReturnsService = new DeliveryAgentReturnsService();
