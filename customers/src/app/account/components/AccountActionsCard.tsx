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
import {
  LogOut,
  Truck,
  ShieldAlert,
  HeartHandshake,
  ChevronRight,
} from "lucide-react";

interface AccountActionsCardProps {
  onLogout: () => void;
}

const AccountActionsCard: FC<AccountActionsCardProps> = ({ onLogout }) => {
  const { t } = useTranslation();
  return (
    <Card className="border-red-50 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden bg-white">
      <div className="h-1 bg-red-500 w-full opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <div className="p-2 bg-red-50 rounded-lg text-red-600">
            <ShieldAlert className="h-4 w-4" />
          </div>
          {t("account.actions") || "Account Actions"}
        </CardTitle>
        <CardDescription className="text-xs font-medium text-gray-500">
          {t("account.actionsDesc") || "Manage your account and privacy"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/shipping-info" className="block">
            <Button
              variant="outline"
              className="w-full justify-between border-gray-100 hover:bg-gray-50 hover:text-gray-900 group/btn transition-all py-6 rounded-xl font-bold text-sm text-gray-700"
            >
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                {t("order.shipping") || "Shipping Info"}
              </span>
              <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/support" className="block">
            <Button
              variant="outline"
              className="w-full justify-between border-gray-100 hover:bg-gray-50 hover:text-gray-900 group/btn transition-all py-6 rounded-xl font-bold text-sm text-gray-700"
            >
              <span className="flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                {t("account.helpSupport")}
              </span>
              <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <div className="sm:col-span-2 mt-2 pt-2 border-t border-gray-50">
            <Button
              variant="destructive"
              className="w-full justify-center bg-red-500 hover:bg-red-600 text-white font-bold py-6 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" /> {t("account.signOut")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(AccountActionsCard);
