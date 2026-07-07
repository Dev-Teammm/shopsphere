"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { UserRole } from "@/lib/constants";
import { useAppSelector } from "@/lib/redux/hooks";
import { sidebarItems } from "./nav-config";

export function SidebarMobile() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAppSelector(state => state.auth);
  const userRole = user?.role;

  // Filter sidebar items based on user role
  const filteredSidebarItems = sidebarItems.filter(item => 
    item.roles.includes(userRole as UserRole)
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] pr-0">
        <nav className="flex flex-col gap-4 px-2 py-4">
          {filteredSidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm transition-colors rounded-lg",
                pathname === item.href
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:text-primary hover:bg-muted/50"
              )}
            >
              {item.icon}
              {item.title}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
} 