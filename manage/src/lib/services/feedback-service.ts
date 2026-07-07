import apiClient from "../api-client";
import { API_ENDPOINTS } from "../constants";

export interface SubmitFeedbackRequest {
  username: string;
  email: string;
  content: string;
}

export interface FeedbackDTO {
  id: number;
  username: string;
  email: string;
  content: string;
  createdAt: string;
}

export interface FeedbackListParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
  sort?: string;
  direction?: "ASC" | "DESC";
}

export interface FeedbackListResponse {
  success: boolean;
  data: FeedbackDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

class FeedbackService {
  /**
   * Submit feedback (public, no auth required).
   */
  async submit(request: SubmitFeedbackRequest): Promise<{ success: boolean; data: FeedbackDTO; message: string }> {
    const response = await apiClient.post(API_ENDPOINTS.FEEDBACK.BASE, request);
    return response.data;
  }

  /**
   * List feedback (admin only).
   */
  async list(params: FeedbackListParams = {}): Promise<FeedbackListResponse> {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.dateFrom) q.set("dateFrom", params.dateFrom);
    if (params.dateTo) q.set("dateTo", params.dateTo);
    if (params.page !== undefined) q.set("page", String(params.page));
    if (params.size !== undefined) q.set("size", String(params.size));
    if (params.sort) q.set("sort", params.sort);
    if (params.direction) q.set("direction", params.direction);
    const response = await apiClient.get(`${API_ENDPOINTS.FEEDBACK.BASE}?${q}`);
    return response.data;
  }

  /**
   * Get one feedback by id (admin only).
   */
  async getById(id: number): Promise<{ success: boolean; data: FeedbackDTO }> {
    const response = await apiClient.get(API_ENDPOINTS.FEEDBACK.BY_ID(id));
    return response.data;
  }

  /**
   * Delete feedback (admin only).
   */
  async deleteById(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(API_ENDPOINTS.FEEDBACK.BY_ID(id));
    return response.data;
  }
}

export const feedbackService = new FeedbackService();
