"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Search,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Truck,
  Package,
  Star,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import deliveryAssignmentService, { DeliveryAgent, DeliveryAgentWorkload, PaginatedResponse } from "@/lib/services/delivery-assignment-service";

interface DeliveryAgentAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnRequestId: number;
  returnRequestDetails?: {
    customerName?: string;
    orderNumber?: string;
    submittedAt?: string;
    reason?: string;
  };
  onAssignmentComplete?: () => void;
}

export default function DeliveryAgentAssignmentModal({
  open,
  onOpenChange,
  returnRequestId,
  returnRequestDetails,
  onAssignmentComplete,
}: DeliveryAgentAssignmentModalProps) {
  console.log("DeliveryAgentAssignmentModal rendered with:", {
    open,
    returnRequestId,
    returnRequestDetails
  });
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("firstName");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("ASC");
  const [agentWorkloads, setAgentWorkloads] = useState<Record<string, DeliveryAgentWorkload>>({});
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Debounced search term for backend API calls
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Clear error when modal opens so a previous error doesn't persist
  useEffect(() => {
    if (open) setAssignmentError(null);
  }, [open]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(0); // Reset to first page when searching
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch delivery agents with backend pagination and search
  const { data: agentsData, isLoading: agentsLoading, error: agentsError } = useQuery<PaginatedResponse<DeliveryAgent>>({
    queryKey: ["delivery-agents-paginated", currentPage, pageSize, sortBy, sortDirection, debouncedSearchTerm],
    queryFn: () => deliveryAssignmentService.searchAvailableDeliveryAgents({
      search: debouncedSearchTerm || undefined,
      page: currentPage,
      size: pageSize,
      sort: sortBy,
      direction: sortDirection,
    }),
    enabled: open,
  });

  // Load workload data for visible agents
  useEffect(() => {
    if (agentsData?.content && agentsData.content.length > 0) {
      agentsData.content.forEach((agent: DeliveryAgent) => {
        if (!agentWorkloads[agent.id]) {
          deliveryAssignmentService.getDeliveryAgentWorkload(agent.id)
            .then((workload: DeliveryAgentWorkload) => {
              setAgentWorkloads(prev => ({ ...prev, [agent.id]: workload }));
            })
            .catch((error: any) => {
              console.error(`Failed to load workload for agent ${agent.id}:`, error);
            });
        }
      });
    }
  }, [agentsData?.content, agentWorkloads]);

  // Assignment mutation
  const assignmentMutation = useMutation({
    mutationFn: (agentId: string) => {
      console.log("Starting assignment mutation for agent:", agentId);
      console.log("Request payload:", {
        returnRequestId,
        deliveryAgentId: agentId,
        notes: notes.trim() || undefined,
      });
      return deliveryAssignmentService.assignDeliveryAgent({
        returnRequestId,
        deliveryAgentId: agentId,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      console.log("Assignment successful:", data);
      queryClient.invalidateQueries({ queryKey: ["return-requests"] });
      queryClient.invalidateQueries({ queryKey: ["appeals"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
      toast.success("Delivery agent assigned successfully");
      onAssignmentComplete?.();
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("=== ASSIGNMENT ERROR HANDLER TRIGGERED ===");
      console.error("Assignment error:", error);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);
      
      // Try to extract error message from different response formats
      let errorMessage = "Failed to assign delivery agent";
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          // Backend returns plain string error message (legacy)
          errorMessage = error.response.data.trim();
          console.log("Extracted string error message:", errorMessage);
        } else if (error.response.data.message) {
          // Backend returns JSON with message field (Spring Boot format)
          errorMessage = error.response.data.message;
          console.log("Extracted JSON message:", errorMessage);
        } else if (error.response.data.error && typeof error.response.data.error === 'string' && error.response.data.error !== 'Bad Request') {
          // Backend returns JSON with error field (custom format)
          errorMessage = error.response.data.error;
          console.log("Extracted JSON error:", errorMessage);
        } else if (typeof error.response.data === 'object') {
          // Fallback for other JSON formats - try message first, then error
          if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.error && error.response.data.error !== 'Bad Request') {
            errorMessage = error.response.data.error;
          } else {
            errorMessage = JSON.stringify(error.response.data);
          }
          console.log("Extracted JSON object:", errorMessage);
        }
      } else if (error.message) {
        // Network or other error
        errorMessage = error.message;
        console.log("Using error.message:", errorMessage);
      }
      
      console.log("Final error message to process:", errorMessage);
      setAssignmentError(errorMessage);
    },
  });

  const resetForm = () => {
    setSelectedAgentId("");
    setNotes("");
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setCurrentPage(0);
    setAgentWorkloads({});
    setAssignmentError(null);
  };

  const handleAssign = () => {
    console.log("handleAssign called");
    console.log("selectedAgentId:", selectedAgentId);
    console.log("returnRequestId:", returnRequestId);
    
    if (!selectedAgentId) {
      console.log("No agent selected, showing error toast");
      toast.error("Please select a delivery agent");
      return;
    }
    
    console.log("Triggering assignment mutation");
    assignmentMutation.mutate(selectedAgentId);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(field);
      setSortDirection("ASC");
    }
    setCurrentPage(0);
  };

  const getWorkloadBadge = (workload?: DeliveryAgentWorkload) => {
    if (!workload) return <Badge variant="outline">Loading...</Badge>;
    
    const totalActive = workload.pendingPickups + workload.scheduledPickups + workload.inProgressPickups;
    
    if (totalActive === 0) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>;
    } else if (totalActive <= 2) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Light Load</Badge>;
    } else if (totalActive <= 5) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Moderate Load</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Heavy Load</Badge>;
    }
  };

  const getSuccessRateBadge = (successRate: number) => {
    if (successRate >= 95) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
        <Star className="h-3 w-3" />
        Excellent
      </Badge>;
    } else if (successRate >= 85) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        Good
      </Badge>;
    } else if (successRate >= 70) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        Average
      </Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-800">
        Needs Improvement
      </Badge>;
    }
  };

  if (agentsError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error Loading Delivery Agents
            </DialogTitle>
            <DialogDescription>
              Failed to load available delivery agents. Please try again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Assign Delivery Agent
          </DialogTitle>
          <DialogDescription>
            Select a delivery agent to handle the pickup for return request #{returnRequestId}
          </DialogDescription>
        </DialogHeader>

        {/* Return Request Details */}
        {returnRequestDetails && (
          <div className="p-4 bg-green-50 rounded-md border border-green-200">
            <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Return Request Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {returnRequestDetails.customerName && (
                <div>
                  <span className="text-green-700 font-medium">Customer:</span>{" "}
                  <span className="text-green-800">{returnRequestDetails.customerName}</span>
                </div>
              )}
              {returnRequestDetails.orderNumber && (
                <div>
                  <span className="text-green-700 font-medium">Order:</span>{" "}
                  <span className="text-green-800">#{returnRequestDetails.orderNumber}</span>
                </div>
              )}
              {returnRequestDetails.submittedAt && (
                <div>
                  <span className="text-green-700 font-medium">Submitted:</span>{" "}
                  <span className="text-green-800">{new Date(returnRequestDetails.submittedAt).toLocaleDateString()}</span>
                </div>
              )}
              {returnRequestDetails.reason && (
                <div className="md:col-span-2">
                  <span className="text-green-700 font-medium">Reason:</span>{" "}
                  <span className="text-green-800">{returnRequestDetails.reason}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label>Search Delivery Agents</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-32">
            <Label>Page Size</Label>
            <Select value={pageSize.toString()} onValueChange={(value) => {
              setPageSize(parseInt(value));
              setCurrentPage(0);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {agentsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* No Agents Found */}
        {!agentsLoading && (!agentsData?.content || agentsData.content.length === 0) && (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Delivery Agents Found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "No agents match your search criteria." : "No delivery agents are currently available."}
            </p>
          </div>
        )}

        {/* Delivery Agents Table */}
        {!agentsLoading && agentsData?.content && agentsData.content.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("firstName")}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                      >
                        Agent
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Workload</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Current Tasks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentsData.content.map((agent: DeliveryAgent) => {
                    const workload = agentWorkloads[agent.id];
                    const isSelected = selectedAgentId === agent.id;
                    
                    return (
                      <TableRow
                        key={agent.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-muted/50",
                          isSelected && "bg-primary/5 border-primary"
                        )}
                        onClick={() => setSelectedAgentId(agent.id)}
                      >
                        <TableCell>
                          <input
                            type="radio"
                            name="selectedAgent"
                            value={agent.id}
                            checked={isSelected}
                            onChange={() => setSelectedAgentId(agent.id)}
                            className="h-4 w-4 text-primary"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {agent.firstName} {agent.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {agent.id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {agent.userEmail}
                            </div>
                            {agent.phoneNumber && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {agent.phoneNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {agent.enabled ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {getWorkloadBadge(workload)}
                        </TableCell>
                        <TableCell>
                          {workload ? (
                            <div className="space-y-1">
                              {getSuccessRateBadge(workload.successRate)}
                              <div className="text-xs text-muted-foreground">
                                {workload.successRate.toFixed(1)}% success
                              </div>
                            </div>
                          ) : (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          )}
                        </TableCell>
                        <TableCell>
                          {workload ? (
                            <TooltipProvider>
                              <div className="flex gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs cursor-help">
                                      P: {workload.pendingPickups}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Pending Pickups</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs cursor-help">
                                      S: {workload.scheduledPickups}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Scheduled Pickups</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs cursor-help">
                                      I: {workload.inProgressPickups}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>In Progress Pickups</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          ) : (
                            <div className="text-xs text-muted-foreground">Loading...</div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {agentsData.content.length} of {agentsData.totalElements} agents
                (Page {agentsData.number + 1} of {agentsData.totalPages})
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={agentsData.first || agentsLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={agentsData.last || agentsLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label>Assignment Notes (Optional)</Label>
          <Textarea
            placeholder="Add any special instructions or notes for the delivery agent..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setAssignmentError(null);
              onOpenChange(false);
              resetForm();
            }}
            disabled={assignmentMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedAgentId || assignmentMutation.isPending}
          >
            {assignmentMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Assigning...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                Assign Agent
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Error dialog - shows backend error message */}
    <Dialog open={!!assignmentError} onOpenChange={(open) => !open && setAssignmentError(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Assignment failed
          </DialogTitle>
          <DialogDescription asChild>
            <p className="text-sm text-muted-foreground pt-2 whitespace-pre-wrap">
              {assignmentError}
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-4">
          <Button
            variant="default"
            onClick={() => setAssignmentError(null)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
