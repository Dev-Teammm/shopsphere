"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Gift, Star, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useAppDispatch } from "@/lib/store/hooks";
import { clearSignupResponse } from "@/lib/store/slices/authSlice";

interface RewardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  awardedPoints: number;
  pointsDescription?: string;
}

export default function RewardDialog({
  isOpen,
  onClose,
  awardedPoints,
  pointsDescription,
}: RewardDialogProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLearnMore = () => {
    setIsRedirecting(true);
    dispatch(clearSignupResponse());
    router.push("/reward-system");
  };

  const handleClose = () => {
    setIsRedirecting(true);
    dispatch(clearSignupResponse());
    onClose();
    // Redirection is handled in RegisterForm's onClose now
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isRedirecting && !open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md bg-white border-2 border-green-600 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] rounded-3xl p-8">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-600 text-white shadow-lg animate-bounce-subtle">
            {awardedPoints > 0 ? (
              <Gift className="h-10 w-10" />
            ) : (
              <CheckCircle2 className="h-10 w-10 text-white" />
            )}
          </div>
          <DialogTitle className="text-3xl font-black text-black tracking-tight leading-none mb-2">
            {awardedPoints > 0 ? "Welcome Bonus!" : "Registration Done!"}
          </DialogTitle>
          <DialogDescription className="text-base text-gray-500 font-medium">
            {awardedPoints > 0 ? (
              <>
                You’ve earned{" "}
                <span className="text-green-600 font-bold whitespace-nowrap">
                  {awardedPoints} points
                </span>{" "}
                for joining.
              </>
            ) : (
              "Your account is ready. Welcome to the Shopsphere family!"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-8">
          {awardedPoints > 0 ? (
            <div className="rounded-2xl bg-gray-50 border-2 border-gray-100 p-6 text-center transform transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Star className="h-8 w-8 text-green-600 fill-current" />
                <span className="text-4xl font-black text-black">
                  {awardedPoints}
                </span>
                <span className="text-lg font-bold text-green-600 uppercase tracking-wider">
                  PTS
                </span>
              </div>
              {pointsDescription && (
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">
                  {pointsDescription}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-green-50 p-6 text-center border-2 border-green-100 italic">
              <p className="text-sm font-semibold text-green-800">
                "Small steps for farmers, giant leaps for our community."
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4 group">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-white group-hover:bg-green-600 transition-colors">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-bold text-gray-900">
                Account verified and active
              </span>
            </div>
            {awardedPoints > 0 && (
              <div className="flex items-center gap-4 group">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-white group-hover:bg-green-600 transition-colors">
                  <Star className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-bold text-gray-900">
                  Points ready for next purchase
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={handleClose}
              disabled={isRedirecting}
              className="w-full bg-green-600 hover:bg-black text-white font-black rounded-2xl transition-all duration-300 h-14 text-lg shadow-xl hover:shadow-green-500/20 active:scale-[0.98] group"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Please wait...
                </>
              ) : (
                <span className="flex items-center justify-center">
                  Start Exploring
                  <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </Button>

            {awardedPoints > 0 && (
              <Button
                variant="ghost"
                onClick={handleLearnMore}
                disabled={isRedirecting}
                className="text-black hover:text-green-600 font-bold h-10 hover:bg-transparent transition-colors uppercase text-xs tracking-widest"
              >
                View Reward Benefits
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
