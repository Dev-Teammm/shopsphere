"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Shield,
  Truck,
  Gift,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { rewardSystemService } from "@/lib/rewardSystemService";
import { formatPrice } from "@/lib/utils/priceFormatter";
import { GiveFeedbackDialog } from "@/components/GiveFeedbackDialog";
import { useTranslation } from "react-i18next";
import { BRAND } from "@/lib/brand";

const Footer = () => {
  const { t } = useTranslation();
  const [isRewardSystemActive, setIsRewardSystemActive] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    const checkRewardSystem = async () => {
      try {
        const status = await rewardSystemService.checkStatus();
        setIsRewardSystemActive(status.isActive);
      } catch (error) {
        console.error("Failed to check reward system status:", error);
      }
    };

    checkRewardSystem();
  }, []);

  return (
    <footer className="bg-muted/30 border-t">
      <div className="container mx-auto px-4">
        {/* Newsletter */}
        <div className="py-12 text-center border-b">
          <h3 className="text-2xl font-bold mb-2">{t("footer.stayInLoop")}</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {t("footer.newsletterDesc")}
          </p>
          <div className="flex max-w-md mx-auto gap-2">
            <Input
              placeholder={t("footer.emailPlaceholder")}
              className="flex-1"
            />
            <Button>{t("footer.subscribe")}</Button>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-primary mb-4">
                {BRAND.name}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                {t("footer.tagline")}
              </p>

              {/* Contact Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>+250 788 458 261</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>aphrorwa@gmail.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>RCA. Nyabihu RN4, Ruhengeri-Gisenyi Rd, Mukamira</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">{t("footer.quickLinks")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.aboutUs")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.contact")}
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setFeedbackOpen(true)}
                    className="hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <MessageSquare className="h-3 w-3" />
                    {t("footer.giveFeedback")}
                  </button>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.careers")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.press")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.blog")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.affiliate")}
                  </a>
                </li>
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h4 className="font-semibold mb-4">
                {t("footer.customerService")}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.helpCenter")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.shippingInfo")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.returns")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.sizeGuide")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.trackOrder")}
                  </a>
                </li>
                {isRewardSystemActive && (
                  <li>
                    <Link
                      href="/reward-system"
                      className="hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Gift className="h-3 w-3" />
                      {t("footer.rewardSystem")}
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h4 className="font-semibold mb-4">{t("footer.policies")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.privacy")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.terms")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.cookie")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.accessibility")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.security")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    {t("footer.intellectualProperty")}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t("footer.rights", { year: new Date().getFullYear() })}
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {t("footer.followUs")}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Instagram className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Youtube className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <GiveFeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </footer>
  );
};

export default Footer;
