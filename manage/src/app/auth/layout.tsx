"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-10 text-white lg:flex overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-blue-700/90 to-blue-800/90" />
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-20 flex items-center text-xl font-bold">
          <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-md mr-3 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
          </div>
          Shopsphere Admin, Employee and Delivery Agent portal
        </div>

        <div className="relative z-20 flex-1 flex flex-col justify-center space-y-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img
                src="/pc.png"
                alt="Dashboard Analytics"
                className="w-80 h-60 object-cover rounded-2xl shadow-2xl border border-white/20"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-400 rounded-md flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    Real-time Analytics
                  </div>
                  <div className="text-xs opacity-80">Live data insights</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-400 rounded-md flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold">Inventory Control</div>
                  <div className="text-xs opacity-80">Stock management</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-400 rounded-md flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold">Customer Support</div>
                  <div className="text-xs opacity-80">24/7 assistance</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-400 rounded-md flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold">Sales Reports</div>
                  <div className="text-xs opacity-80">Detailed analytics</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">99.9%</div>
                <div className="text-xs opacity-80">Uptime</div>
              </div>
              <div>
                <div className="text-2xl font-bold">50K+</div>
                <div className="text-xs opacity-80">Orders</div>
              </div>
              <div>
                <div className="text-2xl font-bold">24/7</div>
                <div className="text-xs opacity-80">Support</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Quote */}
        <div className="relative z-20 mt-8">
          <blockquote className="space-y-3">
            <p className="text-lg leading-relaxed">
              "Shopsphere has transformed how we manage our online
              marketplace operations. The intuitive dashboard and powerful
              analytics give us complete control over our business growth."
            </p>
            <footer className="flex items-center space-x-3">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face&auto=format&q=80"
                alt="Admin"
                className="w-10 h-10 rounded-full border-2 border-white/30"
              />
              <div>
                <div className="text-sm font-semibold">KAGABO Emmanuel</div>
                <div className="text-xs opacity-80">Owner</div>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <Suspense fallback={<div>Loading...</div>}>
            <AuthParamsListener />
            {children}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function AuthParamsListener() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get("message");
    if (message === "invitation-accepted") {
      toast.success(
        "Invitation accepted successfully! You can now log in with your credentials.",
      );
    } else if (message === "invitation-declined") {
      toast.info(
        "Invitation declined. You can still log in with your existing account.",
      );
    } else if (message === "signup-success") {
      toast.success(
        "Account created successfully! You can now log in with your credentials.",
      );
    }
  }, [searchParams]);

  return null;
}
