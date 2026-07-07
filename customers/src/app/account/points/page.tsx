"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Coins,
  Store,
  ChevronRight,
  History,
  Gift,
  Search,
  Info,
  Loader2,
  ChevronDown,
  LayoutGrid,
  List as ListIcon,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { rewardService, UserRewardSummary } from "@/lib/services/rewardService";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

export default function ShopPointsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<UserRewardSummary | null>(null);
  const [page, setPage] = useState(0);

  const fetchRewards = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const data = await rewardService.getMyRewards({
        query,
        page: 0, // Reset to first page on search
        size: 50,
        sortBy: "shopName",
        sortDir: "asc",
      });
      setSummary(data);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      toast.error("Failed to load reward points");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRewards(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchRewards]);

  const totalValue = summary?.totalMonetaryValue || 0;
  const totalPoints = summary?.totalPoints || 0;

  return (
    <div className="min-h-screen bg-[#fcfdfc]">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full hover:bg-green-50 hover:text-green-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              My Reward Points
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Store className="h-3 w-3" /> Shop-specific loyalty rewards
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Summary Card */}
        <Card className="mb-10 border-none bg-gradient-to-br from-green-600 to-green-800 text-white shadow-xl shadow-green-100 overflow-hidden relative rounded-3xl">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Coins className="h-40 w-40 rotate-12" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-green-100 font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                <Gift className="h-4 w-4" />
              </div>
              Total Loyalty Value
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 pt-4 pb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="text-5xl font-black tracking-tight">
                  {totalValue.toLocaleString()}{" "}
                  <span className="text-xl font-bold opacity-80 uppercase ml-1">
                    RWF
                  </span>
                </div>
                <p className="text-green-100/80 text-sm font-medium mt-2 flex items-center gap-2">
                  <Store className="h-4 w-4" /> Across all participating shops
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                  <div className="text-[10px] uppercase font-bold text-green-200 tracking-widest mb-0.5">
                    Total Points
                  </div>
                  <div className="text-2xl font-black">
                    {totalPoints.toLocaleString()}{" "}
                    <span className="text-xs font-bold opacity-60">pts</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and List */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex items-center gap-3 self-start">
              <div className="h-8 w-1.5 bg-green-500 rounded-full" />
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                Your Rewards Portfolio
              </h2>
            </div>

            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-green-600 transition-colors" />
              <Input
                placeholder="Search by shop name..."
                className="pl-11 h-12 bg-white border-gray-100 focus-visible:ring-green-500 rounded-2xl shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <Loader2 className="h-10 w-10 text-green-500 animate-spin mb-4" />
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
                Syncing your rewards...
              </p>
            </div>
          ) : summary?.shopPoints && summary.shopPoints.length > 0 ? (
            <div className="grid gap-6">
              <Accordion
                type="single"
                collapsible
                className="w-full space-y-4 border-none"
              >
                {summary.shopPoints.map((shop) => (
                  <AccordionItem
                    key={shop.shopId}
                    value={shop.shopId}
                    className="border border-green-50 bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-green-100 transition-all duration-300 px-0"
                  >
                    <AccordionTrigger className="hover:no-underline py-0 px-6 h-auto">
                      <div className="flex flex-1 items-center gap-6 py-6 text-left">
                        <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100 shadow-inner group">
                          {shop.logoUrl ? (
                            <img
                              src={shop.logoUrl}
                              alt={shop.shopName}
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <Store className="h-8 w-8 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className="text-[9px] uppercase tracking-wider font-black text-green-700 border-green-100 bg-green-50 px-2 py-0.5 rounded-md"
                            >
                              {shop.category}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-black text-gray-900 truncate tracking-tight">
                            {shop.shopName}
                          </h3>
                          <div className="flex items-center gap-4 mt-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                              <Coins className="h-3.5 w-3.5 text-green-500" />
                              {shop.monetaryValue.toLocaleString()} RWF
                            </div>
                          </div>
                        </div>
                        <div className="hidden sm:flex flex-col items-end mr-4">
                          <div className="text-2xl font-black text-green-600">
                            {shop.points.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">
                            Points Available
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-gray-50/50 border-t border-gray-100 px-8 py-8">
                      <div className="max-w-3xl mx-auto space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                              <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                              Earning Rules
                            </h4>
                            <div className="space-y-3">
                              {shop.rewardSettings?.isPurchasePointsEnabled ? (
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
                                  <div className="p-2 bg-green-100 rounded-xl text-green-600">
                                    <ShoppingBag className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-gray-800">
                                      Order Rewards
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed mt-0.5">
                                      {shop.rewardSettings
                                        .isPercentageBasedEnabled
                                        ? `Earn ${shop.rewardSettings.percentageRate}% of your order total back in points.`
                                        : "Earn points based on order amount or quantity tiers."}
                                    </p>
                                  </div>
                                </div>
                              ) : null}
                              {shop.rewardSettings?.isReviewPointsEnabled ? (
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
                                  <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                                    <History className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-gray-800">
                                      Review Rewards
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed mt-0.5">
                                      Earn{" "}
                                      {shop.rewardSettings.reviewPointsAmount}{" "}
                                      points for every product review you write.
                                    </p>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                              <div className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
                              Redemption Value
                            </h4>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl font-black text-sm mb-3">
                                1 Point = {shop.rewardSettings?.pointValue || 0}{" "}
                                RWF
                              </div>
                              <p className="text-xs text-gray-500 font-medium px-4">
                                Use your points during checkout at{" "}
                                {shop.shopName} to reduce your total payment.
                              </p>
                            </div>
                          </div>
                        </div>

                        {shop.rewardSettings?.rewardRanges &&
                          shop.rewardSettings.rewardRanges.length > 0 && (
                            <div className="space-y-4 pt-4">
                              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="h-1.5 w-1.5 bg-purple-500 rounded-full" />
                                Reward Tiers
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {shop.rewardSettings.rewardRanges.map(
                                  (range, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <Badge
                                          variant="secondary"
                                          className="text-[9px] uppercase font-black tracking-tighter"
                                        >
                                          {range.rangeType}
                                        </Badge>
                                        <div className="text-green-600 font-black text-sm">
                                          +{range.points} pts
                                        </div>
                                      </div>
                                      <div className="text-xs font-bold text-gray-700">
                                        {range.maxValue
                                          ? `Between ${range.minValue} and ${range.maxValue}`
                                          : `Greater than ${range.minValue}`}
                                      </div>
                                      {range.description && (
                                        <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                                          {range.description}
                                        </p>
                                      )}
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                        <div className="flex justify-center pt-4">
                          <Button
                            onClick={() =>
                              router.push(`/stores/${shop.shopId}`)
                            }
                            className="bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-widest px-8 py-6 rounded-2xl shadow-lg shadow-green-100 transition-all flex items-center gap-2 group/visit"
                          >
                            Visit {shop.shopName}
                            <ChevronRight className="h-4 w-4 group-hover/visit:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                No rewards found
              </h3>
              <p className="text-muted-foreground text-sm font-medium mt-1">
                Try adjusting your search query or start shopping to earn
                points.
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="mt-6 border-green-100 text-green-700 font-bold hover:bg-green-50 rounded-xl px-8"
              >
                Clear Search
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
