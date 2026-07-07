"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { deliveryNotesService } from "@/lib/services/delivery-notes-service";
import { toast } from "sonner";

interface AddOrderNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number;
  orderNumber: string;
  onSuccess: () => void;
}

const NOTE_CATEGORIES = [
  { value: "TRAFFIC_DELAY", label: "Traffic Delay" },
  { value: "CUSTOMER_UNAVAILABLE", label: "Customer Unavailable" },
  { value: "ADDRESS_ISSUE", label: "Address Issue" },
  { value: "DELIVERY_INSTRUCTION", label: "Delivery Instruction" },
  { value: "WEATHER_CONDITION", label: "Weather Condition" },
  { value: "VEHICLE_ISSUE", label: "Vehicle Issue" },
  { value: "SUCCESSFUL_DELIVERY", label: "Successful Delivery" },
  { value: "FAILED_DELIVERY", label: "Failed Delivery" },
  { value: "GENERAL", label: "General" },
  { value: "OTHER", label: "Other" },
];

export default function AddOrderNoteDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  onSuccess,
}: AddOrderNoteDialogProps) {
  const [noteText, setNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!noteText.trim()) {
      toast.error("Please enter note text");
      return;
    }

    setSaving(true);
    try {
      await deliveryNotesService.createNote({
        noteText: noteText.trim(),
        noteType: "ORDER_SPECIFIC",
        noteCategory: noteCategory || undefined,
        orderId: orderId,
      });
      toast.success("Note created successfully");
      setNoteText("");
      setNoteCategory("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating note:", error);
      toast.error(error.response?.data?.message || "Failed to create note");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setNoteText("");
      setNoteCategory("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Order Note
          </DialogTitle>
          <DialogDescription>
            Create a note for Order #{orderNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="noteText">
              Note Text <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="noteText"
              placeholder="e.g., Customer requested delivery at back entrance, gate code is 1234"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={6}
              maxLength={2000}
              required
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {noteText.length}/2000 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="noteCategory">Category (Optional)</Label>
            <Select value={noteCategory} onValueChange={setNoteCategory}>
              <SelectTrigger id="noteCategory">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {NOTE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Categorize your note for better organization
            </p>
          </div>

          <div className="rounded-md bg-muted p-4 space-y-2">
            <h4 className="text-sm font-medium">Quick Examples:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• "Customer requested delivery at back entrance"</li>
              <li>• "Customer unavailable, will attempt redelivery tomorrow"</li>
              <li>• "Incorrect address, contacted customer for clarification"</li>
              <li>• "Package delivered to neighbor at customer's request"</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Note
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
