"use client";

import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { deliveryNotesService, DeliveryNoteDTO } from "@/lib/services/delivery-notes-service";
import { toast } from "sonner";

interface EditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: DeliveryNoteDTO;
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

export default function EditNoteDialog({
  open,
  onOpenChange,
  note,
  onSuccess,
}: EditNoteDialogProps) {
  const [noteText, setNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && note) {
      setNoteText(note.noteText);
      setNoteCategory(note.noteCategory || "");
    }
  }, [open, note]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!noteText.trim()) {
      toast.error("Please enter note text");
      return;
    }

    setSaving(true);
    try {
      await deliveryNotesService.updateNote(
        note.noteId,
        {
          noteText: noteText.trim(),
          noteCategory: noteCategory || undefined,
        }
      );
      toast.success("Note updated successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Error updating note:", error);
      toast.error(error.response?.data?.message || "Failed to update note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
          <DialogDescription>
            Update the note text and category
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="noteText">
              Note Text <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="noteText"
              placeholder="Enter your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={6}
              maxLength={2000}
              required
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
