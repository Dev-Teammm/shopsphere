import { ReactNode } from "react";
import { UserRole } from "@/lib/constants";
import {
  LineChart,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  Settings,
  Truck,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: ReactNode;
  roles: UserRole[];
}

export const sidebarItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    roles: [UserRole.ADMIN, UserRole.EMPLOYEE],
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: <LineChart className="mr-2 h-4 w-4" />,
    roles: [UserRole.ADMIN, UserRole.EMPLOYEE],
  },
  {
    title: "Orders",
    href: "/dashboard/orders",
    icon: <ShoppingCart className="mr-2 h-4 w-4" />,
    roles: [UserRole.ADMIN, UserRole.EMPLOYEE],
  },
  {
    title: "Products",
    href: "/dashboard/products",
    icon: <Package className="mr-2 h-4 w-4" />,
    roles: [UserRole.ADMIN, UserRole.EMPLOYEE],
  },
  {
    title: "Categories & Brands",
    href: "/dashboard/categories",
    icon: <Tag className="mr-2 h-4 w-4" />,
    roles: [UserRole.ADMIN, UserRole.EMPLOYEE],
  },
  {
    title: "Shipping Costs",
    href: "/dashboard/shipping-costs",
    icon: <Truck className="mr-2 h-4 w-4" />,
    roles: [UserRole.ADMIN, UserRole.EMPLOYEE],
  },
  {
    title: "Invitations",
    href: "/dashboard/invitations",
    icon: <Users className="mr-2 h-4 w-4" />,
    roles: [UserRole.ADMIN],
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="mr-2 h-4 w-4" />,
    roles: [UserRole.ADMIN, UserRole.EMPLOYEE],
  },
];
