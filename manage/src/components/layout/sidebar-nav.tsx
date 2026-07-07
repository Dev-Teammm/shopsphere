"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserRole } from "@/lib/constants";
import { useAppSelector } from "@/lib/redux/hooks";
import { sidebarItems } from "./nav-config";

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAppSelector(state => state.auth);
  const userRole = user?.role;

  // Filter sidebar items based on user role
  const filteredSidebarItems = sidebarItems.filter(item => 
    item.roles.includes(userRole as UserRole)
  );

  return (
    <nav className="flex flex-col gap-1 p-1">
      {filteredSidebarItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            pathname === item.href
              ? "bg-muted hover:bg-muted text-primary font-medium"
              : "hover:bg-transparent hover:text-primary",
            "justify-start"
          )}
        >
          {item.icon}
          {item.title}
        </Link>
      ))}
    </nav>
  );
} 