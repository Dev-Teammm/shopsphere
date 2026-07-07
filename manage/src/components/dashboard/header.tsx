"use client";

import { useState, useEffect } from "react";
import { Bell, Search, Menu, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useEnhancedNavigation } from "@/hooks/useEnhancedNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SearchModal } from "@/components/dashboard/search-modal";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { authService } from "@/lib/services/auth-service";
import { logout } from "@/lib/redux/auth-slice";
import { handleApiError } from "@/lib/utils/error-handler";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const { navigateWithReload, navigateToAuthRoute } = useEnhancedNavigation();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { setIsCreateCategoryDialogOpen, setIsCreateBrandDialogOpen } =
    useDashboard();

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      dispatch(logout());
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      // Force reload after logout to clear all cached data
      navigateWithReload("/auth");
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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Get user initials for avatar
  const getUserInitials = (): string => {
    if (!user || (!user.firstName && !user.lastName)) return "AD";

    const firstName = user.firstName || "";
    const lastName = user.lastName || "";

    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    } else if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    } else {
      return "AD";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
      <div className="block md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1">
        <h1 className="text-lg font-semibold text-primary">{title}</h1>
      </div>

      <div className="hidden w-full max-w-sm md:flex">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Click here or CTRL + K to search"
            className="w-full rounded-lg pl-8 border-primary/20 focus-visible:ring-primary cursor-pointer"
            onClick={() => setIsSearchModalOpen(true)}
            readOnly
          />
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 text-primary"
          >
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
            <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-primary"></span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">New order received</span>
              <span className="text-xs text-muted-foreground">
                2 minutes ago
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Low stock alert</span>
              <span className="text-xs text-muted-foreground">1 hour ago</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 rounded-full ring-2 ring-primary/10"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src=""
                alt={user ? `${user.firstName} ${user.lastName}` : "Admin"}
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {user ? `${user.firstName} ${user.lastName}` : "Admin"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => navigateToAuthRoute("/dashboard/settings")}
          >
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => navigateToAuthRoute("/dashboard/settings")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SearchModal
        isOpen={isSearchModalOpen}
        onOpenChange={setIsSearchModalOpen}
        onCreateCategory={() => setIsCreateCategoryDialogOpen(true)}
        onCreateBrand={() => setIsCreateBrandDialogOpen(true)}
      />
    </header>
  );
}
