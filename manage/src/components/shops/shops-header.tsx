"use client";

import { ArrowLeft, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import { authService } from "@/lib/services/auth-service";
import { logout } from "@/lib/redux/auth-slice";
import { handleApiError } from "@/lib/utils/error-handler";
import { UserRole } from "@/lib/constants";

export function ShopsHeader() {
  const router = useRouter();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state: RootState) => state.auth);

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      dispatch(logout());
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      router.push("/auth");
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      toast({
        title: "Logout failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleGoBack = () => {
    router.back();
  };

  const getUserInitials = (): string => {
    if (!user || (!user.firstName && !user.lastName)) return "U";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    } else if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getRoleDisplayName = (): string => {
    if (!user) return "User";
    switch (user.role) {
      case UserRole.VENDOR:
        return "Vendor";
      case UserRole.EMPLOYEE:
        return "Employee";
      case UserRole.DELIVERY_AGENT:
        return "Delivery Agent";
      case UserRole.ADMIN:
        return "Admin";
      default:
        return "User";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoBack}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Go back</span>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">My Shops</h1>
            <p className="text-xs text-muted-foreground">
              Select a shop to manage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span>{user ? `${user.firstName} ${user.lastName}` : "User"}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{getRoleDisplayName()}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-full"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src=""
                    alt={user ? `${user.firstName} ${user.lastName}` : "User"}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user ? `${user.firstName} ${user.lastName}` : "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.userEmail || "No email"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getRoleDisplayName()}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push("/dashboard/settings")}
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

