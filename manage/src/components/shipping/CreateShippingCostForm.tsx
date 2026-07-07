"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CreateShippingCostDTO,
} from "@/lib/services/shipping-cost-service";

const createShippingCostSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters"),
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
  isActive: z.boolean().default(true),
});

type CreateShippingCostFormData = z.infer<typeof createShippingCostSchema>;

interface CreateShippingCostFormProps {
  shopId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateShippingCostForm({
  shopId,
  onSuccess,
  onCancel,
}: CreateShippingCostFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateShippingCostFormData>({
    resolver: zodResolver(createShippingCostSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      distanceKmCost: undefined,
      weightKgCost: undefined,
      baseFee: undefined,
      internationalFee: undefined,
      freeShippingThreshold: undefined,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateShippingCostDTO) =>
      shippingCostService.createShippingCost(data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shipping cost created successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to create shipping cost",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CreateShippingCostFormData) => {
    try {
      setIsSubmitting(true);

      const submitData: CreateShippingCostDTO = {
        name: data.name,
        description: data.description || undefined,
        distanceKmCost: data.distanceKmCost || undefined,
        weightKgCost: data.weightKgCost || undefined,
        baseFee: data.baseFee || undefined,
        internationalFee: data.internationalFee || undefined,
        freeShippingThreshold: data.freeShippingThreshold || undefined,
        isActive: data.isActive,
        shopId,
      };

      await createMutation.mutateAsync(submitData);
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
            disabled={isSubmitting || createMutation.isPending}
          >
            {isSubmitting || createMutation.isPending
              ? "Creating..."
              : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
