import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AuthState, User } from "../types";

// Initialize auth state optimistically from token if it exists
// This prevents redirect loops on page reload
const getInitialAuthState = (): AuthState => {
  if (typeof window === "undefined") {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      checkingAuth: false,
      signupResponse: null,
    };
  }

  const token = localStorage.getItem("authToken");
  // If token exists, optimistically set as authenticated
  // AuthChecker will verify this in the background
  return {
    user: null,
    isAuthenticated: !!token, // Optimistic: true if token exists
    isLoading: false,
    error: null,
    checkingAuth: !!token, // Will be verified by AuthChecker
    signupResponse: null,
  };
};

const initialState: AuthState = getInitialAuthState();

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
      state.checkingAuth = false;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.checkingAuth = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.checkingAuth = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    // Add these new actions
    checkAuthStart: (state) => {
      state.checkingAuth = true;
    },
    checkAuthSuccess: (state, action: PayloadAction<User>) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
      state.checkingAuth = false;
    },
    checkAuthFailure: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.checkingAuth = false;
    },
    registerSuccess: (state, action: PayloadAction<any>) => {
      state.signupResponse = action.payload;
      state.isLoading = false;
      state.error = null;
      // Clear any old token to prevent issues
      state.isAuthenticated = false;
      state.user = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
      }
    },
    clearSignupResponse: (state) => {
      state.signupResponse = null;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
  updateUser,
  checkAuthStart,
  checkAuthSuccess,
  checkAuthFailure,
  registerSuccess,
  clearSignupResponse,
} = authSlice.actions;

export default authSlice.reducer;
