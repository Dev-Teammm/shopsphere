"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import ProtectedRoute from "@/components/auth/protected-route";
import { UserRole } from "@/lib/constants";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [title, setTitle] = useState("Dashboard");

  useEffect(() => {
    // Update title based on pathname
    if (pathname === "/admin/dashboard") {
      setTitle("Dashboard");
    } else if (pathname.startsWith("/admin/subscriptions")) {
      setTitle("Subscription Management");
    } else if (pathname.startsWith("/admin/feedbacks")) {
      setTitle("Feedbacks");
    }
  }, [pathname]);

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
      <div className="flex h-screen overflow-hidden">
        <div className="hidden md:block">
          <AdminSidebar />
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <AdminHeader title={title} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
