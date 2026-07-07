"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Users,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  Search,
  Package,
  Truck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  deliveryGroupService,
  DeliveryGroupDto,
  BulkAddResult,
} from "@/lib/services/delivery-group-service";
import { CreateGroupModal } from "./CreateGroupModal";
import { toast } from "sonner";

interface DeliveryGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrderIds: number[];
  onSuccess: () => void;
  currentGroup?: DeliveryGroupDto | null; // Existing group if order is already assigned
  shopId: string;
}

export function DeliveryGroupDialog({
  open,
  onOpenChange,
  selectedOrderIds,
  onSuccess,
  currentGroup,
  shopId,
}: DeliveryGroupDialogProps) {
  const [groups, setGroups] = useState<DeliveryGroupDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkAddResult | null>(null);
  const [showBulkResult, setShowBulkResult] = useState(false);
  const [viewMode, setViewMode] = useState<"view" | "change">("view"); // View existing or change group

  const isBulkMode = selectedOrderIds.length > 1;
  const hasCurrentGroup = currentGroup !== null && currentGroup !== undefined;
  const isSingleOrderWithGroup = !isBulkMode && hasCurrentGroup;

  useEffect(() => {
    if (open) {
      // Reset view mode based on whether order has a group
      if (isSingleOrderWithGroup) {
        setViewMode("view");
      } else {
        setViewMode("change");
        fetchGroups();
      }
    } else {
      // Reset state when dialog closes
      setSearchTerm("");
      setCurrentPage(0);
      setSelectedGroupId(null);
    }
  }, [open, isSingleOrderWithGroup]);

  useEffect(() => {
    if (open && viewMode === "change") {
      fetchGroups();
    }
  }, [currentPage, viewMode]);

  // Debounced search effect
  useEffect(() => {
    if (open && viewMode === "change") {
      const timer = setTimeout(() => {
        setCurrentPage(0); // Reset to first page on search
        fetchGroups();
      }, 300); // 300ms debounce

      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await deliveryGroupService.getAvailableGroups(
        shopId,
        currentPage,
        10,
        searchTerm || undefined
      );
      setGroups(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load delivery groups");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToGroup = async () => {
    if (!selectedGroupId) return;

    try {
      setAssigning(true);

      // If single order with existing group, use change endpoint
      if (isSingleOrderWithGroup) {
        await deliveryGroupService.changeOrderGroup(
          selectedOrderIds[0],
          selectedGroupId
        );
        toast.success("Order successfully moved to new delivery group");
        onSuccess();
        onOpenChange(false);
      } else {
        // Bulk assignment
        const result = await deliveryGroupService.bulkAddOrdersToGroup(
          selectedGroupId,
          selectedOrderIds
        );
        setBulkResult(result);
        setShowBulkResult(true);

        if (result.successfullyAdded > 0) {
          toast.success(
            `Successfully assigned ${result.successfullyAdded} order(s) to group`
          );
          onSuccess();
        }

        if (result.skipped > 0) {
          toast.warning(`${result.skipped} order(s) were skipped`);
        }
      }

      fetchGroups(); // Refresh groups
    } catch (error: any) {
      console.error("Error assigning orders to group:", error);
      const errorMessage =
        error?.response?.data?.message || "Failed to assign orders to group";
      toast.error(errorMessage);
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateGroupSuccess = (newGroup: DeliveryGroupDto) => {
    setCreateGroupOpen(false);
    fetchGroups();
    setSelectedGroupId(newGroup.deliveryGroupId);
    toast.success("Group created successfully");
  };

  // No need for client-side filtering anymore - backend handles it
  const filteredGroups = groups;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "READY":
        return "default";
      case "IN_PROGRESS":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {viewMode === "view"
                ? "Delivery Group Assignment"
                : isBulkMode
                ? "Assign Orders to Delivery Group"
                : "Change Delivery Group"}
            </DialogTitle>
            <DialogDescription>
              {viewMode === "view"
                ? "View current delivery group assignment"
                : isBulkMode
                ? `Select a delivery group to assign ${selectedOrderIds.length} orders to`
                : "Select a new delivery group for this order"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto">
            {/* View Mode: Show Current Group */}
            {viewMode === "view" && currentGroup && (
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Current Assignment
                    </span>
                    <Badge variant={getStatusBadgeVariant(currentGroup.status)}>
                      {currentGroup.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">
                        Group Name
                      </Label>
                      <p className="font-medium">
                        {currentGroup.deliveryGroupName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Deliverer</Label>
                      <p className="font-medium">
                        {currentGroup.delivererName}
                      </p>
                    </div>
                    {currentGroup.deliveryGroupDescription && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">
                          Description
                        </Label>
                        <p className="text-sm">
                          {currentGroup.deliveryGroupDescription}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">
                        Total Orders
                      </Label>
                      <p className="font-medium">
                        {currentGroup.memberCount} orders
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <p className="text-sm">
                        {new Date(currentGroup.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {currentGroup.hasDeliveryStarted && (
                      <div className="col-span-2">
                        <Alert>
                          <Truck className="h-4 w-4" />
                          <AlertDescription>
                            Delivery started on{" "}
                            {currentGroup.deliveryStartedAt &&
                              new Date(
                                currentGroup.deliveryStartedAt
                              ).toLocaleString()}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>

                  {!currentGroup.hasDeliveryStarted && (
                    <Button
                      onClick={() => setViewMode("change")}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Change Delivery Group
                    </Button>
                  )}

                  {currentGroup.hasDeliveryStarted && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Cannot change group - delivery has already started
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Change Mode: Show Available Groups */}
            {viewMode === "change" && (
              <>
                {/* Search and Create Group */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search groups by name, deliverer, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={() => setCreateGroupOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </div>

                {/* Groups Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Available Delivery Groups
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-muted-foreground">
                          Loading groups...
                        </span>
                      </div>
                    ) : filteredGroups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No delivery groups found
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Group Name</TableHead>
                            <TableHead>Deliverer</TableHead>
                            <TableHead>Orders</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredGroups.map((group) => (
                            <TableRow
                              key={group.deliveryGroupId}
                              className={
                                selectedGroupId === group.deliveryGroupId
                                  ? "bg-primary/5"
                                  : ""
                              }
                            >
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {group.deliveryGroupName}
                                  </div>
                                  {group.deliveryGroupDescription && (
                                    <div className="text-sm text-muted-foreground">
                                      {group.deliveryGroupDescription}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">
                                    {group.delivererName}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {group.memberCount} orders
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={getStatusBadgeVariant(group.status)}
                                >
                                  {group.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(
                                    group.createdAt
                                  ).toLocaleDateString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setSelectedGroupId(group.deliveryGroupId)
                                  }
                                  disabled={group.hasDeliveryStarted}
                                >
                                  {selectedGroupId === group.deliveryGroupId ? (
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                  ) : (
                                    <Plus className="h-4 w-4 mr-1" />
                                  )}
                                  {selectedGroupId === group.deliveryGroupId
                                    ? "Selected"
                                    : "Select"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.max(0, currentPage - 1))
                      }
                      disabled={currentPage === 0}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(
                          Math.min(totalPages - 1, currentPage + 1)
                        )
                      }
                      disabled={currentPage >= totalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                )}

                {/* Selected Group Info */}
                {selectedGroupId && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Selected group:{" "}
                      <strong>
                        {
                          groups.find(
                            (g) => g.deliveryGroupId === selectedGroupId
                          )?.deliveryGroupName
                        }
                      </strong>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            {viewMode === "view" ? (
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            ) : (
              <>
                {isSingleOrderWithGroup && (
                  <Button variant="outline" onClick={() => setViewMode("view")}>
                    Back to View
                  </Button>
                )}
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignToGroup}
                  disabled={!selectedGroupId || assigning}
                >
                  {assigning
                    ? "Processing..."
                    : isSingleOrderWithGroup
                    ? "Change Group"
                    : "Assign to Group"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Group Modal */}
      <CreateGroupModal
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onSuccess={handleCreateGroupSuccess}
        selectedOrderIds={selectedOrderIds}
        mode={isSingleOrderWithGroup ? "change" : "create"}
        shopId={shopId}
      />

      {/* Bulk Result Modal */}
      <Dialog open={showBulkResult} onOpenChange={setShowBulkResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assignment Results</DialogTitle>
            <DialogDescription>
              Summary of the bulk assignment operation
            </DialogDescription>
          </DialogHeader>

          {bulkResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-green-50 rounded-md">
                  <div className="text-2xl font-bold text-green-600">
                    {bulkResult.successfullyAdded}
                  </div>
                  <div className="text-sm text-green-600">
                    Successfully Added
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-md">
                  <div className="text-2xl font-bold text-yellow-600">
                    {bulkResult.skipped}
                  </div>
                  <div className="text-sm text-yellow-600">Skipped</div>
                </div>
                <div className="p-4 bg-green-50 rounded-md">
                  <div className="text-2xl font-bold text-green-600">
                    {bulkResult.totalRequested}
                  </div>
                  <div className="text-sm text-green-600">Total Requested</div>
                </div>
              </div>

              {bulkResult.skippedOrders.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Skipped Orders:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {bulkResult.skippedOrders.map((skipped, index) => (
                      <div
                        key={index}
                        className="p-2 bg-yellow-50 rounded text-sm"
                      >
                        <div className="font-medium">
                          Order #{skipped.orderId}
                        </div>
                        <div className="text-yellow-600">
                          {skipped.reason}: {skipped.details}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowBulkResult(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
