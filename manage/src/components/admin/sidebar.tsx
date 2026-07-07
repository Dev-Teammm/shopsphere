"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  LogOut,
  ChevronLeft,
  CreditCard,
  Shield,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAppDispatch } from "@/lib/redux/hooks";
import { logout } from "@/lib/redux/auth-slice";
import { authService } from "@/lib/services/auth-service";

interface AdminSidebarProps {
  className?: string;
}

interface LogoutButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  onClick: () => void;
  isLoading?: boolean;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await authService.logout();

      dispatch(logout());

      toast.success("Logged out successfully");

      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };
  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="flex h-14 items-center px-3 border-b bg-primary/5">
        <Link
          href="/admin/dashboard"
          className={cn(
            "flex items-center gap-2 font-semibold",
            collapsed ? "justify-center" : "justify-start"
          )}
        >
          {!collapsed && (
            <span className="text-xl font-bold text-primary">
              Admin Portal
            </span>
          )}
          {collapsed && <Shield className="h-6 w-6 text-primary" />}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "ml-auto h-8 w-8",
            collapsed ? "rotate-180" : "rotate-0"
          )}
          onClick={toggleSidebar}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </div>
      <ScrollArea className="flex-1 overflow-auto">
        <div className={cn("flex flex-col gap-1 p-2")}>
          <SidebarItem
            href="/admin/dashboard"
            icon={Home}
            label="Dashboard"
            collapsed={collapsed}
            isActive={pathname === "/admin/dashboard"}
          />
          <SidebarItem
            href="/admin/subscriptions"
            icon={CreditCard}
            label="Subscriptions"
            collapsed={collapsed}
            isActive={pathname.startsWith("/admin/subscriptions")}
          />
          <SidebarItem
            href="/admin/feedbacks"
            icon={MessageSquare}
            label="Feedbacks"
            collapsed={collapsed}
            isActive={pathname.startsWith("/admin/feedbacks")}
          />
          <LogoutButton
            icon={LogOut}
            label="Logout"
            collapsed={collapsed}
            onClick={handleLogout}
            isLoading={isLoggingOut}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

interface SidebarItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  isActive?: boolean;
}

function SidebarItem({
  href,
  icon: Icon,
  label,
  collapsed,
  isActive,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-10 items-center rounded-lg px-3 py-2 transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-primary hover:text-primary-foreground",
        collapsed ? "justify-center" : "justify-start"
      )}
    >
      <Icon className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-2")} />
      {!collapsed && <span>{label}</span>}
      {collapsed && <span className="sr-only">{label}</span>}
    </Link>
  );
}

function LogoutButton({
  icon: Icon,
  label,
  collapsed,
  onClick,
  isLoading = false,
}: LogoutButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "flex h-10 items-center rounded-lg px-3 py-2 transition-colors w-full",
        "text-muted-foreground hover:bg-destructive hover:text-destructive-foreground",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        collapsed ? "justify-center" : "justify-start"
      )}
    >
      {isLoading ? (
        <div
          className={cn(
            "h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent",
            collapsed ? "mr-0" : "mr-2"
          )}
        />
      ) : (
        <Icon className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-2")} />
      )}
      {!collapsed && <span>{isLoading ? "Logging out..." : label}</span>}
      {collapsed && (
        <span className="sr-only">{isLoading ? "Logging out..." : label}</span>
      )}
    </button>
  );
}
