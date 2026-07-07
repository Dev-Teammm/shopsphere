"use client";

import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Package, ShoppingCart, Truck, Store } from "lucide-react";

type ShopCapability =
  | "VISUALIZATION_ONLY"
  | "PICKUP_ORDERS"
  | "FULL_ECOMMERCE"
  | "HYBRID";

interface ShopCapabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capability: ShopCapability;
}

export function ShopCapabilityDialog({
  open,
  onOpenChange,
  capability,
}: ShopCapabilityDialogProps) {
  const { t } = useTranslation();

  if (!capability) return null;

  const capabilityInfo = {
    VISUALIZATION_ONLY: {
      title: t("shopCapability.visualizationTitle") || "Visualization Only",
      icon: Info,
      description:
        t("shopCapability.visualizationDesc") ||
        "This shop displays products for viewing purposes only.",
      details: [
        t("shopCapability.visualizationDetail1") ||
          "Products are shown for informational purposes",
        t("shopCapability.visualizationDetail2") ||
          "No online orders can be placed",
        t("shopCapability.visualizationDetail3") ||
          "Contact the shop directly for inquiries or purchases",
        t("shopCapability.visualizationDetail4") ||
          "No delivery or pickup options available",
      ],
      color: "bg-gray-100 text-gray-700",
    },
    PICKUP_ORDERS: {
      title: t("shopCapability.pickupTitle") || "Pickup Orders",
      icon: Store,
      description:
        t("shopCapability.pickupDesc") ||
        "This shop accepts orders that you can pick up in person.",
      details: [
        t("shopCapability.pickupDetail1") || "You can place orders online",
        t("shopCapability.pickupDetail2") ||
          "Pick up your order at the shop location",
        t("shopCapability.pickupDetail3") || "Returns are handled at the shop",
        t("shopCapability.pickupDetail4") || "No delivery service available",
      ],
      color: "bg-green-100 text-green-700",
    },
    FULL_ECOMMERCE: {
      title: t("shopCapability.fullEcommerceTitle") || "Full E-commerce",
      icon: Truck,
      description:
        t("shopCapability.fullEcommerceDesc") ||
        "This shop offers complete online shopping with delivery.",
      details: [
        t("shopCapability.fullEcommerceDetail1") || "Place orders online",
        t("shopCapability.fullEcommerceDetail2") || "Home delivery available",
        t("shopCapability.fullEcommerceDetail3") ||
          "Delivery agents handle shipping",
        t("shopCapability.fullEcommerceDetail4") ||
          "Returns can be picked up by delivery agents",
      ],
      color: "bg-green-100 text-green-700",
    },
    HYBRID: {
      title: t("shopCapability.hybridTitle") || "Hybrid Shop",
      icon: ShoppingCart,
      description:
        t("shopCapability.hybridDesc") ||
        "This shop offers both pickup and delivery options.",
      details: [
        t("shopCapability.hybridDetail1") || "Place orders online",
        t("shopCapability.hybridDetail2") ||
          "Choose between pickup or delivery",
        t("shopCapability.hybridDetail3") ||
          "Pick up at shop or have it delivered",
        t("shopCapability.hybridDetail4") || "Flexible return options",
      ],
      color: "bg-purple-100 text-purple-700",
    },
  };

  const info = capabilityInfo[capability];
  const Icon = info.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${info.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <DialogTitle>{info.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {info.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-4">
          <h4 className="font-medium text-sm">
            {t("shopCapability.whatThisMeans") || "What this means for you:"}
          </h4>
          <ul className="space-y-2">
            {info.details.map((detail, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-primary mt-1">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="default">
            {t("common.close") || "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShopCapabilityBadge({
  capability,
  onClick,
  className,
}: {
  capability: ShopCapability;
  onClick?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();

  if (!capability) return null;

  const capabilityInfo = {
    VISUALIZATION_ONLY: {
      title: t("shopCapability.visualizationTitle") || "Visualization Only",
      icon: Info,
      color: "bg-gray-100 text-gray-700",
    },
    PICKUP_ORDERS: {
      title: t("shopCapability.pickupTitle") || "Pickup Orders",
      icon: Store,
      color: "bg-green-100 text-green-700",
    },
    FULL_ECOMMERCE: {
      title: t("shopCapability.fullEcommerceTitle") || "Full E-commerce",
      icon: Truck,
      color: "bg-green-100 text-green-700",
    },
    HYBRID: {
      title: t("shopCapability.hybridTitle") || "Hybrid Shop",
      icon: ShoppingCart,
      color: "bg-purple-100 text-purple-700",
    },
  };

  const info = capabilityInfo[capability];
  const Icon = info.icon;

  return (
    <Badge
      variant="outline"
      className={`cursor-pointer hover:bg-accent transition-colors ${info.color} ${className || ""}`}
      onClick={onClick}
    >
      <Icon className="h-3 w-3 mr-1.5" />
      {info.title}
    </Badge>
  );
}
