"use client";

import apiClient from "../api-client";
import { API_ENDPOINTS } from "../constants";
import {
  MoneyFlowResponseDTO,
  MoneyFlowDTO,
  CreateMoneyFlowDTO,
} from "@/lib/types/money-flow";
import { AxiosError } from "axios";

class MoneyFlowService {
  /**
   * Get money flow data with automatic aggregation
   */
  async getMoneyFlow(
    start: string,
    end: string
  ): Promise<MoneyFlowResponseDTO> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MONEY_FLOW.BASE, {
        params: { start, end },
      });
      return response.data.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error fetching money flow data:", axiosError);
      throw new Error("Failed to load money flow data");
    }
  }

  /**
   * Get all transactions within a date range
   */
  async getTransactions(start: string, end: string): Promise<MoneyFlowDTO[]> {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.MONEY_FLOW.TRANSACTIONS,
        {
          params: { start, end },
        }
      );
      return response.data.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error fetching transactions:", axiosError);
      throw new Error("Failed to load transactions");
    }
  }

  /**
   * Get current account balance
   */
  async getCurrentBalance(): Promise<number> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MONEY_FLOW.BALANCE);
      return response.data.data.balance;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error fetching balance:", axiosError);
      throw new Error("Failed to load balance");
    }
  }

  /**
   * Get a specific money flow by ID
   */
  async getById(id: number): Promise<MoneyFlowDTO> {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.MONEY_FLOW.BY_ID(id)
      );
      return response.data.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error fetching money flow by ID:", axiosError);
      throw new Error("Failed to load money flow");
    }
  }

  /**
   * Create a new money flow transaction
   */
  async create(data: CreateMoneyFlowDTO): Promise<MoneyFlowDTO> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.MONEY_FLOW.BASE,
        data
      );
      return response.data.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error creating money flow:", axiosError);
      throw new Error("Failed to create money flow");
    }
  }

  /**
   * Delete a money flow transaction
   */
  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.MONEY_FLOW.BY_ID(id));
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error deleting money flow:", axiosError);
      throw new Error("Failed to delete money flow");
    }
  }
}

export const moneyFlowService = new MoneyFlowService();
