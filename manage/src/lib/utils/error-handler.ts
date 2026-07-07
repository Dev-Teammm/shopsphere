import { AxiosError } from 'axios';
import { toast } from '@/hooks/use-toast';

/**
 * Handle API error responses and extract meaningful error messages
 * @param error The error from an API call
 * @returns A user-friendly error message
 */
export const handleApiError = (error: unknown): string => {
  // Check if it's an Axios error
  if (error instanceof AxiosError) {
    // Get response data if available
    const responseData = error.response?.data;

    // Check if there's a specific error message from the server
    if (responseData?.message) {
      return responseData.message;
    }

    // Check if there are validation errors
    if (responseData?.errors) {
      // Join all validation errors into a single message
      if (Array.isArray(responseData.errors)) {
        return responseData.errors.join(', ');
      }

      // Handle object of errors
      if (typeof responseData.errors === 'object') {
        const errorMessages = Object.values(responseData.errors);
        return errorMessages.join(', ');
      }
    }

    // Default error messages based on status code
    switch (error.response?.status) {
      case 400:
        return 'Invalid request. Please check your data and try again.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 422:
        return 'Validation error. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  // For non-Axios errors
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error occurred. Please try again.';
};

/**
 * Show toast notification for API errors
 * @param error The error from an API call
 */
export const showErrorToast = (error: unknown): void => {
  const errorMessage = handleApiError(error);
  toast({
    title: 'Error',
    description: errorMessage,
    variant: 'destructive',
  });
}; 