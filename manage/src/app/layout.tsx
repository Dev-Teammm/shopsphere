import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Work_Sans } from "next/font/google";
import ReduxProvider from "@/lib/redux/provider";
import QueryProvider from "@/lib/tanstack/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthChecker } from "@/components/auth/auth-checker";
import { BRAND } from "@/lib/brand";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: BRAND.adminTitle,
  description: BRAND.adminDescription,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${workSans.variable} font-sans antialiased`}>
        <ReduxProvider>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
              <AuthChecker>{children}</AuthChecker>
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
