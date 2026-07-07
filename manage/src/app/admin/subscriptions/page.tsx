"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  subscriptionService,
  SubscriptionPlan,
  CreateSubscriptionPlanRequest,
} from "@/lib/services/subscription-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Edit, Trash, Check, X, Shield, Package, Users, Truck } from "lucide-react";
import { SubscriptionPlanDialog } from "@/components/admin/subscription-plan-dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Fetch plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => subscriptionService.getAllPlans(false),
  });

  // Fetch system status
  const { data: isSystemEnabled } = useQuery({
    queryKey: ["subscription-system-status"],
    queryFn: subscriptionService.isSystemEnabled,
  });

  // Fetch shop registration status
  const { data: isShopRegistrationEnabled } = useQuery({
    queryKey: ["shop-registration-status"],
    queryFn: subscriptionService.isShopRegistrationEnabled,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: subscriptionService.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Plan created successfully");
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Failed to create plan"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: CreateSubscriptionPlanRequest;
    }) => subscriptionService.updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Plan updated successfully");
      setIsDialogOpen(false);
      setEditingPlan(null);
    },
    onError: () => toast.error("Failed to update plan"),
  });

  const deleteMutation = useMutation({
    mutationFn: subscriptionService.deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Plan deleted successfully");
    },
    onError: () => toast.error("Failed to delete plan"),
  });

  const toggleSystemMutation = useMutation({
    mutationFn: subscriptionService.setSystemEnabled,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subscription-system-status"],
      });
      toast.success("System status updated");
    },
  });

  const toggleShopRegistrationMutation = useMutation({
    mutationFn: subscriptionService.setShopRegistrationEnabled,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shop-registration-status"],
      });
      toast.success("Shop registration status updated");
    },
    onError: () => {
      toast.error("Failed to update shop registration status");
    },
  });

  const handleCreate = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this plan?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormSubmit = async (data: CreateSubscriptionPlanRequest) => {
    if (editingPlan) {
      await updateMutation.mutateAsync({ id: editingPlan.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Subscription Management
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
            <Label htmlFor="system-toggle" className="text-sm font-medium">
              Subscription System
            </Label>
            <Switch
              id="system-toggle"
              checked={isSystemEnabled}
              onCheckedChange={(checked) => toggleSystemMutation.mutate(checked)}
            />
          </div>
          <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
            <Label htmlFor="shop-registration-toggle" className="text-sm font-medium">
              Shop Registration
            </Label>
            <Switch
              id="shop-registration-toggle"
              checked={isShopRegistrationEnabled}
              onCheckedChange={(checked) => toggleShopRegistrationMutation.mutate(checked)}
            />
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Plan
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading plans...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {plans?.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {plan.currency} {plan.price} / {plan.durationInDays} days
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {plan.isFreemium && <Badge variant="secondary">Freemium</Badge>}
                    {plan.isActive ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-muted-foreground min-h-[40px]">
                  {plan.description || "No description provided."}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 opacity-70" />
                    <span>
                      Products:{" "}
                      {plan.maxProducts === -1
                        ? "Unlimited"
                        : plan.maxProducts}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 opacity-70" />
                    <span>
                      Warehouses:{" "}
                      {plan.maxWarehouses === -1
                        ? "Unlimited"
                        : plan.maxWarehouses}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 opacity-70" />
                    <span>
                      Employees:{" "}
                      {plan.maxEmployees === -1
                        ? "Unlimited"
                        : plan.maxEmployees}
                    </span>
                  </div>
                   <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 opacity-70" />
                    <span>
                      Delivery Agents:{" "}
                      {plan.maxDeliveryAgents === -1
                        ? "Unlimited"
                        : plan.maxDeliveryAgents}
                    </span>
                  </div>
                </div>

                {plan.capability && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Capability:</p>
                    <Badge variant="outline" className="text-xs">
                      {plan.capability.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}
                
                <div className="pt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(plan)}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(plan.id)}
                  >
                    <Trash className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {plans?.length === 0 && (
            <div className="col-span-full text-center p-12 text-muted-foreground">
              No subscription plans found. Create one to get started.
            </div>
          )}
        </div>
      )}

      <SubscriptionPlanDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        plan={editingPlan}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
