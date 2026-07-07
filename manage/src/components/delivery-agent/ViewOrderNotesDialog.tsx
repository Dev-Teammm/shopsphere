"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Loader2,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User as UserIcon,
} from "lucide-react";
import { deliveryNotesService, DeliveryNoteDTO } from "@/lib/services/delivery-notes-service";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import EditNoteDialog from "./EditNoteDialog";

interface ViewOrderNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number;
  orderNumber: string;
}

export default function ViewOrderNotesDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
}: ViewOrderNotesDialogProps) {
  const [notes, setNotes] = useState<DeliveryNoteDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<DeliveryNoteDTO | null>(null);

  const pageSize = 10;

  useEffect(() => {
    if (open) {
      fetchNotes(0);
    }
  }, [open, orderId]);

  const fetchNotes = async (page: number) => {
    setLoading(true);
    try {
      const response = await deliveryNotesService.getNotesForOrder(
        orderId,
        page,
        pageSize
      );
      setNotes(response.data);
      setCurrentPage(response.currentPage);
      setTotalPages(response.totalPages);
      setTotalItems(response.totalItems);
    } catch (error: any) {
      console.error("Error fetching notes:", error);
      toast.error(error.response?.data?.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!noteToDelete) return;

    setDeleting(true);
    try {
      await deliveryNotesService.deleteNote(noteToDelete);
      toast.success("Note deleted successfully");
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
      // Refresh notes
      fetchNotes(currentPage);
    } catch (error: any) {
      console.error("Error deleting note:", error);
      toast.error(error.response?.data?.message || "Failed to delete note");
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setNoteToEdit(null);
    fetchNotes(currentPage);
  };

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;

    const categoryColors: Record<string, string> = {
      TRAFFIC_DELAY: "bg-orange-100 text-orange-800 border-orange-200",
      CUSTOMER_UNAVAILABLE: "bg-yellow-100 text-yellow-800 border-yellow-200",
      ADDRESS_ISSUE: "bg-red-100 text-red-800 border-red-200",
      DELIVERY_INSTRUCTION: "bg-green-100 text-green-800 border-green-200",
      WEATHER_CONDITION: "bg-cyan-100 text-cyan-800 border-cyan-200",
      VEHICLE_ISSUE: "bg-purple-100 text-purple-800 border-purple-200",
      SUCCESSFUL_DELIVERY: "bg-green-100 text-green-800 border-green-200",
      FAILED_DELIVERY: "bg-red-100 text-red-800 border-red-200",
      GENERAL: "bg-gray-100 text-gray-800 border-gray-200",
      OTHER: "bg-slate-100 text-slate-800 border-slate-200",
    };

    const categoryLabels: Record<string, string> = {
      TRAFFIC_DELAY: "Traffic Delay",
      CUSTOMER_UNAVAILABLE: "Customer Unavailable",
      ADDRESS_ISSUE: "Address Issue",
      DELIVERY_INSTRUCTION: "Delivery Instruction",
      WEATHER_CONDITION: "Weather Condition",
      VEHICLE_ISSUE: "Vehicle Issue",
      SUCCESSFUL_DELIVERY: "Successful Delivery",
      FAILED_DELIVERY: "Failed Delivery",
      GENERAL: "General",
      OTHER: "Other",
    };

    return (
      <Badge variant="outline" className={categoryColors[category] || ""}>
        {categoryLabels[category] || category}
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Order Notes - #{orderNumber}
            </DialogTitle>
            <DialogDescription>
              View and manage notes for this order
            </DialogDescription>
          </DialogHeader>

          {loading && notes.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Notes Yet</h3>
              <p className="text-muted-foreground max-w-md">
                No delivery notes have been created for this order yet. Click "Add Note" to create one.
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[50vh] pr-4">
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.noteId}
                      className="rounded-md border p-4 space-y-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getCategoryBadge(note.noteCategory)}
                          </div>
                          <p className="text-sm leading-relaxed">{note.noteText}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setNoteToEdit(note);
                              setEditDialogOpen(true);
                            }}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setNoteToDelete(note.noteId);
                              setDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {note.agentName}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                        {note.updatedAt !== note.createdAt && (
                          <span className="text-xs italic">Edited</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {currentPage * pageSize + 1} to{" "}
                    {Math.min((currentPage + 1) * pageSize, totalItems)} of {totalItems} notes
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchNotes(currentPage - 1)}
                      disabled={currentPage === 0 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {currentPage + 1} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchNotes(currentPage + 1)}
                      disabled={currentPage >= totalPages - 1 || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Note Dialog */}
      {noteToEdit && (
        <EditNoteDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          note={noteToEdit}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
