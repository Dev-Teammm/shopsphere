"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  shippingCostService,
  UpdateShippingCostDTO,
  ShippingCostDTO,
} from "@/lib/services/shipping-cost-service";

const updateShippingCostSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional(),
  distanceKmCost: z.coerce
    .number()
    .min(0, "Distance cost must be non-negative")
    .optional(),
  weightKgCost: z.coerce
    .number()
    .min(0, "Weight cost must be non-negative")
    .optional(),
  baseFee: z.coerce.number().min(0, "Base fee must be non-negative").optional(),
  internationalFee: z.coerce
    .number()
    .min(0, "International fee must be non-negative")
    .optional(),
  freeShippingThreshold: z.coerce
    .number()
    .min(0, "Free shipping threshold must be non-negative")
    .optional(),
  isActive: z.boolean().optional(),
});

type UpdateShippingCostFormData = z.infer<typeof updateShippingCostSchema>;

interface EditShippingCostFormProps {
  shippingCost: ShippingCostDTO;
  shopId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditShippingCostForm({
  shippingCost,
  shopId,
  onSuccess,
  onCancel,
}: EditShippingCostFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateShippingCostFormData>({
    resolver: zodResolver(updateShippingCostSchema) as any,
    defaultValues: {
      name: shippingCost.name,
      description: shippingCost.description || "",
      distanceKmCost: shippingCost.distanceKmCost || undefined,
      weightKgCost: shippingCost.weightKgCost || undefined,
      baseFee: shippingCost.baseFee || undefined,
      internationalFee: shippingCost.internationalFee || undefined,
      freeShippingThreshold: shippingCost.freeShippingThreshold || undefined,
      isActive: shippingCost.isActive,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateShippingCostDTO) =>
      shippingCostService.updateShippingCost(shippingCost.id, data, shopId),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shipping cost updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update shipping cost",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: UpdateShippingCostFormData) => {
    try {
      setIsSubmitting(true);

      // Only include fields that have been changed or are not undefined
      const submitData: UpdateShippingCostDTO = {};

      if (data.name !== shippingCost.name) submitData.name = data.name;
      if (data.description !== (shippingCost.description || ""))
        submitData.description = data.description;
      if (data.distanceKmCost !== shippingCost.distanceKmCost)
        submitData.distanceKmCost = data.distanceKmCost;
      if (data.weightKgCost !== shippingCost.weightKgCost)
        submitData.weightKgCost = data.weightKgCost;
      if (data.baseFee !== shippingCost.baseFee)
        submitData.baseFee = data.baseFee;
      if (data.internationalFee !== shippingCost.internationalFee)
        submitData.internationalFee = data.internationalFee;
      if (data.freeShippingThreshold !== shippingCost.freeShippingThreshold)
        submitData.freeShippingThreshold = data.freeShippingThreshold;
      if (data.isActive !== shippingCost.isActive)
        submitData.isActive = data.isActive;

      await updateMutation.mutateAsync(submitData);
    } catch (error) {
      // Error is handled by the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., US Standard Shipping" {...field} />
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
                  placeholder="Describe this shipping cost configuration..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="baseFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Fee ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="internationalFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>International Fee ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="distanceKmCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Distance Cost ($/km)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="0.0000"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weightKgCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight Cost ($/kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="0.0000"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="freeShippingThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Free Shipping Threshold ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Enable this shipping cost configuration
                </div>
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

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
          >
            {isSubmitting || updateMutation.isPending
              ? "Updating..."
              : "Update"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
