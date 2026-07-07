"use client";

import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { rewardSystemService } from "@/lib/services/reward-system-service";
import { RewardSystemDTO } from "@/lib/types/reward-system";
import { Save, Edit3 } from "lucide-react";

interface RewardSystemConfigProps {
  rewardSystem: RewardSystemDTO;
  onUpdate: (updatedSystem: RewardSystemDTO) => void;
  shopId: string;
}

export function RewardSystemConfig({
  rewardSystem,
  onUpdate,
  shopId,
}: RewardSystemConfigProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<RewardSystemDTO>(rewardSystem);
  const { toast } = useToast();

  const handleToggle = async (field: keyof RewardSystemDTO, value: boolean) => {
    if (!rewardSystem.id) return;

    try {
      setLoading(true);
      let updatedSystem: RewardSystemDTO;

      switch (field) {
        case "isSystemEnabled":
          updatedSystem = await rewardSystemService.toggleSystemEnabled(
            rewardSystem.id,
            shopId,
            value,
          );
          break;
        case "isReviewPointsEnabled":
          updatedSystem = await rewardSystemService.toggleReviewPoints(
            rewardSystem.id,
            shopId,
            value,
            config.reviewPointsAmount,
          );
          break;
        case "isPurchasePointsEnabled":
          updatedSystem = await rewardSystemService.togglePurchasePoints(
            rewardSystem.id,
            shopId,
            value,
          );
          break;
        case "isQuantityBasedEnabled":
          updatedSystem = await rewardSystemService.toggleQuantityBased(
            rewardSystem.id,
            shopId,
            value,
          );
          break;
        case "isAmountBasedEnabled":
          updatedSystem = await rewardSystemService.toggleAmountBased(
            rewardSystem.id,
            shopId,
            value,
          );
          break;
        case "isPercentageBasedEnabled":
          updatedSystem = await rewardSystemService.togglePercentageBased(
            rewardSystem.id,
            shopId,
            value,
            config.percentageRate,
          );
          break;
        default:
          return;
      }

      setConfig(updatedSystem);
      onUpdate(updatedSystem);
      toast({
        title: "Success",
        description: `${field} ${value ? "enabled" : "disabled"} successfully`,
      });
    } catch (error: any) {
      console.error(`Failed to toggle ${String(field)}:`, error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || `Failed to toggle ${field}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const updatedSystem = await rewardSystemService.saveRewardSystem(
        config,
        shopId,
      );
      setConfig(updatedSystem);
      onUpdate(updatedSystem);
      toast({
        title: "Success",
        description: "Reward system configuration saved successfully",
      });
    } catch (error: any) {
      console.error("Failed to save configuration:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!rewardSystem.id) return;

    try {
      setLoading(true);
      const updatedSystem = await rewardSystemService.activateRewardSystem(
        rewardSystem.id,
        shopId,
      );
      setConfig(updatedSystem);
      onUpdate(updatedSystem);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>
            Configure the main reward system settings and enable/disable
            features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="pointValue">point value (RWF)</Label>
                <Input
                  id="pointValue"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={config.pointValue}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pointValue: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.01"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={config.description || ""}
                  onChange={(e) =>
                    setConfig({ ...config, description: e.target.value })
                  }
                  placeholder="Optional description"
                  className="w-64"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="systemEnabled">Enable Reward System</Label>
                <Switch
                  id="systemEnabled"
                  checked={config.isSystemEnabled}
                  onCheckedChange={(checked) =>
                    handleToggle("isSystemEnabled", checked)
                  }
                  disabled={loading}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active System</Label>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      config.isActive ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {config.isActive ? "Active" : "Inactive"}
                  </span>
                  {!config.isActive && (
                    <Button
                      size="sm"
                      onClick={handleActivate}
                      disabled={loading}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review Points</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="reviewEnabled">Enable Review Points</Label>
                <Switch
                  id="reviewEnabled"
                  checked={config.isReviewPointsEnabled}
                  onCheckedChange={(checked) =>
                    handleToggle("isReviewPointsEnabled", checked)
                  }
                  disabled={loading}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="reviewAmount">Points per Review</Label>
                <Input
                  id="reviewAmount"
                  type="number"
                  min="1"
                  value={config.reviewPointsAmount}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      reviewPointsAmount: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="10"
                  disabled={!config.isReviewPointsEnabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Purchase Points</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="purchaseEnabled">Enable Purchase Points</Label>
                <Switch
                  id="purchaseEnabled"
                  checked={config.isPurchasePointsEnabled}
                  onCheckedChange={(checked) =>
                    handleToggle("isPurchasePointsEnabled", checked)
                  }
                  disabled={loading}
                />
              </div>
            </div>

            {config.isPurchasePointsEnabled && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="quantityBased">Quantity Based</Label>
                    <Switch
                      id="quantityBased"
                      checked={config.isQuantityBasedEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle("isQuantityBasedEnabled", checked)
                      }
                      disabled={loading}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amountBased">Amount Based</Label>
                    <Switch
                      id="amountBased"
                      checked={config.isAmountBasedEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle("isAmountBasedEnabled", checked)
                      }
                      disabled={loading}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="percentageBased">Percentage Based</Label>
                    <Switch
                      id="percentageBased"
                      checked={config.isPercentageBasedEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle("isPercentageBasedEnabled", checked)
                      }
                      disabled={loading}
                    />
                  </div>
                </div>

                {config.isPercentageBasedEnabled && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="percentageRate">Percentage Rate (%)</Label>
                    <Input
                      id="percentageRate"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="100"
                      value={config.percentageRate || 0}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          percentageRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="5.0"
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
