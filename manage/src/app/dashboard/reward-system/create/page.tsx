"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { shopService } from "@/lib/services/shop-service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { rewardSystemService } from "@/lib/services/reward-system-service";
import { RewardSystemDTO, RewardRangeDTO } from "@/lib/types/reward-system";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type TempRewardRange = Omit<RewardRangeDTO, "id"> & { tempId: string };

function CreateRewardSystemPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const shopSlug = searchParams.get("shopSlug");
  const shopIdRef = useRef<string | null>(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<RewardSystemDTO>({
    pointValue: 0.01,
    isActive: false,
    isSystemEnabled: true,
    isReviewPointsEnabled: false,
    reviewPointsAmount: 10,
    isPurchasePointsEnabled: false,
    isQuantityBasedEnabled: false,
    isAmountBasedEnabled: false,
    isPercentageBasedEnabled: false,
    percentageRate: 0.01,
    description: "",
    rewardRanges: [],
  });

  const [ranges, setRanges] = useState<TempRewardRange[]>([]);

  // Fetch shopId from shopSlug
  useEffect(() => {
    const fetchShopId = async () => {
      if (!shopSlug) {
        toast({
          title: "Error",
          description: "Shop slug is required",
          variant: "destructive",
        });
        router.push(
          `/dashboard/reward-system${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
        );
        return;
      }

      try {
        setShopLoading(true);
        const shop = await shopService.getShopBySlug(shopSlug);
        shopIdRef.current = shop.shopId;
        if (shop.shopId) {
          sessionStorage.setItem("selectedShopId", shop.shopId);
          sessionStorage.setItem("selectedShopSlug", shopSlug);
        }
      } catch (error: any) {
        console.error("Error fetching shop:", error);
        toast({
          title: "Error",
          description: "Failed to load shop information",
          variant: "destructive",
        });
        router.push(
          `/dashboard/reward-system${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
        );
      } finally {
        setShopLoading(false);
      }
    };

    fetchShopId();
  }, [shopSlug, router, toast]);

  const handleInputChange = (field: keyof RewardSystemDTO, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggle = (field: keyof RewardSystemDTO, value: boolean) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const addRange = (type: "QUANTITY" | "AMOUNT") => {
    const newRange: TempRewardRange = {
      rangeType: type,
      minValue: 0,
      maxValue: undefined,
      points: 0,
      description: "",
      tempId: `temp_${Date.now()}_${Math.random()}`,
    };
    setRanges((prev) => [...prev, newRange]);
  };

  const updateRange = (
    tempId: string,
    field: keyof RewardRangeDTO,
    value: any,
  ) => {
    setRanges((prev) =>
      prev.map((range) =>
        range.tempId === tempId ? { ...range, [field]: value } : range,
      ),
    );
  };

  const removeRange = (tempId: string) => {
    setRanges((prev) => prev.filter((range) => range.tempId !== tempId));
  };

  const handleSubmit = async () => {
    if (!shopIdRef.current) {
      toast({
        title: "Error",
        description: "Shop information not loaded",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const systemToSave = {
        ...config,
        rewardRanges: ranges.map(({ tempId, ...range }) => range),
      };

      const savedSystem = await rewardSystemService.saveRewardSystem(
        systemToSave,
        shopIdRef.current,
      );

      toast({
        title: "Success",
        description: "Reward system created successfully",
      });

      router.push(
        `/dashboard/reward-system${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
      );
    } catch (error: any) {
      console.error("Failed to create reward system:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to create reward system",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return config.pointValue > 0 && shopIdRef.current !== null;
  };

  if (shopLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shop information...</p>
        </div>
      </div>
    );
  }

  if (!shopIdRef.current) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Shop not found</p>
          <Button
            onClick={() =>
              router.push(
                `/dashboard/reward-system${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
              )
            }
            className="mt-4"
          >
            Back to Reward Systems
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create Reward System
          </h1>
          <p className="text-muted-foreground">
            Configure your new reward system with points, ranges, and rules
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Configuration</CardTitle>
              <CardDescription>
                Set up the fundamental reward system settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pointValue">point value (RWF)</Label>
                <Input
                  id="pointValue"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={config.pointValue}
                  onChange={(e) =>
                    handleInputChange(
                      "pointValue",
                      parseFloat(e.target.value) || 0.01,
                    )
                  }
                  placeholder="0.01"
                />
                <p className="text-sm text-muted-foreground">
                  How much each point is worth in dollars
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe your reward system..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Master toggle for the entire reward system
                  </p>
                </div>
                <Switch
                  checked={config.isSystemEnabled}
                  onCheckedChange={(checked) =>
                    handleToggle("isSystemEnabled", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review Points</CardTitle>
              <CardDescription>
                Configure points awarded for product reviews
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Review Points</Label>
                  <p className="text-sm text-muted-foreground">
                    Award points when users write reviews
                  </p>
                </div>
                <Switch
                  checked={config.isReviewPointsEnabled}
                  onCheckedChange={(checked) =>
                    handleToggle("isReviewPointsEnabled", checked)
                  }
                />
              </div>

              {config.isReviewPointsEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="reviewPointsAmount">Points per Review</Label>
                  <Input
                    id="reviewPointsAmount"
                    type="number"
                    min="1"
                    value={config.reviewPointsAmount}
                    onChange={(e) =>
                      handleInputChange(
                        "reviewPointsAmount",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="10"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Points</CardTitle>
              <CardDescription>
                Configure points awarded for purchases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Purchase Points</Label>
                  <p className="text-sm text-muted-foreground">
                    Award points when users make purchases
                  </p>
                </div>
                <Switch
                  checked={config.isPurchasePointsEnabled}
                  onCheckedChange={(checked) =>
                    handleToggle("isPurchasePointsEnabled", checked)
                  }
                />
              </div>

              {config.isPurchasePointsEnabled && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Quantity-Based Rewards</Label>
                      <p className="text-sm text-muted-foreground">
                        Award points based on product quantity
                      </p>
                    </div>
                    <Switch
                      checked={config.isQuantityBasedEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle("isQuantityBasedEnabled", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Amount-Based Rewards</Label>
                      <p className="text-sm text-muted-foreground">
                        Award points based on order amount
                      </p>
                    </div>
                    <Switch
                      checked={config.isAmountBasedEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle("isAmountBasedEnabled", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Percentage-Based Rewards</Label>
                      <p className="text-sm text-muted-foreground">
                        Award points as percentage of order value
                      </p>
                    </div>
                    <Switch
                      checked={config.isPercentageBasedEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle("isPercentageBasedEnabled", checked)
                      }
                    />
                  </div>

                  {config.isPercentageBasedEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="percentageRate">
                        Percentage Rate (%)
                      </Label>
                      <Input
                        id="percentageRate"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={config.percentageRate}
                        onChange={(e) =>
                          handleInputChange(
                            "percentageRate",
                            parseFloat(e.target.value) || 0.01,
                          )
                        }
                        placeholder="1.00"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {(config.isQuantityBasedEnabled || config.isAmountBasedEnabled) && (
            <Card>
              <CardHeader>
                <CardTitle>Reward Ranges</CardTitle>
                <CardDescription>
                  Define specific ranges for quantity and amount-based rewards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.isQuantityBasedEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Quantity-Based Ranges</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addRange("QUANTITY")}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Range
                      </Button>
                    </div>
                    {ranges
                      .filter((range) => range.rangeType === "QUANTITY")
                      .map((range) => (
                        <div
                          key={range.tempId}
                          className="flex items-center gap-2 p-3 border rounded-md"
                        >
                          <Input
                            type="number"
                            min="0"
                            placeholder="Min"
                            value={range.minValue}
                            onChange={(e) =>
                              updateRange(
                                range.tempId,
                                "minValue",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-20"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Max"
                            value={range.maxValue || ""}
                            onChange={(e) =>
                              updateRange(
                                range.tempId,
                                "maxValue",
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              )
                            }
                            className="w-20"
                          />
                          <Input
                            type="number"
                            min="0"
                            placeholder="Points"
                            value={range.points}
                            onChange={(e) =>
                              updateRange(
                                range.tempId,
                                "points",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-20"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRange(range.tempId)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}

                {config.isAmountBasedEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Amount-Based Ranges</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addRange("AMOUNT")}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Range
                      </Button>
                    </div>
                    {ranges
                      .filter((range) => range.rangeType === "AMOUNT")
                      .map((range) => (
                        <div
                          key={range.tempId}
                          className="flex items-center gap-2 p-3 border rounded-md"
                        >
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Min $"
                            value={range.minValue}
                            onChange={(e) =>
                              updateRange(
                                range.tempId,
                                "minValue",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-24"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Max $"
                            value={range.maxValue || ""}
                            onChange={(e) =>
                              updateRange(
                                range.tempId,
                                "maxValue",
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              )
                            }
                            className="w-24"
                          />
                          <Input
                            type="number"
                            min="0"
                            placeholder="Points"
                            value={range.points}
                            onChange={(e) =>
                              updateRange(
                                range.tempId,
                                "points",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-20"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRange(range.tempId)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !isFormValid() || !shopIdRef.current}
          className="min-w-[120px]"
        >
          {loading ? "Creating..." : "Create System"}
        </Button>
      </div>
    </div>
  );
}

export default function CreateRewardSystemPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <CreateRewardSystemPageContent />
    </Suspense>
  );
}
