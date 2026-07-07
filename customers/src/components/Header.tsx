"use client";
import { useState, FormEvent, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  Heart,
  MessageSquare,
  Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { SearchBarWithSuggestions } from "@/components/SearchBarWithSuggestions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEnhancedNavigation } from "@/hooks/useEnhancedNavigation";
import { NavigationLink, AuthLink } from "@/components/NavigationLink";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CartService } from "@/lib/cartService";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { logout } from "@/lib/store/slices/authSlice";
import { DeliveryStatus } from "@/components/DeliveryStatus";
import { GiveFeedbackDialog } from "@/components/GiveFeedbackDialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";

const Header = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { navigateWithReload, navigateToAuthRoute, createClickHandler } =
    useEnhancedNavigation();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading } = useAppSelector(
    (state) => state.auth,
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [cartItemCount, setCartItemCount] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleSearch = (e: FormEvent, term?: string) => {
    e.preventDefault();

    const searchQuery = term || searchTerm;
    if (!searchQuery.trim()) return;

    const searchParams = new URLSearchParams();
    searchParams.set("searchTerm", searchQuery.trim());

    router.push(`/shop?${searchParams.toString()}`);

    setSearchTerm("");
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      // Force reload after logout to clear all cached data
      navigateWithReload("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getUserInitials = () => {
    if (!user) return "U";

    const firstName = user.firstName || user.userName || "";
    const lastName = user.lastName || "";

    if (!firstName && !lastName) return "U";

    const firstInitial = firstName.charAt(0) || "";
    const lastInitial = lastName.charAt(0) || "";

    return `${firstInitial}${lastInitial}`.toUpperCase() || "U";
  };

  useEffect(() => {
    const getCartCount = async () => {
      try {
        const count = await CartService.getCartItemsCount();
        setCartItemCount(count);
      } catch (error) {
        console.error("Error fetching cart count:", error);
        setCartItemCount(0);
      }
    };

    getCartCount();

    const handleStorageChange = () => {
      getCartCount();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cartUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cartUpdated", handleStorageChange);
    };
  }, []);

  // Refresh cart count when authentication state changes
  useEffect(() => {
    const getCartCount = async () => {
      try {
        const count = await CartService.getCartItemsCount();
        setCartItemCount(count);
      } catch (error) {
        console.error("Error fetching cart count:", error);
        setCartItemCount(0);
      }
    };

    getCartCount();
  }, [isAuthenticated]);

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Mobile Top Bar: visible on small screens */}
        <div className="flex sm:hidden items-center justify-between py-2 text-sm border-b px-2">
          {/* Keep these three prominent on mobile: Create Shop, Track Order, Language */}
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={
                      process.env.NODE_ENV === "production"
                        ? "https://shopsphere-mng.vercel.app"
                        : "http://localhost:3001"
                    }
                    className="text-muted-foreground hover:text-primary transition-colors font-medium text-xs max-w-[140px] sm:max-w-[220px] truncate"
                    target="_blank"
                    rel="noopener noreferrer"
                    onDoubleClick={() => toast(t("header.createShop"))}
                    title={t("header.createShop")}
                  >
                    {t("header.createShop")}
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">{t("header.createShop")}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavigationLink
                    href="/track-order"
                    className="text-muted-foreground hover:text-primary transition-colors text-xs max-w-[140px] sm:max-w-[220px] truncate"
                    onDoubleClick={() => toast(t("header.trackOrder"))}
                    title={t("header.trackOrder")}
                  >
                    {t("header.trackOrder")}
                  </NavigationLink>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">{t("header.trackOrder")}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* language switcher stays visible */}
            <div className="ml-1">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Desktop / larger screens top bar */}
        <div className="hidden sm:flex items-center justify-between py-2 text-sm border-b">
          <div className="flex items-center gap-4">
            <Link
              href={
                process.env.NODE_ENV === "production"
                  ? "https://shopsphere-mng.vercel.app"
                  : "http://localhost:3001"
              }
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("header.createShop")}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <DeliveryStatus />
            <LanguageSwitcher />
            <span className="text-muted-foreground">{t("header.help")}</span>
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <MessageSquare className="h-4 w-4" />
              {t("header.giveFeedback")}
            </button>
            <NavigationLink
              href="/track-order"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t("header.trackOrder")}
            </NavigationLink>
          </div>
        </div>

        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] sm:w-[320px] overflow-y-auto"
              >
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-left text-xl">
                    {BRAND.name}
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile menu: improved layout for delivery/help/feedback */}
                <div className="mb-6 space-y-4">
                  {/* Delivery Status Section - Full Width with Better Spacing */}
                  <div className="w-full border-b pb-4">
                    <DeliveryStatus className="w-full" />
                  </div>

                  {/* Help & Feedback Section - Stacked for better readability */}
                  <div className="w-full space-y-3 border-b pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground font-medium">
                        {t("header.help")}
                      </span>
                      <div className="flex-shrink-0">
                        <LanguageSwitcher />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFeedbackOpen(true)}
                      className="w-full text-left text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 p-2 rounded-md hover:bg-accent"
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {t("header.giveFeedback")}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex flex-col space-y-1">
                  <NavigationLink
                    href="/"
                    className="text-base font-medium px-3 py-2.5 hover:text-primary hover:bg-accent rounded-md transition-colors"
                  >
                    {t("header.home")}
                  </NavigationLink>
                  <NavigationLink
                    href="/shop"
                    className="text-base font-medium px-3 py-2.5 hover:text-primary hover:bg-accent rounded-md transition-colors"
                  >
                    {t("header.shop")}
                  </NavigationLink>
                  <NavigationLink
                    href="/stores"
                    className="text-base font-medium px-3 py-2.5 hover:text-primary hover:bg-accent rounded-md transition-colors"
                  >
                    {t("header.stores")}
                  </NavigationLink>
                  <NavigationLink
                    href="/track-order"
                    className="text-base font-medium px-3 py-2.5 hover:text-primary hover:bg-accent rounded-md transition-colors"
                  >
                    {t("header.trackOrder")}
                  </NavigationLink>

                  {/* Auth Section */}
                  <div className="pt-4 mt-4 border-t space-y-1">
                    {isAuthenticated ? (
                      <>
                        <AuthLink
                          href="/account"
                          className="text-base font-medium px-3 py-2.5 hover:text-primary hover:bg-accent rounded-md transition-colors flex items-center gap-2"
                        >
                          <User className="h-4 w-4" />
                          {t("header.myAccount")}
                        </AuthLink>
                        <AuthLink
                          href="/wishlist"
                          className="text-base font-medium px-3 py-2.5 hover:text-primary hover:bg-accent rounded-md transition-colors flex items-center gap-2"
                        >
                          <Heart className="h-4 w-4" />
                          {t("header.wishlist")}
                        </AuthLink>
                        <button
                          onClick={handleLogout}
                          className="w-full text-base font-medium px-3 py-2.5 hover:text-primary hover:bg-accent rounded-md transition-colors text-left flex items-center gap-2"
                        >
                          <LogOut className="h-4 w-4" />
                          {t("header.logout")}
                        </button>
                      </>
                    ) : (
                      <>
                        <NavigationLink
                          href="/auth/login"
                          forceReload={true}
                          className="text-base font-medium px-3 py-2.5 hover:text-primary hover:bg-accent rounded-md transition-colors"
                        >
                          {t("header.signIn")}
                        </NavigationLink>
                        <NavigationLink
                          href="/auth/register"
                          forceReload={true}
                          className="text-base font-medium px-3 py-2.5 hover:text-primary hover:bg-accent rounded-md transition-colors"
                        >
                          {t("header.signUp")}
                        </NavigationLink>
                      </>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
                {BRAND.name}
              </h1>
            </Link>

            {/* Navigation links close to logo */}
            <nav className="hidden md:flex items-center gap-4 ml-6">
              <NavigationLink
                href="/"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {t("header.home")}
              </NavigationLink>
              <NavigationLink
                href="/shop"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {t("header.shop")}
              </NavigationLink>
              <NavigationLink
                href="/stores"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {t("header.stores")}
              </NavigationLink>
            </nav>
          </div>

          {/* Search Bar - Full width between navigation and actions */}
          <div className="hidden md:flex flex-1 mx-6">
            <SearchBarWithSuggestions
              value={searchTerm}
              onChange={setSearchTerm}
              onSubmit={(e, term) => handleSearch(e, term)}
              placeholder={t("header.searchPlaceholder")}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="relative hidden sm:flex"
              onClick={createClickHandler("/wishlist", { forceReload: true })}
            >
              <Heart className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={createClickHandler("/cart", { forceReload: true })}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {cartItemCount}
                </Badge>
              )}
            </Button>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={createClickHandler("/account", {
                      forceReload: true,
                    })}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>{t("header.myAccount")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={createClickHandler("/wishlist", {
                      forceReload: true,
                    })}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    <span>{t("header.wishlist")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={createClickHandler("/account/settings", {
                      forceReload: true,
                    })}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t("header.settings")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("header.logout")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex"
                  onClick={createClickHandler("/auth/login", {
                    forceReload: true,
                  })}
                >
                  {t("header.signIn")}
                </Button>
                <Button
                  size="sm"
                  className="text-xs hidden sm:flex sm:text-sm px-2 sm:px-4"
                  onClick={createClickHandler("/auth/register", {
                    forceReload: true,
                  })}
                >
                  {t("header.signUp")}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation and Search */}
        <div className="pb-2 border-t pt-2 md:hidden">
          <div className="flex items-center justify-around mb-3">
            <NavigationLink
              href="/"
              className="text-xs font-medium text-center hover:text-primary transition-colors"
            >
              {t("header.home")}
            </NavigationLink>
            <NavigationLink
              href="/shop"
              className="text-xs font-medium text-center hover:text-primary transition-colors"
            >
              {t("header.shop")}
            </NavigationLink>
            <NavigationLink
              href="/stores"
              className="text-xs font-medium text-center hover:text-primary transition-colors"
            >
              {t("header.stores")}
            </NavigationLink>
          </div>

          {/* Mobile Search Bar */}
          <div className="px-2">
            <SearchBarWithSuggestions
              value={searchTerm}
              onChange={setSearchTerm}
              onSubmit={(e, term) => handleSearch(e, term)}
              placeholder={t("header.searchPlaceholder")}
              className="w-full"
            />
          </div>
        </div>
      </div>
      <GiveFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        defaultName={
          user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : ""
        }
        defaultEmail={user?.email || ""}
      />
    </header>
  );
};

export default Header;
