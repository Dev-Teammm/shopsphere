"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Mail,
  Lock,
  Bell,
  Palette,
  Monitor,
  Moon,
  Sun,
  Laptop,
  Layout,
  EyeIcon,
  GlobeIcon,
  ShieldAlert,
  ArrowUpFromLine,
  SaveIcon,
  CheckCircle2,
  Grid3X3Icon,
  BarChart4,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
  // Theme handling
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // State for form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [denseMode, setDenseMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [dataExport, setDataExport] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [showSaved, setShowSaved] = useState(false);

  // Function to simulate saving settings
  const handleSave = () => {
    setShowSaved(true);
    setTimeout(() => {
      setShowSaved(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Customize your dashboard experience and manage account settings
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="appearance" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
          <TabsList className="w-full max-w-2xl mb-6 grid grid-cols-2 md:grid-cols-5 gap-1">
            <TabsTrigger
              value="appearance"
              className="flex items-center justify-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Palette className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Appearance</span>
              <span className="sm:hidden">Theme</span>
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="flex items-center justify-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <User className="w-4 h-4 mr-2" />
              Account
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center justify-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Bell className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Alerts</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center justify-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Lock className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="flex items-center justify-center data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">System</span>
              <span className="sm:hidden">Reset</span>
            </TabsTrigger>
          </TabsList>

          {showSaved && (
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-500 border-green-500/20 flex items-center"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Settings saved
            </Badge>
          )}
        </div>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="w-5 h-5 mr-2 text-primary" />
                  Theme
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Color Theme</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        className={
                          theme === "light"
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }
                        onClick={() => setTheme("light")}
                      >
                        <Sun className="w-4 h-4 mr-2" />
                        Light
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        className={
                          theme === "dark"
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }
                        onClick={() => setTheme("dark")}
                      >
                        <Moon className="w-4 h-4 mr-2" />
                        Dark
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "outline"}
                        className={
                          theme === "system"
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }
                        onClick={() => setTheme("system")}
                      >
                        <Laptop className="w-4 h-4 mr-2" />
                        System
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="sidebar-collapsed"
                        className="flex items-center gap-2"
                      >
                        <Layout className="w-4 h-4" />
                        Collapsed Sidebar by Default
                      </Label>
                      <Switch
                        id="sidebar-collapsed"
                        checked={sidebarCollapsed}
                        onCheckedChange={setSidebarCollapsed}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      When enabled, the sidebar will be collapsed when you first
                      load the dashboard
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="dense-mode"
                        className="flex items-center gap-2"
                      >
                        <Grid3X3Icon className="w-4 h-4" />
                        Dense Mode
                      </Label>
                      <Switch
                        id="dense-mode"
                        checked={denseMode}
                        onCheckedChange={setDenseMode}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Compact view with smaller padding and text size
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90"
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GlobeIcon className="w-5 h-5 mr-2 text-primary" />
                  Regional Settings
                </CardTitle>
                <CardDescription>
                  Configure language, time zone, and date format preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger
                        id="language"
                        className="border-primary/20 focus-visible:ring-primary"
                      >
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Time Zone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger
                        id="timezone"
                        className="border-primary/20 focus-visible:ring-primary"
                      >
                        <SelectValue placeholder="Select time zone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">
                          UTC (Coordinated Universal Time)
                        </SelectItem>
                        <SelectItem value="EST">
                          EST (Eastern Standard Time)
                        </SelectItem>
                        <SelectItem value="CST">
                          CST (Central Standard Time)
                        </SelectItem>
                        <SelectItem value="MST">
                          MST (Mountain Standard Time)
                        </SelectItem>
                        <SelectItem value="PST">
                          PST (Pacific Standard Time)
                        </SelectItem>
                        <SelectItem value="GMT">
                          GMT (Greenwich Mean Time)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger
                        id="date-format"
                        className="border-primary/20 focus-visible:ring-primary"
                      >
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        <SelectItem value="DD.MM.YYYY">DD.MM.YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select defaultValue="rwf">
                      <SelectTrigger
                        id="currency"
                        className="border-primary/20 focus-visible:ring-primary"
                      >
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rwf">RWF</SelectItem>
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="eur">EUR (€)</SelectItem>
                        <SelectItem value="gbp">GBP (£)</SelectItem>
                        <SelectItem value="jpy">JPY (¥)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90"
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-primary" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your account information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="w-24 h-24 border-2 border-border">
                      <AvatarImage src="" alt={name} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 border-primary/20 hover:bg-primary/5 hover:text-primary"
                    >
                      Change Picture
                    </Button>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-primary/20 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-primary/20 focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div>
                    <div className="font-medium mb-1">Role</div>
                    <div className="flex items-center">
                      <Badge className="bg-primary">{"ADMIN"}</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Last Login</div>
                    <div className="text-sm text-muted-foreground">
                      {/* {new Date(mockUser.lastLogin).toLocaleString()} */}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90"
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart4 className="w-5 h-5 mr-2 text-primary" />
                  Dashboard Preferences
                </CardTitle>
                <CardDescription>
                  Customize your dashboard experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-view">Default Dashboard View</Label>
                    <Select defaultValue="analytics">
                      <SelectTrigger
                        id="default-view"
                        className="border-primary/20 focus-visible:ring-primary"
                      >
                        <SelectValue placeholder="Select default view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analytics">
                          Analytics Overview
                        </SelectItem>
                        <SelectItem value="orders">Recent Orders</SelectItem>
                        <SelectItem value="products">
                          Product Management
                        </SelectItem>
                        <SelectItem value="customers">Customer List</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="items-per-page">Items Per Page</Label>
                    <Select defaultValue="10">
                      <SelectTrigger
                        id="items-per-page"
                        className="border-primary/20 focus-visible:ring-primary"
                      >
                        <SelectValue placeholder="Select items per page" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="confirm-actions"
                        className="flex items-center gap-2"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Confirm Before Actions
                      </Label>
                      <Switch
                        id="confirm-actions"
                        defaultChecked={true}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Show confirmation dialogs before deletions and other
                      critical actions
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="data-export"
                        className="flex items-center gap-2"
                      >
                        <ArrowUpFromLine className="w-4 h-4" />
                        Enable Data Export
                      </Label>
                      <Switch
                        id="data-export"
                        checked={dataExport}
                        onCheckedChange={setDataExport}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Allow exporting data to CSV and Excel formats
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90"
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2 text-primary" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Notifications</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="cursor-pointer">Order Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about new orders and status
                        changes
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="cursor-pointer">Product Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Notifications about inventory changes and product issues
                      </p>
                    </div>
                    <Switch
                      checked={productUpdates}
                      onCheckedChange={setProductUpdates}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="cursor-pointer">Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Important security notifications about your account
                      </p>
                    </div>
                    <Switch
                      checked={securityAlerts}
                      onCheckedChange={setSecurityAlerts}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Dashboard Notifications
                  </h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="cursor-pointer">Real-time Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Show notifications in real-time while using the
                        dashboard
                      </p>
                    </div>
                    <Switch
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="cursor-pointer">
                        Critical Notifications Only
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Only show critical notifications like inventory alerts
                      </p>
                    </div>
                    <Switch
                      defaultChecked={false}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="cursor-pointer">Sound Effects</Label>
                      <p className="text-sm text-muted-foreground">
                        Play sound when new notifications arrive
                      </p>
                    </div>
                    <Switch
                      defaultChecked={false}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <h3 className="text-lg font-medium mb-4">
                  Notification Frequency
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                  >
                    Real-time
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary text-primary bg-primary/5"
                  >
                    Hourly Digest
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                  >
                    Daily Digest
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                  >
                    Weekly Digest
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90"
              >
                <SaveIcon className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-primary" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your account security preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-primary/20 hover:bg-primary/5 hover:text-primary"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="two-factor"
                        className="flex items-center gap-2"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Two-Factor Authentication
                      </Label>
                      <Switch
                        id="two-factor"
                        checked={twoFactorEnabled}
                        onCheckedChange={setTwoFactorEnabled}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enable two-factor authentication for enhanced security
                    </p>
                  </div>

                  {twoFactorEnabled && (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <p className="text-sm mb-3">
                        Two-factor authentication has been enabled for your
                        account. You will be prompted for a verification code
                        when signing in.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/20 hover:bg-primary/5 hover:text-primary"
                      >
                        Manage 2FA Settings
                      </Button>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">Session Timeout</Label>
                    <Select
                      value={sessionTimeout}
                      onValueChange={setSessionTimeout}
                    >
                      <SelectTrigger
                        id="session-timeout"
                        className="border-primary/20 focus-visible:ring-primary"
                      >
                        <SelectValue placeholder="Select session timeout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Automatically log out after a period of inactivity
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90"
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <EyeIcon className="w-5 h-5 mr-2 text-primary" />
                  Login Activity
                </CardTitle>
                <CardDescription>
                  Review recent login activity on your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="flex justify-between border-b border-border/30 pb-3"
                      >
                        <div>
                          <p className="font-medium">
                            Login from Chrome on Windows
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(
                              Date.now() - i * 86400000,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <Badge
                          variant={i === 0 ? "default" : "outline"}
                          className={
                            i === 0
                              ? "bg-primary"
                              : "bg-green-500/10 text-green-500 border-green-500/20"
                          }
                        >
                          {i === 0 ? "Current" : "Successful"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Sign Out All Devices
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
