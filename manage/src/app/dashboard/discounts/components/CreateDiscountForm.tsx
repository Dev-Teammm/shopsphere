"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CreateDiscountDTO } from "@/lib/services/discount-service";

const createDiscountSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name cannot exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  percentage: z
    .number()
    .min(0, "Percentage must be at least 0")
    .max(100, "Percentage cannot exceed 100"),
  discountCode: z
    .string()
    .max(50, "Discount code cannot exceed 50 characters")
    .optional(),
  startDate: z.date().refine((date) => date != null, {
    message: "Start date is required",
  }),
  endDate: z.date().optional(),
  isActive: z.boolean(),
  usageLimit: z.number().min(1, "Usage limit must be at least 1").optional(),
  discountType: z.string(),
});

type CreateDiscountFormData = z.infer<typeof createDiscountSchema>;

interface CreateDiscountFormProps {
  onSubmit: (data: CreateDiscountDTO) => void;
  shopId: string;
}

export function CreateDiscountForm({
  onSubmit,
  shopId,
}: CreateDiscountFormProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("18:00");

  // Debug: Log current date
  console.log("Current date:", new Date());

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateDiscountFormData>({
    resolver: zodResolver(createDiscountSchema),
    defaultValues: {
      isActive: true,
      discountType: "PERCENTAGE",
    },
  });

  const watchedStartDate = watch("startDate");
  const watchedEndDate = watch("endDate");

  const handleFormSubmit = (data: CreateDiscountFormData) => {
    console.log("Form data:", data);
    console.log("Start time:", startTime);
    console.log("End time:", endTime);

    // Combine date and time for start date
    let startDateTime = data.startDate;
    if (startDateTime && startTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      startDateTime = new Date(startDateTime);
      startDateTime.setHours(hours, minutes, 0, 0);
      console.log("Combined start date:", startDateTime);
    }

    // Combine date and time for end date
    let endDateTime = data.endDate;
    if (endDateTime && endTime) {
      const [hours, minutes] = endTime.split(":").map(Number);
      endDateTime = new Date(endDateTime);
      endDateTime.setHours(hours, minutes, 0, 0);
      console.log("Combined end date:", endDateTime);
    }

    const submitData: CreateDiscountDTO = {
      name: data.name,
      description: data.description,
      percentage: data.percentage,
      discountCode: data.discountCode,
      startDate: startDateTime?.toISOString(),
      endDate: endDateTime?.toISOString(),
      isActive: data.isActive,
      usageLimit: data.usageLimit,
      discountType: data.discountType,
      shopId: shopId,
    };

    console.log("Final submit data:", submitData);
    console.log("Start date ISO:", startDateTime?.toISOString());
    console.log("End date ISO:", endDateTime?.toISOString());
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Discount Name *</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Enter discount name"
            className={cn(errors.name && "border-red-500")}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="percentage">Percentage *</Label>
          <Input
            id="percentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...register("percentage", { valueAsNumber: true })}
            placeholder="Enter percentage"
            className={cn(errors.percentage && "border-red-500")}
          />
          {errors.percentage && (
            <p className="text-sm text-red-500">{errors.percentage.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Enter discount description"
          className={cn(errors.description && "border-red-500")}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discountCode">Discount Code</Label>
          <Input
            id="discountCode"
            {...register("discountCode")}
            placeholder="Enter discount code (optional)"
            className={cn(errors.discountCode && "border-red-500")}
          />
          {errors.discountCode && (
            <p className="text-sm text-red-500">
              {errors.discountCode.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="discountType">Discount Type</Label>
          <Select
            value={watch("discountType")}
            onValueChange={(value) => setValue("discountType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select discount type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
              <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Start Date & Time *</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchedStartDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedStartDate
                    ? format(watchedStartDate, "PPP")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={watchedStartDate}
                  onSelect={(date) => {
                    console.log("Selected start date:", date);
                    setStartDate(date);
                    setValue("startDate", date!);
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  defaultMonth={new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full"
            />
          </div>
          {errors.startDate && (
            <p className="text-sm text-red-500">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>End Date & Time (Optional)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchedEndDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedEndDate
                    ? format(watchedEndDate, "PPP")
                    : "Pick a date (optional)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={watchedEndDate}
                  onSelect={(date) => {
                    console.log("Selected end date:", date);
                    setEndDate(date);
                    setValue("endDate", date!);
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return (
                      date < today ||
                      (watchedStartDate && date < watchedStartDate)
                    );
                  }}
                  defaultMonth={new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full"
            />
          </div>
          {errors.endDate && (
            <p className="text-sm text-red-500">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="usageLimit">Usage Limit</Label>
          <Input
            id="usageLimit"
            type="number"
            min="1"
            {...register("usageLimit", { valueAsNumber: true })}
            placeholder="Enter usage limit"
            className={cn(errors.usageLimit && "border-red-500")}
          />
          {errors.usageLimit && (
            <p className="text-sm text-red-500">{errors.usageLimit.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={watch("isActive")}
          onCheckedChange={(checked) => setValue("isActive", checked)}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Discount"}
        </Button>
      </div>
    </form>
  );
}
