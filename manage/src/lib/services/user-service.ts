import { API_ENDPOINTS } from "../constants";
import apiClient from "../api-client";

export interface UserDTO {
  id: string;
  firstName: string;
  lastName: string;
  userEmail: string;
  phoneNumber?: string;
  role: string;
  enabled: boolean;
  createdAt: string;
}

export interface DeliveryAgentsResponse {
  content: UserDTO[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface DeliveryAssignmentDTO {
  id: number;
  orderId: number;
  agentId: string;
  assignedAt: string;
  status: string;
  notes?: string;
}

export const userService = {
  /**
   * Get all delivery agents with pagination
   */
  async getDeliveryAgents(
    page: number = 0,
    size: number = 10
  ): Promise<DeliveryAgentsResponse> {
    const response = await apiClient.get(API_ENDPOINTS.USERS.DELIVERY_AGENTS, {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Assign a delivery agent to an order
   */
  // async assignDeliveryAgent(
  //   orderId: string,
  //   agentId: string
  // ): Promise<DeliveryAssignmentDTO> {
  //   const response = await apiClient.post(API_ENDPOINTS.DELIVERY.ASSIGN, null, {
  //     params: { orderId, agentId },
  //   });
  //   return response.data;
  // },

  /**
   * Change the delivery agent for an order
   */
  // async changeDeliveryAgent(
  //   orderId: string,
  //   newAgentId: string
  // ): Promise<DeliveryAssignmentDTO> {
  //   const response = await apiClient.put(
  //     API_ENDPOINTS.DELIVERY.CHANGE_AGENT,
  //     null,
  //     {
  //       params: { orderId, newAgentId },
  //     }
  //   );
  //   return response.data;
  // },

  /**
   * Unassign delivery agent from an order
   */
  // async unassignDeliveryAgent(orderId: string): Promise<void> {
  //   await apiClient.delete(API_ENDPOINTS.DELIVERY.UNASSIGN, {
  //     params: { orderId },
  //   });
  // },

  /**
   * Cancel a delivery assignment
   */
  // async cancelDeliveryAssignment(assignmentId: string): Promise<void> {
  //   await apiClient.put(API_ENDPOINTS.DELIVERY.CANCEL(assignmentId));
  // },

  /**
   * Get all delivery assignments
   */
  // async getAllDeliveryAssignments(): Promise<DeliveryAssignmentDTO[]> {
  //   const response = await apiClient.get(
  //     API_ENDPOINTS.DELIVERY.ALL_ASSIGNMENTS
  //   );
  //   return response.data;
  // },

  /**
   * Get delivery assignment for a specific order
   */
  // async getDeliveryAssignmentByOrder(
  //   orderId: string
  // ): Promise<DeliveryAssignmentDTO> {
  //   const response = await apiClient.get(
  //     API_ENDPOINTS.DELIVERY.BY_ORDER(orderId)
  //   );
  //   return response.data;
  // },
};
