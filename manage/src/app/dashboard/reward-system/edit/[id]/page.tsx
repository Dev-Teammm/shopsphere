"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { rewardSystemService } from "@/lib/services/reward-system-service";
import { RewardSystemDTO, RewardRangeDTO } from "@/lib/types/reward-system";
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Power,
  PowerOff,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function EditRewardSystemPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const systemId = params.id as string;
  const shopSlug = searchParams.get("shopSlug");
  const shopIdRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [shopLoading, setShopLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rewardSystem, setRewardSystem] = useState<RewardSystemDTO | null>(
    null,
  );
  const [rewardRanges, setRewardRanges] = useState<RewardRangeDTO[]>([]);
  const { toast } = useToast();

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

  useEffect(() => {
    if (systemId && shopIdRef.current && !shopLoading) {
      loadRewardSystem();
    }
  }, [systemId, shopLoading]);

  const loadRewardSystem = async () => {
    if (!shopIdRef.current) return;

    try {
      setLoading(true);
      const system = await rewardSystemService.getRewardSystemById(
        parseInt(systemId),
        shopIdRef.current,
      );
      setRewardSystem(system);
      setRewardRanges(system.rewardRanges || []);
    } catch (error) {
      console.error("Failed to load reward system:", error);
      toast({
        title: "Error",
        description: "Failed to load reward system",
        variant: "destructive",
      });
      router.push(
        `/dashboard/reward-system${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!rewardSystem) return;

    try {
      setSaving(true);

      // Validate reward ranges
      if (rewardSystem.isPurchasePointsEnabled) {
        if (
          rewardSystem.isQuantityBasedEnabled &&
          !rewardRanges.some((range) => range.rangeType === "QUANTITY")
        ) {
          toast({
            title: "Validation Error",
            description:
              "Quantity-based rewards require at least one quantity range",
            variant: "destructive",
          });
          return;
        }

        if (
          rewardSystem.isAmountBasedEnabled &&
          !rewardRanges.some((range) => range.rangeType === "AMOUNT")
        ) {
          toast({
            title: "Validation Error",
            description:
              "Amount-based rewards require at least one amount range",
            variant: "destructive",
          });
          return;
        }
      }

      // Update reward ranges with proper IDs
      const updatedRanges = rewardRanges.map((range, index) => ({
        ...range,
        id: range.id || index + 1,
        rewardSystemId: rewardSystem.id,
      }));

      const updatedSystem = {
        ...rewardSystem,
        rewardRanges: updatedRanges,
      };

      if (!shopIdRef.current) {
        toast({
          title: "Error",
          description: "Shop information not loaded",
          variant: "destructive",
        });
        return;
      }

      const saved = await rewardSystemService.saveRewardSystem(
        updatedSystem,
        shopIdRef.current,
      );

      toast({
        title: "Success",
        description: "Reward system updated successfully",
      });

      router.push(
        `/dashboard/reward-system${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
      );
    } catch (error: any) {
      console.error("Failed to save reward system:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to save reward system",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (field: keyof RewardSystemDTO, value: boolean) => {
    if (!rewardSystem?.id || !shopIdRef.current) return;

    try {
      let updatedSystem: RewardSystemDTO;

      switch (field) {
        case "isSystemEnabled":
          updatedSystem = await rewardSystemService.toggleSystemEnabled(
            rewardSystem.id,
            shopIdRef.current,
            value,
          );
          break;
        case "isReviewPointsEnabled":
          updatedSystem = await rewardSystemService.toggleReviewPoints(
            rewardSystem.id,
            shopIdRef.current,
            value,
            rewardSystem.reviewPointsAmount,
          );
          break;
        case "isPurchasePointsEnabled":
          updatedSystem = await rewardSystemService.togglePurchasePoints(
            rewardSystem.id,
            shopIdRef.current,
            value,
          );
          break;
        case "isQuantityBasedEnabled":
          updatedSystem = await rewardSystemService.toggleQuantityBased(
            rewardSystem.id,
            shopIdRef.current,
            value,
          );
          break;
        case "isAmountBasedEnabled":
          updatedSystem = await rewardSystemService.toggleAmountBased(
            rewardSystem.id,
            shopIdRef.current,
            value,
          );
          break;
        case "isPercentageBasedEnabled":
          updatedSystem = await rewardSystemService.togglePercentageBased(
            rewardSystem.id,
            shopIdRef.current,
            value,
            rewardSystem.percentageRate,
          );
          break;
        default:
          return;
      }

      setRewardSystem(updatedSystem);
      toast({
        title: "Success",
        description: `${field} ${value ? "enabled" : "disabled"} successfully`,
      });
    } catch (error: any) {
      console.error(`Failed to toggle ${field}:`, error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || `Failed to toggle ${field}`,
        variant: "destructive",
      });
    }
  };

  const handleActivate = async () => {
    if (!rewardSystem?.id || !shopIdRef.current) return;

    try {
      const updatedSystem = await rewardSystemService.activateRewardSystem(
        rewardSystem.id,
        shopIdRef.current,
      );
      setRewardSystem(updatedSystem);
      toast({
        title: "Success",
        description: "Reward system activated successfully",
      });
    } catch (error: any) {
      console.error("Failed to activate reward system:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to activate reward system",
        variant: "destructive",
      });
    }
  };

  const addRewardRange = () => {
    const newRange: RewardRangeDTO = {
      id: Date.now(), // Temporary ID
      rewardSystemId: rewardSystem?.id,
      rangeType: "QUANTITY",
      minValue: 0,
      maxValue: 0,
      points: 0,
      description: "",
    };
    setRewardRanges([...rewardRanges, newRange]);
  };

  const updateRewardRange = (
    index: number,
    field: keyof RewardRangeDTO,
    value: any,
  ) => {
    const updatedRanges = [...rewardRanges];
    updatedRanges[index] = { ...updatedRanges[index], [field]: value };
    setRewardRanges(updatedRanges);
  };

  const removeRewardRange = (index: number) => {
    setRewardRanges(rewardRanges.filter((_, i) => i !== index));
  };

  if (shopLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {shopLoading
              ? "Loading shop information..."
              : "Loading reward system..."}
          </p>
        </div>
      </div>
    );
  }

  if (!shopIdRef.current) {
    return (
      <div className="text-center py-8">
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
    );
  }

  if (!rewardSystem) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Reward system not found</p>
        <Button
          onClick={() => router.push("/dashboard/reward-system")}
          className="mt-4"
        >
          Back to Reward Systems
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/reward-system")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Edit Reward System
            </h1>
            <p className="text-muted-foreground">
              Configure reward system settings and reward ranges
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={rewardSystem.isActive ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {rewardSystem.isActive ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Active
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Inactive
              </>
            )}
          </Badge>
          <Badge
            variant={rewardSystem.isSystemEnabled ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            {rewardSystem.isSystemEnabled ? (
              <>
                <Power className="h-3 w-3" />
                Enabled
              </>
            ) : (
              <>
                <PowerOff className="h-3 w-3" />
                Disabled
              </>
            )}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Basic Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Configuration</CardTitle>
            <CardDescription>
              Configure the main reward system settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pointValue">point value (RWF)</Label>
                <Input
                  id="pointValue"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={rewardSystem.pointValue}
                  onChange={(e) =>
                    setRewardSystem({
                      ...rewardSystem,
                      pointValue: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={rewardSystem.description || ""}
                  onChange={(e) =>
                    setRewardSystem({
                      ...rewardSystem,
                      description: e.target.value,
                    })
                  }
                  placeholder="Optional description"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Controls */}
        <Card>
          <CardHeader>
            <CardTitle>System Controls</CardTitle>
            <CardDescription>
              Enable or disable the reward system and activate it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="systemEnabled">Enable Reward System</Label>
                <Switch
                  id="systemEnabled"
                  checked={rewardSystem.isSystemEnabled}
                  onCheckedChange={(checked) =>
                    handleToggle("isSystemEnabled", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active System</Label>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      rewardSystem.isActive ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {rewardSystem.isActive ? "Active" : "Inactive"}
                  </span>
                  {!rewardSystem.isActive && (
                    <Button
                      size="sm"
                      onClick={handleActivate}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Points */}
        <Card>
          <CardHeader>
            <CardTitle>Review Points</CardTitle>
            <CardDescription>
              Configure points awarded for product reviews
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="reviewEnabled">Enable Review Points</Label>
                <Switch
                  id="reviewEnabled"
                  checked={rewardSystem.isReviewPointsEnabled}
                  onCheckedChange={(checked) =>
                    handleToggle("isReviewPointsEnabled", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="reviewAmount">Points per Review</Label>
                <Input
                  id="reviewAmount"
                  type="number"
                  min="1"
                  value={rewardSystem.reviewPointsAmount || 0}
                  onChange={(e) =>
                    setRewardSystem({
                      ...rewardSystem,
                      reviewPointsAmount: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="10"
                  disabled={!rewardSystem.isReviewPointsEnabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Points */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Points</CardTitle>
            <CardDescription>
              Configure points awarded for purchases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="purchaseEnabled">Enable Purchase Points</Label>
              <Switch
                id="purchaseEnabled"
                checked={rewardSystem.isPurchasePointsEnabled}
                onCheckedChange={(checked) =>
                  handleToggle("isPurchasePointsEnabled", checked)
                }
              />
            </div>

            {rewardSystem.isPurchasePointsEnabled && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-medium">Purchase Point Methods</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="quantityBased">Quantity Based</Label>
                      <Switch
                        id="quantityBased"
                        checked={rewardSystem.isQuantityBasedEnabled}
                        onCheckedChange={(checked) =>
                          handleToggle("isQuantityBasedEnabled", checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="amountBased">Amount Based</Label>
                      <Switch
                        id="amountBased"
                        checked={rewardSystem.isAmountBasedEnabled}
                        onCheckedChange={(checked) =>
                          handleToggle("isAmountBasedEnabled", checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="percentageBased">Percentage Based</Label>
                      <Switch
                        id="percentageBased"
                        checked={rewardSystem.isPercentageBasedEnabled}
                        onCheckedChange={(checked) =>
                          handleToggle("isPercentageBasedEnabled", checked)
                        }
                      />
                    </div>
                  </div>

                  {rewardSystem.isPercentageBasedEnabled && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="percentageRate">
                        Percentage Rate (%)
                      </Label>
                      <Input
                        id="percentageRate"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        value={rewardSystem.percentageRate || 0}
                        onChange={(e) =>
                          setRewardSystem({
                            ...rewardSystem,
                            percentageRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="5.0"
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Reward Ranges */}
        {(rewardSystem.isQuantityBasedEnabled ||
          rewardSystem.isAmountBasedEnabled) && (
          <Card>
            <CardHeader>
              <CardTitle>Reward Ranges</CardTitle>
              <CardDescription>
                Configure reward ranges for quantity and amount-based rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Configured Ranges</h4>
                <Button
                  onClick={addRewardRange}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Range
                </Button>
              </div>

              {rewardRanges.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No reward ranges configured. Add ranges to enable quantity or
                  amount-based rewards.
                </p>
              ) : (
                <div className="space-y-3">
                  {rewardRanges.map((range, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-md space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <h5 className="font-medium">Range {index + 1}</h5>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeRewardRange(index)}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`rangeType-${index}`}>Type</Label>
                          <select
                            id={`rangeType-${index}`}
                            value={range.rangeType}
                            onChange={(e) =>
                              updateRewardRange(
                                index,
                                "rangeType",
                                e.target.value,
                              )
                            }
                            className="w-full p-2 border rounded-lg"
                          >
                            <option value="QUANTITY">Quantity</option>
                            <option value="AMOUNT">Amount</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`minValue-${index}`}>Min Value</Label>
                          <Input
                            id={`minValue-${index}`}
                            type="number"
                            min="0"
                            value={range.minValue || 0}
                            onChange={(e) =>
                              updateRewardRange(
                                index,
                                "minValue",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            placeholder="0"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`maxValue-${index}`}>Max Value</Label>
                          <Input
                            id={`maxValue-${index}`}
                            type="number"
                            min="0"
                            value={range.maxValue || 0}
                            onChange={(e) =>
                              updateRewardRange(
                                index,
                                "maxValue",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            placeholder="∞"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`points-${index}`}>Points</Label>
                          <Input
                            id={`points-${index}`}
                            type="number"
                            min="1"
                            value={range.points || 0}
                            onChange={(e) =>
                              updateRewardRange(
                                index,
                                "points",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            placeholder="10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`description-${index}`}>
                          Description (Optional)
                        </Label>
                        <Input
                          id={`description-${index}`}
                          value={range.description || ""}
                          onChange={(e) =>
                            updateRewardRange(
                              index,
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder="Range description"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/reward-system")}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
