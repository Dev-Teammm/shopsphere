import apiClient from "../api-client";
import { API_ENDPOINTS } from "../constants";
import {
  LoginRequest,
  LoginResponse,
  User,
  UserRegistrationDTO,
  SignupResponseDTO,
  PasswordResetRequest,
  VerifyResetCodeRequest,
  ResetPasswordRequest,
} from "../types";

/**
 * Authentication service for API calls
 */
export const authService = {
  /**
   * Login with email and password
   * @param credentials User credentials
   * @returns User data with auth details
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<any>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials,
    );

    let loginData: LoginResponse;
    if (response.data.success && response.data.data) {
      loginData = response.data.data;
    } else {
      loginData = response.data;
    }

    if (loginData.token) {
      const allowedRoles = [
        "ADMIN",
        "EMPLOYEE",
        "DELIVERY_AGENT",
        "VENDOR",
        "CUSTOMER",
      ];

      if (allowedRoles.includes(loginData.role)) {
        localStorage.setItem("authToken", loginData.token);
        apiClient.defaults.headers.common["Authorization"] =
          `Bearer ${loginData.token}`;
        apiClient.defaults.headers.Authorization = `Bearer ${loginData.token}`;
      }
    }

    return loginData;
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("authToken");
      delete apiClient.defaults.headers.common["Authorization"];
      delete apiClient.defaults.headers.Authorization;
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
      }
    }
  },

  /**
   * Get the current logged in user
   * @returns User data
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<any>(API_ENDPOINTS.AUTH.ME);

    let userData: User;
    if (response.data.success && response.data.data) {
      userData = response.data.data;
    } else {
      userData = response.data;
    }

    return userData;
  },

  /**
   * Register a new user
   * @param userData Registration data
   * @returns Signup response
   */
  async register(userData: UserRegistrationDTO): Promise<SignupResponseDTO> {
    const response = await apiClient.post<any>(
      API_ENDPOINTS.AUTH.REGISTER,
      userData,
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },

  /**
   * Request a password reset link
   * @param request Password reset request
   * @returns Success message
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<string> {
    const response = await apiClient.post<any>(
      API_ENDPOINTS.AUTH.PASSWORD_RESET_REQUEST,
      request,
    );

    return response.data.message || response.data;
  },

  /**
   * Verify verification code for reset password
   * @param request Verification code request
   * @returns Success message
   */
  async verifyResetCode(request: VerifyResetCodeRequest): Promise<any> {
    const response = await apiClient.post<any>(
      API_ENDPOINTS.AUTH.VERIFY_RESET_CODE,
      request,
    );

    return response.data;
  },

  /**
   * Verify password reset token
   * @param token Reset token
   * @returns Token validity
   */
  async verifyResetToken(token: string): Promise<any> {
    const response = await apiClient.get<any>(
      `${API_ENDPOINTS.AUTH.VERIFY_RESET_TOKEN}?token=${encodeURIComponent(token)}`,
    );

    return response.data;
  },

  /**
   * Reset password with new password
   * @param request Reset password request
   * @returns Success message
   */
  async resetPassword(request: ResetPasswordRequest): Promise<string> {
    const response = await apiClient.post<any>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      request,
    );

    if (response.data.success) {
      return response.data.message;
    }
    return response.data.message || response.data;
  },

  getToken(): string | null {
    return localStorage.getItem("authToken");
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (token) {
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      apiClient.defaults.headers.Authorization = `Bearer ${token}`;
      return true;
    }
    return false;
  },

  refreshTokenHeaders(): void {
    const token = this.getToken();
    if (token) {
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      apiClient.defaults.headers.Authorization = `Bearer ${token}`;
    }
  },
};
