import { toast as sonnerToast } from "sonner";
import * as React from "react";

type ToastVariant = "default" | "destructive" | "success";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  const toast = React.useCallback(
    ({ title, description, variant = "default" }: ToastProps) => {
      const sonnerMethod =
        variant === "destructive" ? sonnerToast.error : sonnerToast.success;

      const toastId = sonnerMethod(
        title || (variant === "destructive" ? "Error" : "Success"),
        {
          description,
        },
      );

      return {
        id: toastId.toString(),
        dismiss: () => sonnerToast.dismiss(toastId),
        update: (props: ToastProps) => {
          // Sonner update logic if needed
        },
      };
    },
    [],
  );

  return {
    toast,
    dismiss: (toastId?: string) => sonnerToast.dismiss(toastId),
  };
}

export const toast = ({
  title,
  description,
  variant = "default",
}: ToastProps) => {
  const sonnerMethod =
    variant === "destructive" ? sonnerToast.error : sonnerToast.success;

  const toastId = sonnerMethod(
    title || (variant === "destructive" ? "Error" : "Success"),
    {
      description,
    },
  );

  return {
    id: toastId.toString(),
    dismiss: () => sonnerToast.dismiss(toastId),
    update: () => {},
  };
};
