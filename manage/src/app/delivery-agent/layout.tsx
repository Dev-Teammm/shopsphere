"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { DeliveryAgentSidebar } from "@/components/delivery-agent/sidebar";
import { DeliveryAgentHeader } from "@/components/delivery-agent/header";
import ProtectedRoute from "@/components/auth/protected-route";
import { UserRole } from "@/lib/constants";

export default function DeliveryAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [title, setTitle] = useState("Dashboard");

  useEffect(() => {
    // Update title based on pathname
    if (pathname === "/delivery-agent/dashboard") {
      setTitle("Dashboard");
    } else if (pathname.startsWith("/delivery-agent/orders")) {
      setTitle("Order Details");
    } else if (pathname === "/delivery-agent/settings") {
      setTitle("Settings");
    }
  }, [pathname]);

  return (
    <ProtectedRoute allowedRoles={[UserRole.DELIVERY_AGENT]}>
      <div className="flex h-screen overflow-hidden">
        <div className="hidden md:block">
          <DeliveryAgentSidebar />
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <DeliveryAgentHeader title={title} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
