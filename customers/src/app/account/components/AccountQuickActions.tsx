"use client";

import { FC, memo } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, ChevronRight } from "lucide-react";

const AccountQuickActions: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="border-green-100 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
        <div className="h-1 bg-green-500 w-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-green-600" />
            </div>
            {t("account.orders")}
          </CardTitle>
          <CardDescription className="text-xs font-medium text-gray-500">
            {t("account.orderHistoryDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/account/orders" className="block">
            <Button
              variant="outline"
              className="w-full justify-between border-green-100 hover:bg-green-50 hover:text-green-700 hover:border-green-200 group/btn transition-all py-6 rounded-xl font-bold text-sm text-gray-700"
            >
              <span className="flex items-center gap-2">
                {t("account.viewAllOrders") || "View All Orders"}
              </span>
              <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/track-order" className="block">
            <Button
              variant="outline"
              className="w-full justify-between border-green-100 hover:bg-green-50 hover:text-green-700 hover:border-green-200 group/btn transition-all py-6 rounded-xl font-bold text-sm text-gray-700"
            >
              <span className="flex items-center gap-2">
                {t("order.trackOrder") || "Track Order"}
              </span>
              <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="border-green-100 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
        <div className="h-1 bg-green-500 w-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Heart className="h-4 w-4 text-pink-600" />
            </div>
            {t("wishlist.title")}
          </CardTitle>
          <CardDescription className="text-xs font-medium text-gray-500">
            {t("account.wishlistDesc") ||
              "Manage your saved items and wishlists"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/wishlist" className="block">
            <Button
              variant="outline"
              className="w-full justify-between border-green-100 hover:bg-green-50 hover:text-green-700 hover:border-green-200 group/btn transition-all py-6 rounded-xl font-bold text-sm text-gray-700"
            >
              <span className="flex items-center gap-2">
                {t("account.viewWishlist") || "View Wishlist"}
              </span>
              <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(AccountQuickActions);
