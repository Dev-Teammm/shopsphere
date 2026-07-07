import axios from "axios";
import { API_URL } from "./constants";
import { toast } from "@/components/ui/use-toast";

// Create an Axios instance with default configs
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookies
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // If the data is FormData, remove Content-Type header to let Axios set multipart/form-data automatically
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    // Only add token if we're in the browser
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    // Show success toasts for non-GET requests if they have a message
    if (response.config.method !== "get" && response.data?.message) {
      // toast({
      //   title: "Success",
      //   description: response.data.message,
      // });
    }
    return response;
  },
  (error) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const isAuthMeRequest = error.config?.url?.includes("/auth/me");
    const isAuthRequest =
      error.config?.url?.includes("/auth/login") ||
      error.config?.url?.includes("/auth/register");
    const currentPath = window.location.pathname;

    // Support skipping global toast via config
    const skipToast = (error.config as any)?.skipToast;

    let errorMessage = "An unexpected error occurred. Please try again.";

    if (error.response?.data) {
      errorMessage =
        error.response.data.message ||
        error.response.data.error ||
        errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
      if (errorMessage === "Network Error") {
        errorMessage =
          "Failed to connect to the server. Please check your internet connection.";
      }
    }

    // Don't show toast for 401 on /me (initial auth check)
    // Also skip for auth requests (login/register) as they have local error handling
    if (!(status === 401 && isAuthMeRequest) && !isAuthRequest && !skipToast) {
      toast({
        title: status === undefined ? "Network Error" : "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }

    // Handle 401 Unauthorized - token expired or invalid
    if (status === 401) {
      if (!isAuthMeRequest && !isAuthRequest && currentPath !== "/auth") {
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authChecked");
        delete apiClient.defaults.headers.common["Authorization"];

        const returnUrl = window.location.search
          ? `${currentPath}${window.location.search}`
          : currentPath;

        window.location.href = `/auth?returnUrl=${encodeURIComponent(returnUrl)}`;
      }
    }
    // Handle 403 Forbidden
    else if (status === 403) {
      if (!isAuthRequest && currentPath !== "/auth") {
        // Handle shop access specifically if needed, but the toast already shows the error
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
