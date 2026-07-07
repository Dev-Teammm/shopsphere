"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";

interface RegistrationSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function RegistrationSuccessDialog({
  isOpen,
  onClose,
  message,
}: RegistrationSuccessDialogProps) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoToLogin = () => {
    setIsRedirecting(true);
    onClose();
    router.push("/auth?message=signup-success");
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isRedirecting && !open) {
          handleGoToLogin();
        }
      }}
    >
      <DialogContent className="sm:max-w-md border-2 border-green-500 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-3xl p-8">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-50 text-green-600 animate-in zoom-in duration-500 border-4 border-green-500/10">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <DialogTitle className="text-3xl font-black text-black tracking-tight">
            Account Created!
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 font-medium mt-3">
            {message ||
              "Your management account has been created successfully. You're ready to start your journey."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-8">
          <div className="rounded-2xl bg-gray-50 border-2 border-gray-100 p-5 space-y-4">
            <div className="flex items-center gap-4 transition-all hover:translate-x-1">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="font-bold text-black text-sm uppercase tracking-wide">
                Identity Verified
              </span>
            </div>
            <div className="flex items-center gap-4 transition-all hover:translate-x-1">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="font-bold text-black text-sm uppercase tracking-wide">
                Dashboard Access Enabled
              </span>
            </div>
          </div>

          <Button
            onClick={handleGoToLogin}
            disabled={isRedirecting}
            className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-black text-white rounded-2xl transition-all duration-300 shadow-lg hover:shadow-green-500/20 active:scale-[0.98] group"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin text-white" />
                Validating...
              </>
            ) : (
              <span className="flex items-center justify-center w-full">
                Enter Dashboard
                <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </Button>

          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Shopsphere Management Portal
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
