"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Users, Calendar, AlertCircle, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  deliveryGroupService,
  AgentDto,
  DeliveryGroupDto,
} from "@/lib/services/delivery-group-service";
import { toast } from "sonner";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (group: DeliveryGroupDto) => void;
  selectedOrderIds: number[];
  mode?: "create" | "change"; // Mode: create new group or create for changing
  shopId: string;
}

export function CreateGroupModal({
  open,
  onOpenChange,
  selectedOrderIds,
  onSuccess,
  mode = "create",
  shopId,
}: CreateGroupModalProps) {
  const [formData, setFormData] = useState({
    deliveryGroupName: "",
    deliveryGroupDescription: "",
    delivererId: "",
  });
  const [agents, setAgents] = useState<AgentDto[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [creating, setCreating] = useState(false);
  // Don't auto-assign when changing groups
  const [autoAssignOrders, setAutoAssignOrders] = useState(mode === "create");
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreAgents, setHasMoreAgents] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setFormData({
        deliveryGroupName: "",
        deliveryGroupDescription: "",
        delivererId: "",
      });
      setSearchTerm("");
      setCurrentPage(0);
      fetchAgents();
    }
  }, [open]);

  useEffect(() => {
    if (open && currentPage > 0) {
      fetchAgents();
    }
  }, [currentPage]);

  // Debounced search effect
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setCurrentPage(0); // Reset to first page on search
        setAgents([]); // Clear existing agents
        fetchAgents();
      }, 300); // 300ms debounce

      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true);
      const response = await deliveryGroupService.getAvailableAgents(
        shopId,
        currentPage,
        20,
        searchTerm || undefined
      );
      if (currentPage === 0) {
        setAgents(response.data);
      } else {
        setAgents((prev) => [...prev, ...response.data]);
      }
      setHasMoreAgents(response.pagination.hasNext);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error("Failed to load delivery agents");
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadMoreAgents = () => {
    if (!loadingAgents && hasMoreAgents) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.deliveryGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    if (!formData.delivererId) {
      toast.error("Please select a delivery agent");
      return;
    }

    // Check if selected agent is busy
    const selectedAgentData = agents.find(
      (agent) => agent.agentId === formData.delivererId
    );
    if (selectedAgentData?.hasAGroup) {
      toast.error(
        `This agent is busy with ${selectedAgentData.activeGroupCount} active groups. Please select an available agent.`
      );
      return;
    }

    try {
      setCreating(true);
      // When changing groups, never auto-assign during creation
      const request = {
        ...formData,
        shopId,
        orderIds:
          mode === "create" && autoAssignOrders ? selectedOrderIds : undefined,
      };

      const newGroup = await deliveryGroupService.createGroup(request);

      toast.success("Delivery group created successfully!");

      // Reset form
      setFormData({
        deliveryGroupName: "",
        deliveryGroupDescription: "",
        delivererId: "",
      });
      setAutoAssignOrders(true);
      setSearchTerm("");

      onSuccess(newGroup);
    } catch (error: any) {
      console.error("Error creating group:", error);

      // Handle specific error messages from backend
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.details ||
        error?.message ||
        "Failed to create delivery group";

      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const selectedAgent = agents.find(
    (agent) => agent.agentId === formData.delivererId
  );

  // No need for client-side filtering anymore - backend handles it
  const filteredAgents = agents;

  // Separate available and busy agents
  const availableAgents = useMemo(
    () => filteredAgents.filter((agent) => !agent.hasAGroup),
    [filteredAgents]
  );

  const busyAgents = useMemo(
    () => filteredAgents.filter((agent) => agent.hasAGroup),
    [filteredAgents]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Delivery Group
          </DialogTitle>
          <DialogDescription>
            {mode === "change"
              ? "Create a new delivery group to move the order to"
              : "Create a new delivery group and optionally assign orders to it"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-6 overflow-y-auto pr-2">
            {/* Group Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  placeholder="Enter group name..."
                  value={formData.deliveryGroupName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryGroupName: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter group description..."
                  value={formData.deliveryGroupDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryGroupDescription: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
            </div>

            {/* Agent Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Delivery Agent *</Label>
                <div className="text-xs text-muted-foreground">
                  {availableAgents.length} available, {busyAgents.length} busy
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-80 overflow-y-auto border rounded-md">
                {loadingAgents && agents.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">
                      Loading agents...
                    </span>
                  </div>
                ) : filteredAgents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No agents found matching your search</p>
                    {searchTerm && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setSearchTerm("")}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                ) : availableAgents.length === 0 && busyAgents.length > 0 ? (
                  <div className="p-4">
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        All agents are currently busy with 5 active delivery
                        groups. Please wait for an agent to complete their
                        deliveries or try again later.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      {/* Still show busy agents for reference */}
                      <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                        Busy Agents ({busyAgents.length})
                      </div>
                      {busyAgents.map((agent) => (
                        <div
                          key={agent.agentId}
                          className="p-3 rounded-md border border-border bg-gray-100 opacity-60"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">
                                {agent.firstName} {agent.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {agent.email}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="destructive">Busy</Badge>
                              <span className="text-xs text-muted-foreground">
                                {agent.activeGroupCount}/5 groups
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {/* Available Agents Section */}
                    {availableAgents.length > 0 && (
                      <>
                        <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
                          Available Agents ({availableAgents.length})
                        </div>
                        {availableAgents.map((agent) => (
                          <div
                            key={agent.agentId}
                            className={`p-3 rounded-md border transition-colors ${
                              formData.delivererId === agent.agentId
                                ? "border-primary bg-primary/5"
                                : agent.hasAGroup
                                ? "border-border bg-gray-100 cursor-not-allowed opacity-60"
                                : "border-border hover:bg-muted/50 cursor-pointer"
                            }`}
                            onClick={() => {
                              if (!agent.hasAGroup) {
                                setFormData((prev) => ({
                                  ...prev,
                                  delivererId: agent.agentId,
                                }));
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">
                                  {agent.firstName} {agent.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {agent.email}
                                </div>
                                {agent.phoneNumber && (
                                  <div className="text-sm text-muted-foreground">
                                    {agent.phoneNumber}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge
                                  variant="default"
                                  className="bg-green-600"
                                >
                                  Available
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {agent.activeGroupCount}/5 groups
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Busy Agents Section */}
                    {busyAgents.length > 0 && (
                      <>
                        <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 mt-4">
                          Busy Agents ({busyAgents.length})
                        </div>
                        {busyAgents.map((agent) => (
                          <div
                            key={agent.agentId}
                            className="p-3 rounded-md border border-border bg-gray-100 cursor-not-allowed opacity-60"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">
                                  {agent.firstName} {agent.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {agent.email}
                                </div>
                                {agent.phoneNumber && (
                                  <div className="text-sm text-muted-foreground">
                                    {agent.phoneNumber}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="destructive">Busy</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {agent.activeGroupCount}/5 groups
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {hasMoreAgents && !searchTerm && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={loadMoreAgents}
                        disabled={loadingAgents}
                        className="w-full"
                      >
                        {loadingAgents ? "Loading..." : "Load More Agents"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Agent Info */}
            {selectedAgent && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Selected agent:{" "}
                  <strong>
                    {selectedAgent.firstName} {selectedAgent.lastName}
                  </strong>
                  {selectedAgent.hasAGroup ? (
                    <span className="text-red-600 ml-2">
                      (Busy - has {selectedAgent.activeGroupCount} active
                      groups, max 5 allowed)
                    </span>
                  ) : (
                    <span className="text-green-600 ml-2">
                      (Available - has {selectedAgent.activeGroupCount} active
                      groups)
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Auto-assign Orders - Only show in create mode */}
            {mode === "create" && selectedOrderIds.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoAssign"
                    checked={autoAssignOrders}
                    onCheckedChange={(checked) =>
                      setAutoAssignOrders(checked === true)
                    }
                  />
                  <Label htmlFor="autoAssign" className="text-sm">
                    Automatically assign {selectedOrderIds.length} selected
                    order(s) to this group
                  </Label>
                </div>
              </div>
            )}

            {/* Info for change mode */}
            {mode === "change" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  After creating this group, you'll be able to move the order to
                  it.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                creating ||
                !formData.deliveryGroupName.trim() ||
                !formData.delivererId
              }
            >
              {creating ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
