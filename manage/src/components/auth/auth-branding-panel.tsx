"use client";

import { usePathname } from "next/navigation";
import {
  BarChart3,
  Package,
  Users,
  Truck,
  KeyRound,
  ShieldCheck,
  Store,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Sales analytics",
    description: "Track revenue, orders, and growth in real time.",
  },
  {
    icon: Package,
    title: "Inventory control",
    description: "Manage stock, variants, and fulfillment from one place.",
  },
  {
    icon: Users,
    title: "Team management",
    description: "Assign roles for admins, staff, and delivery agents.",
  },
  {
    icon: Truck,
    title: "Delivery operations",
    description: "Monitor routes, assignments, and order status.",
  },
];

const recoverySteps = [
  {
    icon: KeyRound,
    title: "Request a reset link",
    description: "Enter the email linked to your account.",
  },
  {
    icon: ShieldCheck,
    title: "Verify your identity",
    description: "Open the secure link sent to your inbox.",
  },
  {
    icon: Store,
    title: "Return to your dashboard",
    description: "Sign in and continue managing your store.",
  },
];

function getPanelContent(pathname: string) {
  if (pathname.includes("/forgot-password")) {
    return {
      eyebrow: "Account recovery",
      title: "Reset your password securely",
      description:
        "We will send a one-time link to your email. The link expires after a short period for your security.",
      items: recoverySteps,
    };
  }

  if (pathname.includes("/reset-password")) {
    return {
      eyebrow: "Password update",
      title: "Choose a strong new password",
      description:
        "Use at least 8 characters with a mix of letters, numbers, and symbols to keep your account protected.",
      items: recoverySteps,
    };
  }

  if (pathname.includes("/register")) {
    return {
      eyebrow: "Seller onboarding",
      title: "Launch and grow on Shopsphere",
      description:
        "Create your account to manage products, process orders, and serve customers across the marketplace.",
      items: features,
    };
  }

  return {
    eyebrow: "Control center",
    title: "Everything you need to run your store",
    description:
      "Sign in to manage orders, inventory, teams, and deliveries from a single workspace built for marketplace operations.",
    items: features,
  };
}

export function AuthBrandingPanel() {
  const pathname = usePathname();
  const content = getPanelContent(pathname);

  return (
    <div className="relative hidden h-full flex-col justify-between bg-slate-950 p-10 text-white lg:flex overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/80 via-slate-950 to-slate-950" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide">Shopsphere</p>
          <p className="text-xs text-slate-400">Merchant & operations portal</p>
        </div>
      </div>

      <div className="relative z-10 my-10 max-w-md space-y-8">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            {content.eyebrow}
          </p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            {content.title}
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            {content.description}
          </p>
        </div>

        <ul className="space-y-4">
          {content.items.map((item) => (
            <li key={item.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                <item.icon className="h-4 w-4 text-slate-200" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs leading-relaxed text-slate-400">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 border-t border-white/10 pt-6">
        <p className="text-xs leading-relaxed text-slate-500">
          Need help? Contact{" "}
          <span className="text-slate-300">support@shopsphere.com</span>
        </p>
      </div>
    </div>
  );
}
