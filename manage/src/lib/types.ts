import { UserRole } from "./constants";

// Auth-related types
export interface UserRegistrationDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface SignupResponseDTO {
  message: string;
  userId: string;
  awardedPoints: number;
  pointsDescription?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface VerifyResetCodeRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userName: string;
  userEmail: string;
  message: string;
  userId: string;
  userPhone?: string;
  role: UserRole;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  userEmail: string;
  phoneNumber?: string;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  enabled: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Auth state type for Redux
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkingAuth: boolean;
  signupResponse: SignupResponseDTO | null;
}
