"use client";

import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { rewardSystemService } from "@/lib/services/reward-system-service";
import { RewardSystemDTO } from "@/lib/types/reward-system";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  Edit3,
  Power,
  PowerOff,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function RewardSystemPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const shopSlug = searchParams.get("shopSlug");
  const shopIdRef = useRef<string | null>(null);

  const [rewardSystems, setRewardSystems] = useState<RewardSystemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopLoading, setShopLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize] = useState(10);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [editingSystem, setEditingSystem] = useState<RewardSystemDTO | null>(
    null,
  );

  // Fetch shopId from shopSlug
  useEffect(() => {
    const fetchShopId = async () => {
      if (!shopSlug) {
        toast({
          title: "Error",
          description: "Shop slug is required",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      try {
        setShopLoading(true);
        const shop = await shopService.getShopBySlug(shopSlug);
        shopIdRef.current = shop.shopId;
        // Store in sessionStorage for safety
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
        router.push("/dashboard");
      } finally {
        setShopLoading(false);
      }
    };

    fetchShopId();
  }, [shopSlug, router, toast]);

  useEffect(() => {
    if (shopIdRef.current && !shopLoading) {
      loadRewardSystems();
    }
  }, [currentPage, shopLoading]);

  const loadRewardSystems = async () => {
    if (!shopIdRef.current) {
      return; // Wait for shopId to be loaded
    }

    try {
      setLoading(true);
      const data = await rewardSystemService.getAllRewardSystems(
        shopIdRef.current,
        currentPage,
        pageSize,
        "id",
        "desc",
      );
      setRewardSystems(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error("Failed to load reward systems:", error);
      toast({
        title: "Error",
        description: "Failed to load reward systems",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSystemUpdate = (updatedSystem: RewardSystemDTO) => {
    setRewardSystems((prev) =>
      prev.map((sys) => (sys.id === updatedSystem.id ? updatedSystem : sys)),
    );
    setEditingSystem(null);
    toast({
      title: "Success",
      description: "Reward system updated successfully",
    });
  };

  const handleCreateNew = () => {
    if (shopSlug) {
      router.push(`/dashboard/reward-system/create?shopSlug=${shopSlug}`);
    } else {
      router.push("/dashboard/reward-system/create");
    }
  };

  const handleEdit = (system: RewardSystemDTO) => {
    setEditingSystem(system);
  };

  const handleCancelEdit = () => {
    setEditingSystem(null);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const toggleCardExpansion = (systemId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(systemId)) {
      newExpanded.delete(systemId);
    } else {
      newExpanded.add(systemId);
    }
    setExpandedCards(newExpanded);
  };

  const handleActivateSystem = async (systemId: number) => {
    if (!shopIdRef.current) return;

    try {
      const updatedSystem = await rewardSystemService.activateRewardSystem(
        systemId,
        shopIdRef.current,
      );
      setRewardSystems((prev) =>
        prev.map((sys) => ({
          ...sys,
          isActive: sys.id === systemId,
        })),
      );
      toast({
        title: "Success",
        description: "Reward system activated successfully",
      });
    } catch (error) {
      console.error("Failed to activate system:", error);
      toast({
        title: "Error",
        description: "Failed to activate reward system",
        variant: "destructive",
      });
    }
  };

  const handleToggleSystemEnabled = async (
    systemId: number,
    enabled: boolean,
  ) => {
    if (!shopIdRef.current) return;

    try {
      const updatedSystem = await rewardSystemService.toggleSystemEnabled(
        systemId,
        shopIdRef.current,
        enabled,
      );
      setRewardSystems((prev) =>
        prev.map((sys) => (sys.id === systemId ? updatedSystem : sys)),
      );
      toast({
        title: "Success",
        description: `System ${enabled ? "enabled" : "disabled"} successfully`,
      });
    } catch (error) {
      console.error("Failed to toggle system:", error);
      toast({
        title: "Error",
        description: "Failed to toggle system status",
        variant: "destructive",
      });
    }
  };

  if (shopLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {shopLoading
              ? "Loading shop information..."
              : "Loading reward systems..."}
          </p>
        </div>
      </div>
    );
  }

  if (!shopIdRef.current) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Shop not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reward Systems</h1>
          <p className="text-muted-foreground">
            Manage your reward system configurations and user points
          </p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New System
        </Button>
      </div>

      {rewardSystems.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Reward Systems Found</CardTitle>
            <CardDescription>
              You need to create a reward system configuration first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateNew} className="w-full sm:w-auto">
              Create Reward System
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {rewardSystems.map((system) => (
              <Card
                key={system.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleCardExpansion(system.id!)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                        {expandedCards.has(system.id!) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <CardTitle className="text-lg">
                        Reward System #{system.id}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge
                          variant={system.isActive ? "default" : "secondary"}
                          className="flex items-center gap-1"
                        >
                          {system.isActive ? (
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
                          variant={
                            system.isSystemEnabled ? "default" : "destructive"
                          }
                          className="flex items-center gap-1"
                        >
                          {system.isSystemEnabled ? (
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
                    <div className="flex items-center gap-2">
                      {!system.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivateSystem(system.id!);
                          }}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Activate
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(system);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Point Value: {system.pointValue}RWF | Review Points:{" "}
                    {system.isReviewPointsEnabled
                      ? `${system.reviewPointsAmount} pts`
                      : "Disabled"}
                  </CardDescription>
                </CardHeader>

                {expandedCards.has(system.id!) && (
                  <CardContent className="pt-0">
                    <div className="space-y-6">
                      {/* System Status Controls */}
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
                        <div>
                          <h4 className="font-medium">System Controls</h4>
                          <p className="text-sm text-muted-foreground">
                            Enable or disable this reward system
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={
                              system.isSystemEnabled ? "destructive" : "default"
                            }
                            size="sm"
                            onClick={() =>
                              handleToggleSystemEnabled(
                                system.id!,
                                !system.isSystemEnabled,
                              )
                            }
                            className="flex items-center gap-2"
                          >
                            {system.isSystemEnabled ? (
                              <>
                                <PowerOff className="h-4 w-4" />
                                Disable
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4" />
                                Enable
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Configuration Details */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <h4 className="font-medium">Basic Configuration</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Point Value:
                              </span>
                              <span className="font-medium">
                                ${system.pointValue}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Description:
                              </span>
                              <span className="font-medium">
                                {system.description || "No description"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium">Reward Features</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Review Points:
                              </span>
                              <Badge
                                variant={
                                  system.isReviewPointsEnabled
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {system.isReviewPointsEnabled
                                  ? `${system.reviewPointsAmount} pts`
                                  : "Disabled"}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Purchase Points:
                              </span>
                              <Badge
                                variant={
                                  system.isPurchasePointsEnabled
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {system.isPurchasePointsEnabled
                                  ? "Enabled"
                                  : "Disabled"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Purchase Points Configuration */}
                      {system.isPurchasePointsEnabled && (
                        <div className="space-y-4">
                          <h4 className="font-medium">
                            Purchase Points Configuration
                          </h4>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="p-3 border rounded-md">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">
                                  Quantity-Based
                                </span>
                                <Badge
                                  variant={
                                    system.isQuantityBasedEnabled
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {system.isQuantityBasedEnabled
                                    ? "Enabled"
                                    : "Disabled"}
                                </Badge>
                              </div>
                              {system.isQuantityBasedEnabled &&
                                system.rewardRanges && (
                                  <div className="text-xs text-muted-foreground">
                                    {system.rewardRanges
                                      .filter(
                                        (range) =>
                                          range.rangeType === "QUANTITY",
                                      )
                                      .map((range, idx) => (
                                        <div key={idx}>
                                          {range.minValue} -{" "}
                                          {range.maxValue || "∞"}:{" "}
                                          {range.points} pts
                                        </div>
                                      ))}
                                  </div>
                                )}
                            </div>

                            <div className="p-3 border rounded-md">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">
                                  Amount-Based
                                </span>
                                <Badge
                                  variant={
                                    system.isAmountBasedEnabled
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {system.isAmountBasedEnabled
                                    ? "Enabled"
                                    : "Disabled"}
                                </Badge>
                              </div>
                              {system.isAmountBasedEnabled &&
                                system.rewardRanges && (
                                  <div className="text-xs text-muted-foreground">
                                    {system.rewardRanges
                                      .filter(
                                        (range) => range.rangeType === "AMOUNT",
                                      )
                                      .map((range, idx) => (
                                        <div key={idx}>
                                          ${range.minValue} - $
                                          {range.maxValue || "∞"}:{" "}
                                          {range.points} pts
                                        </div>
                                      ))}
                                  </div>
                                )}
                            </div>

                            <div className="p-3 border rounded-md">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">
                                  Percentage-Based
                                </span>
                                <Badge
                                  variant={
                                    system.isPercentageBasedEnabled
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {system.isPercentageBasedEnabled
                                    ? "Enabled"
                                    : "Disabled"}
                                </Badge>
                              </div>
                              {system.isPercentageBasedEnabled &&
                                system.percentageRate && (
                                  <div className="text-xs text-muted-foreground">
                                    Rate: {system.percentageRate}%
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() =>
                            router.push(
                              `/dashboard/reward-system/edit/${system.id}${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
                            )
                          }
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Full Configuration
                        </Button>
                        <Button
                          onClick={() =>
                            router.push(
                              `/dashboard/reward-system/edit/${system.id}${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
                            )
                          }
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit System
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {currentPage * pageSize + 1} to{" "}
                {Math.min((currentPage + 1) * pageSize, totalElements)} of{" "}
                {totalElements} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
