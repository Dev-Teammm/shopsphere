import { toast as sonnerToast } from "sonner";
import * as React from "react";

// Bridging Shadcn UI toast to Sonner for global consistency
export function toast({ title, description, variant, ...props }: any) {
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
    update: (props: any) => {},
  };
}

export function useToast() {
  return {
    toast,
    dismiss: (toastId?: string) => sonnerToast.dismiss(toastId),
  };
}
