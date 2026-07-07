"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";
import { DashboardResponseDTO } from "@/lib/types/dashboard";

interface AlertsProps {
  data: DashboardResponseDTO | undefined;
}

export function Alerts({ data }: AlertsProps) {
  if (!data) return null;

  // Check if we have any alerts to show using the new structure
  const lowStockCount = data.alerts?.lowStockProducts || 0;
  const pendingOrderCount = data.alerts?.pendingOrders || 0;
  const pendingReturnCount = data.alerts?.pendingReturns || 0;
  const pendingAppealCount = data.alerts?.pendingAppeals || 0;

  const hasAlerts =
    lowStockCount > 0 ||
    pendingOrderCount > 0 ||
    pendingReturnCount > 0 ||
    pendingAppealCount > 0;

  if (!hasAlerts) {
    return (
      <Card className="col-span-4">
        <CardHeader className="border-b border-border/50 bg-primary/5">
          <CardTitle className="text-primary font-serif">Alerts</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex items-center justify-center min-h-[100px]">
          <div className="text-center text-muted-foreground">
            <div className="flex justify-center mb-2">
              <Info className="h-6 w-6 text-primary/40" />
            </div>
            <p className="font-medium text-foreground">
              No alerts at this time.
            </p>
            <p className="mt-1 text-sm">
              Everything appears to be running smoothly!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-4 overflow-hidden border-none shadow-premium bg-background/50 backdrop-blur-sm">
      <CardHeader className="border-b border-border/10 bg-gradient-to-r from-primary/10 to-transparent">
        <CardTitle className="text-primary font-serif tracking-tight">
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ul className="space-y-4">
          {lowStockCount > 0 && (
            <li className="flex items-start gap-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors cursor-pointer group">
              <div className="p-2 rounded-full bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-amber-900 leading-none mb-1">
                  Low Stock Warning
                </p>
                <p className="text-amber-700/80 text-sm leading-relaxed">
                  {lowStockCount}{" "}
                  {lowStockCount === 1 ? "product is" : "products are"} running
                  low on inventory. Consider reordering soon.
                </p>
              </div>
            </li>
          )}

          {pendingOrderCount > 0 && (
            <li className="flex items-start gap-4 p-3 rounded-lg bg-green-500/5 border border-green-500/10 hover:bg-green-500/10 transition-colors cursor-pointer group">
              <div className="p-2 rounded-full bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-green-900 leading-none mb-1">
                  Pending Orders
                </p>
                <p className="text-green-700/80 text-sm leading-relaxed">
                  {pendingOrderCount}{" "}
                  {pendingOrderCount === 1 ? "order needs" : "orders need"}{" "}
                  processing. Please review and update their status.
                </p>
              </div>
            </li>
          )}

          {pendingReturnCount > 0 && (
            <li className="flex items-start gap-4 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-colors cursor-pointer group">
              <div className="p-2 rounded-full bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-rose-900 leading-none mb-1">
                  Pending Returns
                </p>
                <p className="text-rose-700/80 text-sm leading-relaxed">
                  {pendingReturnCount}{" "}
                  {pendingReturnCount === 1
                    ? "return request awaits"
                    : "return requests await"}{" "}
                  your review. Respond promptly to maintain customer
                  satisfaction.
                </p>
              </div>
            </li>
          )}

          {pendingAppealCount > 0 && (
            <li className="flex items-start gap-4 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10 hover:bg-violet-500/10 transition-colors cursor-pointer group">
              <div className="p-2 rounded-full bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-all">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-violet-900 leading-none mb-1">
                  Pending Appeals
                </p>
                <p className="text-violet-700/80 text-sm leading-relaxed">
                  {pendingAppealCount}{" "}
                  {pendingAppealCount === 1
                    ? "customer appeal requires"
                    : "customer appeals require"}{" "}
                  attention. These are follow-ups on previously denied returns.
                </p>
              </div>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
