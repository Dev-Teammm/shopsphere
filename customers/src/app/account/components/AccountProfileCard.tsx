"use client";

import { FC, useEffect, useState, memo } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { rewardService, UserRewardSummary } from "@/lib/services/rewardService";
import { useAppSelector } from "@/lib/store/hooks";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Mail,
  Phone,
  User,
  Gift,
  ChevronRight,
  ShieldCheck,
  Clock,
  CreditCard,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface UserData {
  id: string;
  firstName?: string;
  lastName?: string;
  userEmail: string;
  phoneNumber?: string;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  enabled: boolean;
  points?: number;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface AccountProfileCardProps {
  userData: UserData;
  getUserInitials: () => string;
  formatDate: (d: string) => string;
}

const AccountProfileCard: FC<AccountProfileCardProps> = ({
  userData,
  getUserInitials,
  formatDate,
}) => {
  const { t } = useTranslation();

  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [totalMonetaryValue, setTotalMonetaryValue] = useState(0);

  useEffect(() => {
    const fetchTotalMonetaryValue = async () => {
      if (!isAuthenticated) return;
      try {
        const data = await rewardService.getMyRewards({ page: 0, size: 1 });
        setTotalMonetaryValue(data.totalMonetaryValue || 0);
      } catch (error) {
        console.error("Error fetching total monetary value:", error);
      }
    };
    fetchTotalMonetaryValue();
  }, [isAuthenticated]);

  const points = userData?.points || 0;
  const pointsValue = totalMonetaryValue || points * 10; // Use backend value if available, fallback to default 10 RWF/pt

  return (
    <Card className="overflow-hidden border-green-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="h-24 bg-gradient-to-r from-green-600 via-green-500 to-green-400 relative">
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <Avatar className="h-20 w-20 border-4 border-white shadow-lg ring-2 ring-green-100">
            <AvatarFallback className="text-xl font-bold bg-white text-green-600">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <CardHeader className="pt-12 pb-4 text-center">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold text-gray-900">
            {(userData?.firstName || "User") + " " + (userData?.lastName || "")}
          </CardTitle>
          <CardDescription className="flex items-center justify-center gap-1.5 font-medium text-gray-500">
            <Mail className="h-3.5 w-3.5" />
            {userData?.userEmail}
          </CardDescription>
        </div>

        <div className="flex justify-center mt-3">
          <Badge
            variant={userData?.enabled ? "default" : "secondary"}
            className={`${
              userData?.enabled
                ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                : "bg-gray-100 text-gray-600"
            } px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider transition-colors`}
          >
            {userData?.enabled
              ? t("account.active") || "Active Account"
              : t("account.inactive") || "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Points Section */}
        <div className="bg-[#fcfdfc] border border-green-100 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Gift className="h-16 w-16 text-green-600 -rotate-12" />
          </div>

          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Gift className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm font-bold text-gray-700">
                {t("account.loyaltyRewards")}
              </span>
            </div>
            <Link
              href="/account/points"
              className="text-[10px] font-bold text-green-600 uppercase tracking-tight flex items-center gap-0.5 hover:underline"
            >
              {t("account.details")} <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-1 mb-4 relative z-10">
            <div className="text-3xl font-black text-gray-900 flex items-baseline gap-1">
              {points.toLocaleString()}
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                {t("account.pointsAbbr")}
              </span>
            </div>
            <div className="text-sm font-bold text-green-600">
              {t("account.pointsValue", {
                value: pointsValue.toLocaleString(),
              })}
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
              <span>{t("account.nextRewardLevel") || "Next Reward Level"}</span>
              <span>{Math.min(points, 500)}/500</span>
            </div>
            <Progress
              value={(points / 500) * 100}
              className="h-2 bg-green-50"
              indicatorClassName="bg-green-500 rounded-full"
            />
          </div>

          <Button
            asChild
            variant="ghost"
            className="w-full mt-4 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold py-5 rounded-xl border border-green-100 group/btn"
          >
            <Link href="/account/points">
              {t("account.viewShopSpecificPoints") ||
                "View Shop-Specific Points"}
              <ChevronRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Contact Info */}
        <div className="space-y-4 px-1">
          <div className="flex items-center justify-between group cursor-default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-green-50 transition-colors">
                <Phone className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("account.phone")}
                </span>
                <span className="text-sm font-bold text-gray-700">
                  {userData.phoneNumber ||
                    t("account.notProvided") ||
                    "Not provided"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between group cursor-default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-green-50 transition-colors">
                <ShieldCheck className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("account.accountRole") || "Account Role"}
                </span>
                <span className="text-sm font-bold text-gray-700 capitalize">
                  {userData?.role
                    ? t(`account.${userData.role.toLowerCase()}`) ||
                      userData.role
                    : t("account.customer") || "Customer"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-gray-100 mt-2 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {t("account.memberSince")}{" "}
              {userData?.createdAt ? formatDate(userData.createdAt) : "N/A"}
            </span>
          </div>
          {userData?.lastLogin && (
            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
              <CreditCard className="h-3.5 w-3.5" />
              <span>
                {t("account.lastLogin")}: {formatDate(userData.lastLogin)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(AccountProfileCard);
