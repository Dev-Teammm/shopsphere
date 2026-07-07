import {
  User,
  UserRegistrationDTO,
  LoginDto,
  LoginResponseDto,
  SignupResponseDTO,
  PasswordResetRequest,
  VerifyResetCodeRequest,
  ResetPasswordRequest,
  ApiResponse,
} from "@/lib/types/auth";
import { API_ENDPOINTS, apiCall } from "../api";

class AuthService {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authToken");
  }

  private setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("authToken", token);
  }

  private removeToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("authToken");
  }

  async register(
    userData: UserRegistrationDTO,
  ): Promise<ApiResponse<SignupResponseDTO>> {
    return apiCall<ApiResponse<SignupResponseDTO>>(
      API_ENDPOINTS.AUTH_REGISTER,
      {
        method: "POST",
        body: JSON.stringify(userData),
      },
    );
  }

  async login(credentials: LoginDto): Promise<ApiResponse<LoginResponseDto>> {
    const data = await apiCall<ApiResponse<LoginResponseDto>>(
      API_ENDPOINTS.AUTH_LOGIN,
      {
        method: "POST",
        body: JSON.stringify(credentials),
      },
    );

    if (data.success && data.data && data.data.token) {
      this.setToken(data.data.token);
    } else if ((data as any).token) {
      this.setToken((data as any).token);
    } else if (data.data && (data.data as any).token) {
      this.setToken((data.data as any).token);
    }

    return data;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiCall<ApiResponse<User>>(API_ENDPOINTS.AUTH_ME, {
      method: "GET",
    });
  }

  async requestPasswordReset(
    request: PasswordResetRequest,
  ): Promise<ApiResponse<string>> {
    return apiCall<ApiResponse<string>>(API_ENDPOINTS.AUTH_PASSWORD_RESET, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async verifyResetCode(
    request: VerifyResetCodeRequest,
  ): Promise<ApiResponse<boolean>> {
    return apiCall<ApiResponse<boolean>>(API_ENDPOINTS.AUTH_VERIFY_RESET, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async resetPassword(
    request: ResetPasswordRequest,
  ): Promise<ApiResponse<string>> {
    return apiCall<ApiResponse<string>>(API_ENDPOINTS.AUTH_RESET_PASSWORD, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async logout(): Promise<ApiResponse<string>> {
    const data = await apiCall<ApiResponse<string>>(API_ENDPOINTS.AUTH_LOGOUT, {
      method: "POST",
    });
    this.removeToken();
    return data;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getStoredToken(): string | null {
    return this.getToken();
  }
}

export const authService = new AuthService();
export default authService;
