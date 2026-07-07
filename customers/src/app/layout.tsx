import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ReduxProvider } from "@/lib/providers/ReduxProvider";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { I18nProvider } from "@/lib/providers/I18nProvider";
import { GlobalFetchHandler } from "@/components/GlobalFetchHandler";
import { BRAND } from "@/lib/brand";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: `${BRAND.name} - Multipurpose Marketplace`,
  description:
    "Sell and shop across every category on one trusted marketplace platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ReduxProvider>
          <I18nProvider>
            <AuthProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
              >
                <Header />
                <main>{children}</main>
                <Footer />
                <Toaster />
                <GlobalFetchHandler />
              </ThemeProvider>
            </AuthProvider>
          </I18nProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
