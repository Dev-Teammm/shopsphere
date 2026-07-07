// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CURRENCY_CODE } from "@/lib/constants/currency";
import {
  CreateSubscriptionPlanRequest,
  SubscriptionPlan,
  ShopCapability,
} from "@/lib/services/subscription-service";

type PlanFormData = {
  name: string;
  description?: string;
  price: number;
  currency: string;
  durationInDays: number;
  isActive: boolean;
  isFreemium: boolean;
  maxProducts: number;
  maxWarehouses: number;
  maxEmployees: number;
  maxDeliveryAgents: number;
  capability:
    | "VISUALIZATION_ONLY"
    | "PICKUP_ORDERS"
    | "FULL_ECOMMERCE"
    | "HYBRID";
};

const planSchema: z.ZodType<PlanFormData> = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  currency: z.string().min(3, "Currency must be 3 characters").max(3),
  durationInDays: z.coerce.number().min(1, "Duration must be at least 1 day"),
  isActive: z.boolean().default(true),
  isFreemium: z.boolean().default(false),
  maxProducts: z.coerce.number().min(-1, "Use -1 for unlimited"),
  maxWarehouses: z.coerce.number().min(-1),
  maxEmployees: z.coerce.number().min(-1),
  maxDeliveryAgents: z.coerce.number().min(-1),
  capability: z.enum([
    "VISUALIZATION_ONLY",
    "PICKUP_ORDERS",
    "FULL_ECOMMERCE",
    "HYBRID",
  ]),
}) as any;

interface SubscriptionPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: SubscriptionPlan | null;
  onSubmit: (data: CreateSubscriptionPlanRequest) => Promise<void>;
}

const CAPABILITY_DESCRIPTIONS: Record<ShopCapability, string> = {
  VISUALIZATION_ONLY: "Only display products. No orders, delivery, or returns.",
  PICKUP_ORDERS:
    "Display products and accept pickup orders. Customers pick up at shop. Returns handled at shop (no delivery agent).",
  FULL_ECOMMERCE:
    "Full e-commerce: products, orders, delivery with agents, and returns with agents.",
  HYBRID:
    "Both pickup orders and full e-commerce capabilities (pickup + delivery).",
};

export function SubscriptionPlanDialog({
  open,
  onOpenChange,
  plan,
  onSubmit,
}: SubscriptionPlanDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PlanFormData>({
    // @ts-expect-error - zodResolver type incompatibility with z.coerce.number()
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      currency: CURRENCY_CODE,
      durationInDays: 30,
      isActive: true,
      isFreemium: false,
      maxProducts: 100,
      maxWarehouses: 1,
      maxEmployees: 5,
      maxDeliveryAgents: 2,
      capability: "VISUALIZATION_ONLY" as ShopCapability,
    },
  });

  // Reset form when plan changes
  useEffect(() => {
    if (plan) {
      form.reset({
        name: plan.name || "",
        description: plan.description || "",
        price: plan.price || 0,
        currency: plan.currency || "RWF",
        durationInDays: plan.durationInDays || 30,
        isActive: plan.isActive ?? true,
        isFreemium: plan.isFreemium ?? false,
        maxProducts: plan.maxProducts || 100,
        maxWarehouses: plan.maxWarehouses || 1,
        maxEmployees: plan.maxEmployees || 5,
        maxDeliveryAgents: plan.maxDeliveryAgents || 2,
        capability: plan.capability || "VISUALIZATION_ONLY",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        price: 0,
        currency: CURRENCY_CODE,
        durationInDays: 30,
        isActive: true,
        isFreemium: false,
        maxProducts: 100,
        maxWarehouses: 1,
        maxEmployees: 5,
        maxDeliveryAgents: 2,
        capability: "VISUALIZATION_ONLY" as ShopCapability,
      });
    }
  }, [plan, form]);

  const handleSubmit = async (values: PlanFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit({
        name: values.name,
        description: values.description || "",
        price: values.price,
        currency: values.currency,
        durationInDays: values.durationInDays,
        isActive: values.isActive,
        isFreemium: values.isFreemium,
        maxProducts: values.maxProducts,
        maxWarehouses: values.maxWarehouses,
        maxEmployees: values.maxEmployees,
        maxDeliveryAgents: values.maxDeliveryAgents,
        featuresJson: "{}", // Placeholder for now
        capability: values.capability as ShopCapability,
      });
      onOpenChange(false);
      if (!plan) {
        form.reset();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {plan ? "Edit Subscription Plan" : "Create Subscription Plan"}
          </DialogTitle>
          <DialogDescription>
            Configure the details and limits for this subscription plan.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit as any)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Pro Plan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="RWF" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the plan features..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationInDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Days)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Is this plan available for purchase?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isFreemium"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Freemium</FormLabel>
                      <FormDescription>Is this a free tier?</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">
                Resource Limits (-1 for unlimited)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxProducts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Products</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxWarehouses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Warehouses</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxEmployees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Employees</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxDeliveryAgents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Delivery Agents</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="capability"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <div>
                    <FormLabel>Shop Capability</FormLabel>
                    <FormDescription>
                      Select the capability this plan is designed for. Plans are
                      categorized by capability.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-3"
                    >
                      {(
                        Object.keys(CAPABILITY_DESCRIPTIONS) as ShopCapability[]
                      ).map((capability) => (
                        <div
                          key={capability}
                          className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                        >
                          <RadioGroupItem
                            value={capability}
                            id={capability}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <Label
                              htmlFor={capability}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {capability.replace(/_/g, " ")}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {CAPABILITY_DESCRIPTIONS[capability]}
                            </p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
