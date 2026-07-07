"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  Package,
  MapPin,
  CreditCard,
  Bell,
  Lock,
  Settings,
  LogOut,
  ChevronRight,
  PenLine,
  Calendar,
  ShoppingBag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils/priceFormatter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

// Mock user data
const userData = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+250 788 458 261",
  addresses: [
    {
      id: "addr1",
      name: "Home",
      streetAddress: "123 Main St, Apt 4B",
      city: "New York",
      stateProvince: "NY",
      postalCode: "10001",
      country: "United States",
      isDefault: true,
    },
    {
      id: "addr2",
      name: "Office",
      streetAddress: "456 Business Ave, Suite 200",
      city: "New York",
      stateProvince: "NY",
      postalCode: "10002",
      country: "United States",
      isDefault: false,
    },
  ],
  paymentMethods: [
    {
      id: "pm1",
      type: "Visa",
      last4: "1234",
      expiryDate: "05/25",
      isDefault: true,
    },
    {
      id: "pm2",
      type: "MasterCard",
      last4: "5678",
      expiryDate: "12/24",
      isDefault: false,
    },
  ],
  orders: [
    {
      id: "ord1",
      orderNumber: "ORD-123456",
      date: "2023-06-15",
      status: "Delivered",
      total: 149.99,
      items: 3,
    },
    {
      id: "ord2",
      orderNumber: "ORD-789012",
      date: "2023-07-22",
      status: "Shipped",
      total: 89.95,
      items: 2,
    },
    {
      id: "ord3",
      orderNumber: "ORD-345678",
      date: "2023-08-10",
      status: "Processing",
      total: 54.99,
      items: 1,
    },
  ],
  settings: {
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: true,
  },
};

export function AccountClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  // Navigation items
  const navItems = [
    { name: t("account.dashboard"), icon: User, key: "dashboard" },
    { name: t("account.orders"), icon: Package, key: "orders" },
    { name: t("account.addresses"), icon: MapPin, key: "addresses" },
    { name: t("account.paymentMethods"), icon: CreditCard, key: "payment" },
    { name: t("account.security"), icon: Lock, key: "security" },
    { name: t("account.notifications"), icon: Bell, key: "notifications" },
    { name: t("account.settings"), icon: Settings, key: "settings" },
  ];
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => {
    // Check for tab in URL params
    const tab = searchParams.get("tab");
    if (tab && navItems.some((item) => item.key === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleLogout = () => {
    // In a real app, this would handle logout functionality
    console.log("User logged out");
    // Redirect to home page
    window.location.href = "/";
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("account.overview")}</CardTitle>
                <CardDescription>{t("account.overviewDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold">
                      {t("account.personalInfo")}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("account.personalInfoDesc")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 self-start"
                  >
                    <PenLine className="h-3 w-3" />
                    {t("account.edit")}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("account.firstName")}</Label>
                    <Input value={userData.firstName} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("account.lastName")}</Label>
                    <Input value={userData.lastName} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("account.email")}</Label>
                    <Input value={userData.email} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("account.phone")}</Label>
                    <Input value={userData.phone} readOnly />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {t("account.recentOrders")}
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href="#"
                        onClick={() => setActiveTab("orders")}
                        className="flex items-center gap-1"
                      >
                        {t("account.viewAll")}{" "}
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("account.orderNumber")}</TableHead>
                        <TableHead>{t("account.date")}</TableHead>
                        <TableHead>{t("account.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userData.orders.slice(0, 3).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>{formatDate(order.date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.status === "Delivered"
                                  ? "outline"
                                  : order.status === "Shipped"
                                    ? "secondary"
                                    : "default"
                              }
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {t("account.addresses")}
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href="#"
                        onClick={() => setActiveTab("addresses")}
                        className="flex items-center gap-1"
                      >
                        {t("account.viewAll")}{" "}
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userData.addresses.slice(0, 1).map((address) => (
                      <div
                        key={address.id}
                        className="border p-3 rounded-lg relative"
                      >
                        {address.isDefault && (
                          <Badge
                            className="absolute top-3 right-3"
                            variant="secondary"
                          >
                            {t("account.default")}
                          </Badge>
                        )}
                        <p className="font-medium">{address.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {address.streetAddress}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.city}, {address.stateProvince}{" "}
                          {address.postalCode}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.country}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setActiveTab("addresses")}
                  >
                    {t("account.addNewAddress") || "Add New Address"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        );

      case "orders":
        return (
          <Card>
            <CardHeader>
              <CardTitle>{t("account.orderHistory")}</CardTitle>
              <CardDescription>{t("account.orderHistoryDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("account.orderNumber")}</TableHead>
                    <TableHead>{t("account.date")}</TableHead>
                    <TableHead>{t("cart.quantity")}</TableHead>
                    <TableHead>{t("cart.total")}</TableHead>
                    <TableHead>{t("account.status")}</TableHead>
                    <TableHead className="text-right">
                      {t("wishlist.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userData.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>{formatDate(order.date)}</TableCell>
                      <TableCell>{order.items}</TableCell>
                      <TableCell>{formatPrice(order.total)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "Delivered"
                              ? "outline"
                              : order.status === "Shipped"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">
                          {t("account.viewDetails") || "View Details"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case "addresses":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t("account.addresses")}</CardTitle>
                <CardDescription>
                  {t("account.addressesDesc") ||
                    "Manage your shipping addresses"}
                </CardDescription>
              </div>
              <Button>{t("account.addNewAddress") || "Add New Address"}</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userData.addresses.map((address) => (
                  <div
                    key={address.id}
                    className="border p-4 rounded-lg relative"
                  >
                    {address.isDefault && (
                      <Badge
                        className="absolute top-4 right-4"
                        variant="secondary"
                      >
                        {t("account.default")}
                      </Badge>
                    )}
                    <p className="font-medium">{address.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {address.streetAddress}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.stateProvince}{" "}
                      {address.postalCode}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {address.country}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        {t("account.edit")}
                      </Button>
                      {!address.isDefault && (
                        <Button size="sm" variant="ghost">
                          {t("account.setAsDefault") || "Set as Default"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case "payment":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t("account.paymentMethods")}</CardTitle>
                <CardDescription>
                  {t("account.paymentMethodsDesc") ||
                    "Manage your payment methods"}
                </CardDescription>
              </div>
              <Button>{t("account.addNewCard") || "Add New Card"}</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userData.paymentMethods.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 bg-muted rounded flex items-center justify-center font-semibold">
                        {payment.type}
                      </div>
                      <div>
                        <p className="font-medium">
                          {payment.type} ending in {payment.last4}
                          {payment.isDefault && (
                            <Badge className="ml-2" variant="secondary">
                              Default
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Expires {payment.expiryDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                      {!payment.isDefault && (
                        <Button size="sm" variant="ghost">
                          Set as Default
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case "security":
        return (
          <Card>
            <CardHeader>
              <CardTitle>{t("account.security")}</CardTitle>
              <CardDescription>
                {t("account.securityDesc") || "Manage your account security"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {t("account.password")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("account.passwordLastChanged") ||
                      "Your password was last changed"}{" "}
                    6 months ago
                  </p>
                  <Button variant="outline">
                    {t("account.changePassword") || "Change Password"}
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold">
                    {t("account.twoFactor")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("account.twoFactorDesc") ||
                      "Add an extra layer of security to your account"}
                  </p>
                  <Button variant="outline">
                    {t("account.setupTwoFactor") || "Set Up 2FA"}
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold">
                    {t("account.loginHistory") || "Login History"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("account.loginHistoryDesc") || "Recent login activity"}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">New York, USA</p>
                        <p className="text-xs text-muted-foreground">
                          Chrome on Windows
                        </p>
                      </div>
                      <p className="text-sm">
                        {t("account.justNow") || "Just now"}
                      </p>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">New York, USA</p>
                        <p className="text-xs text-muted-foreground">
                          Chrome on Windows
                        </p>
                      </div>
                      <p className="text-sm">
                        3 {t("account.daysAgo") || "days ago"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "notifications":
        return (
          <Card>
            <CardHeader>
              <CardTitle>
                {t("account.notifications") || "Notification Preferences"}
              </CardTitle>
              <CardDescription>
                {t("account.notificationsDesc") ||
                  "Manage how you receive notifications"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {t("account.orderUpdates") || "Order Updates"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("account.orderUpdatesDesc") ||
                        "Receive updates about your order status"}
                    </p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="orderEmail" checked />
                      <label htmlFor="orderEmail" className="text-sm">
                        {t("account.email")}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="orderSms" />
                      <label htmlFor="orderSms" className="text-sm">
                        {t("account.sms") || "SMS"}
                      </label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {t("account.promotions") || "Promotions & Discounts"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("account.promotionsDesc") ||
                        "Receive promotions, discounts, and sale notifications"}
                    </p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="promoEmail" checked />
                      <label htmlFor="promoEmail" className="text-sm">
                        {t("account.email")}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="promoSms" />
                      <label htmlFor="promoSms" className="text-sm">
                        {t("account.sms") || "SMS"}
                      </label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {t("account.accountActivity") || "Account Activity"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("account.accountActivityDesc") ||
                        "Receive notifications about your account activity"}
                    </p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="accountEmail" checked />
                      <label htmlFor="accountEmail" className="text-sm">
                        {t("account.email")}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="accountSms" />
                      <label htmlFor="accountSms" className="text-sm">
                        {t("account.sms") || "SMS"}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">
                {t("account.savePreferences") || "Save Preferences"}
              </Button>
            </CardFooter>
          </Card>
        );

      case "settings":
        return (
          <Card>
            <CardHeader>
              <CardTitle>{t("account.settings")}</CardTitle>
              <CardDescription>
                {t("account.settingsDesc") ||
                  "Manage your general account settings"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold">
                  {t("account.language") || "Language Preference"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("account.languageDesc") ||
                    "Select your preferred language"}
                </p>
                <select className="w-full p-2 border rounded-lg mt-1">
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                </select>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold">
                  {t("account.currency") || "Currency Preference"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("account.currencyDesc") ||
                    "Select your preferred currency"}
                </p>
                <select
                  className="w-full p-2 border rounded-lg mt-1"
                  defaultValue="rwf"
                >
                  <option value="rwf">RWF</option>
                  <option value="usd">USD ($)</option>
                  <option value="eur">EUR (€)</option>
                  <option value="gbp">GBP (£)</option>
                  <option value="jpy">JPY (¥)</option>
                </select>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold">
                  {t("account.actions") || "Account Actions"}
                </h3>
                <div className="mt-4 space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {t("account.downloadData") || "Download My Data"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {t("account.deleteAccount") || "Delete Account"}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">
                {t("account.saveSettings") || "Save Settings"}
              </Button>
            </CardFooter>
          </Card>
        );

      default:
        return <p>Select a section from the sidebar</p>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 md:hidden">
        {t("account.title")}
      </h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Mobile Navigation */}
        <Sheet open={showMobileNav} onOpenChange={setShowMobileNav}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full md:hidden mb-4">
              {navItems.find((item) => item.key === activeTab)?.name || "Menu"}
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>{t("account.navigation") || "Navigation"}</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 space-y-1">
              {navItems.map((item) => (
                <Button
                  key={item.key}
                  variant={activeTab === item.key ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveTab(item.key);
                    setShowMobileNav(false);
                  }}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Button>
              ))}
              <Separator className="my-2" />
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("header.signOut")}
              </Button>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 shrink-0">
          <div className="bg-card border rounded-md p-4 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-medium">
                  {userData.firstName} {userData.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {userData.email}
                </p>
              </div>
            </div>
            <Separator className="mb-4" />
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Button
                  key={item.key}
                  variant={activeTab === item.key ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(item.key)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Button>
              ))}
              <Separator className="my-2" />
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("header.signOut")}
              </Button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-6 hidden md:block">
            {navItems.find((item) => item.key === activeTab)?.name ||
              "My Account"}
          </h1>

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
