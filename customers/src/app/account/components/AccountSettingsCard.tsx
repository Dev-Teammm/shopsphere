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
  User,
  ShieldCheck,
  Settings,
  Bell,
  MapPin,
  ChevronRight,
  UserCheck,
  CreditCard,
} from "lucide-react";

const AccountSettingsCard: FC = () => {
  const { t } = useTranslation();
  return (
    <Card className="border-green-100 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
      <div className="h-1 bg-green-500 w-full opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings className="h-4 w-4 text-blue-600" />
          </div>
          {t("account.settings")}
        </CardTitle>
        <CardDescription className="text-xs font-medium text-gray-500">
          {t("account.settingsDesc") ||
            "Update your account settings and preferences"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/account/profile" className="block">
            <Button
              variant="outline"
              className="w-full justify-between border-green-100 hover:bg-green-50 hover:text-green-700 hover:border-green-200 group/btn transition-all py-6 rounded-xl font-bold text-sm text-gray-700"
            >
              <span className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
                {t("account.editProfile") || "Edit Profile"}
              </span>
              <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/account/password" className="block">
            <Button
              variant="outline"
              className="w-full justify-between border-green-100 hover:bg-green-50 hover:text-green-700 hover:border-green-200 group/btn transition-all py-6 rounded-xl font-bold text-sm text-gray-700"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
                {t("account.changePassword") || "Change Password"}
              </span>
              <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/account/addresses" className="block">
            <Button
              variant="outline"
              className="w-full justify-between border-green-100 hover:bg-green-50 hover:text-green-700 hover:border-green-200 group/btn transition-all py-6 rounded-xl font-bold text-sm text-gray-700"
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
                {t("account.manageAddresses") || "Manage Addresses"}
              </span>
              <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/account/notifications" className="block">
            <Button
              variant="outline"
              className="w-full justify-between border-green-100 hover:bg-green-50 hover:text-green-700 hover:border-green-200 group/btn transition-all py-6 rounded-xl font-bold text-sm text-gray-700"
            >
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
                {t("account.notifications")}
              </span>
              <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(AccountSettingsCard);
