"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface OrderCheckboxProps {
  orderId: number;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function OrderCheckbox({
  orderId,
  checked,
  onCheckedChange,
  disabled,
}: OrderCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="h-4 w-4 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
    />
  );
}
