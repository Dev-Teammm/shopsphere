import apiClient from '../api-client';

// Types for delivery assignment
export interface DeliveryAgent {
  id: string;
  firstName: string;
  lastName: string;
  userEmail: string;
  phoneNumber?: string;
  role: string;
  emailVerified: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAgentWorkload {
  deliveryAgentId: string;
  deliveryAgentName: string;
  totalAssignedReturns: number;
  pendingPickups: number;
  scheduledPickups: number;
  inProgressPickups: number;
  completedPickups: number;
  cancelledPickups: number;
  successRate: number;
  averagePickupTime?: number;
  lastPickupDate?: string;
}

export interface AssignDeliveryAgentRequest {
  returnRequestId: number;
  deliveryAgentId: string;
  notes?: string;
}

export interface ReturnDeliveryAssignment {
  id: number;
  returnRequestId: number;
  deliveryAgentId: string;
  deliveryAgentName: string;
  assignedAt: string;
  assignedBy: string;
  deliveryStatus: 'ASSIGNED' | 'PICKUP_SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledPickupTime?: string;
  actualPickupTime?: string;
  estimatedPickupTime?: string;
  pickupNotes?: string;
  assignmentNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryStats {
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  cancelledAssignments: number;
  averagePickupTime: number;
  successRate: number;
  activeDeliveryAgents: number;
  totalDeliveryAgents: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

class DeliveryAssignmentService {
  private readonly baseUrl = '/return-delivery';

  /**
   * Assign a delivery agent to a return request
   */
  async assignDeliveryAgent(request: AssignDeliveryAgentRequest): Promise<ReturnDeliveryAssignment> {
    const response = await apiClient.post(`${this.baseUrl}/assign`, request);
    return response.data;
  }

  /**
   * Get all available delivery agents
   */
  async getAvailableDeliveryAgents(): Promise<DeliveryAgent[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/agents/available`);
      return response.data;
    } catch (error) {
      console.error('Error fetching delivery agents:', error);
      throw error;
    }
  }

  /**
   * Search available delivery agents with pagination
   */
  async searchAvailableDeliveryAgents(params: {
    search?: string;
    page?: number;
    size?: number;
    sort?: string;
    direction?: 'ASC' | 'DESC';
  } = {}): Promise<PaginatedResponse<DeliveryAgent>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.search) queryParams.append('search', params.search);
      if (params.page !== undefined) queryParams.append('page', params.page.toString());
      if (params.size !== undefined) queryParams.append('size', params.size.toString());
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.direction) queryParams.append('direction', params.direction);

      const response = await apiClient.get(`${this.baseUrl}/agents/search?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error searching delivery agents:', error);
      throw error;
    }
  }

  /**
   * Get delivery agent workload
   */
  async getDeliveryAgentWorkload(deliveryAgentId: string): Promise<DeliveryAgentWorkload> {
    const response = await apiClient.get(`${this.baseUrl}/agents/${deliveryAgentId}/workload`);
    return response.data;
  }
}

export default new DeliveryAssignmentService();
