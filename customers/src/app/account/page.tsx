"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { logout } from "@/lib/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { authService } from "@/lib/services/authService";
import { toast } from "sonner";
import AccountHeader from "./components/AccountHeader";
import AccountProfileCard from "./components/AccountProfileCard";
import AccountQuickActions from "./components/AccountQuickActions";
import AccountSettingsCard from "./components/AccountSettingsCard";
import AccountActionsCard from "./components/AccountActionsCard";

interface UserData {
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
  fullName?: string;
}

export default function AccountPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await authService.getCurrentUser();
        if (response.success && response.data) {
          setUserData(response.data as unknown as UserData);
        } else {
          throw new Error(response.message || "Failed to fetch user data");
        }
      } catch (err: any) {
        console.error("Error fetching user data:", err);

        if (err.response?.status === 403 || err.response?.status === 401) {
          setError("unauthorized");
        } else {
          setError("Failed to load account information. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchUserData();
    } else {
      setError("unauthorized");
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      dispatch(logout());
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  }, [dispatch]);

  const getUserInitials = useCallback(() => {
    if (!userData) return "U";

    const firstName = userData.firstName || "";
    const lastName = userData.lastName || "";

    if (!firstName && !lastName) return "U";

    const firstInitial = firstName.charAt(0) || "";
    const lastInitial = lastName.charAt(0) || "";

    return `${firstInitial}${lastInitial}`.toUpperCase() || "U";
  }, [userData]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {t("account.loadingAccountInfo") ||
                  "Loading account information..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (error === "unauthorized" || !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-6">
              <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {t("account.notLoggedIn") || "Not Logged In"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {t("account.loginRequired") ||
                    "You need to be logged in to view your account information."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <Link href="/auth/login">{t("auth.login")}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/auth/register">{t("auth.createAccount")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && error !== "unauthorized") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-6">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {t("account.errorLoading") || "Error Loading Account"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {error || t("cart.loadError")}
                </p>
              </div>
              <Button onClick={() => window.location.reload()}>
                {t("account.tryAgain")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show account page
  return (
    <div className="min-h-screen bg-[#fcfdfc]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <AccountHeader
            title={t("account.title")}
            subtitle={t("account.overviewDesc")}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 xl:col-span-4">
              {userData && (
                <AccountProfileCard
                  userData={userData}
                  getUserInitials={getUserInitials}
                  formatDate={formatDate}
                />
              )}
            </div>

            <div className="lg:col-span-8 xl:col-span-8 space-y-10">
              <section>
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="h-6 w-1 bg-green-500 rounded-full" />
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                    {t("account.quickAccess")}
                  </h2>
                </div>
                <AccountQuickActions />
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="h-6 w-1 bg-blue-500 rounded-full" />
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                    {t("account.preferences")}
                  </h2>
                </div>
                <AccountSettingsCard />
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="h-6 w-1 bg-red-500 rounded-full" />
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                    {t("account.management")}
                  </h2>
                </div>
                <AccountActionsCard onLogout={handleLogout} />
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
