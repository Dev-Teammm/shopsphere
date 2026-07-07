"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { useToast } from "@/hooks/use-toast";
import { shopMemberService, ShopMembersFilters, ShopMember } from "@/lib/services/shop-member-service";
import { shopService } from "@/lib/services/shop-service";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  Users,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

export default function MembersPage() {
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shopSlug");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for remove member dialog
  const [memberToRemove, setMemberToRemove] = useState<ShopMember | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  
  // State for date pickers
  const [joinDateFrom, setJoinDateFrom] = useState<Date | undefined>(undefined);
  const [joinDateTo, setJoinDateTo] = useState<Date | undefined>(undefined);

  // Filters state
  const [filters, setFilters] = useState<ShopMembersFilters>({
    email: "",
    username: "",
    role: "" as "EMPLOYEE" | "DELIVERY_AGENT" | "",
    joinDateFrom: "",
    joinDateTo: "",
    page: 0,
    size: 10,
    sortBy: "createdAt",
    sortDirection: "DESC",
  });

  // Get shop ID from slug
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["shop-by-slug", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug,
  });

  // Fetch members
  const {
    data: membersData,
    isLoading: membersLoading,
    refetch,
  } = useQuery({
    queryKey: ["shop-members", shop?.shopId, filters, joinDateFrom, joinDateTo],
    queryFn: () => {
      // Convert date objects to ISO format for backend
      const processedFilters = { ...filters };
      if (joinDateFrom) {
        processedFilters.joinDateFrom = joinDateFrom.toISOString();
      }
      if (joinDateTo) {
        // Set time to end of day for "to" date
        const endOfDay = new Date(joinDateTo);
        endOfDay.setHours(23, 59, 59, 999);
        processedFilters.joinDateTo = endOfDay.toISOString();
      }
      return shopMemberService.getShopMembers(shop!.shopId, processedFilters);
    },
    enabled: !!shop?.shopId,
  });

  const handleFilterChange = (key: keyof ShopMembersFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 0 })); // Reset to first page on filter change
  };

  const handleSearch = () => {
    refetch();
  };

  const handleReset = () => {
    setFilters({
      email: "",
      username: "",
      role: "" as "EMPLOYEE" | "DELIVERY_AGENT" | "",
      joinDateFrom: "",
      joinDateTo: "",
      page: 0,
      size: 10,
      sortBy: "createdAt",
      sortDirection: "DESC",
    });
    setJoinDateFrom(undefined);
    setJoinDateTo(undefined);
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  // Mutation for changing member role
  const changeRoleMutation = useMutation({
    mutationFn: ({ memberId, newRole }: { memberId: string; newRole: "EMPLOYEE" | "DELIVERY_AGENT" }) =>
      shopMemberService.changeMemberRole(shop!.shopId, memberId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-members", shop?.shopId] });
      toast({
        title: "Role Changed",
        description: "Member role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change member role. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for removing member from shop
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      shopMemberService.removeMemberFromShop(shop!.shopId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-members", shop?.shopId] });
      setIsRemoveDialogOpen(false);
      setMemberToRemove(null);
      toast({
        title: "Member Removed",
        description: "Member has been removed from the shop. Their role has been changed to CUSTOMER.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleChangeRole = (member: ShopMember, newRole: "EMPLOYEE" | "DELIVERY_AGENT") => {
    if (member.role === newRole) return;
    changeRoleMutation.mutate({ memberId: member.id, newRole });
  };

  const handleRemoveClick = (member: ShopMember) => {
    setMemberToRemove(member);
    setIsRemoveDialogOpen(true);
  };

  const handleConfirmRemove = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate(memberToRemove.id);
    }
  };

  if (shopLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!shop) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Shop Not Found</h3>
            <p className="text-muted-foreground">
              Please select a shop to view members.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground">
          Manage employees and delivery agents for {shop.name}
        </p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter members by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="Search by email..."
                value={filters.email || ""}
                onChange={(e) => handleFilterChange("email", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Name</Label>
              <Input
                id="username"
                placeholder="Search by name..."
                value={filters.username || ""}
                onChange={(e) => handleFilterChange("username", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={filters.role || "ALL"}
                onValueChange={(value) => handleFilterChange("role", value === "ALL" ? "" : value)}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All roles</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="DELIVERY_AGENT">Delivery Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Items per page</Label>
              <Select
                value={String(filters.size || 10)}
                onValueChange={(value) => handleFilterChange("size", parseInt(value))}
              >
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="joinDateFrom">Join Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="joinDateFrom"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !joinDateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {joinDateFrom ? (
                      format(joinDateFrom, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={joinDateFrom}
                    onSelect={(date) => {
                      setJoinDateFrom(date);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="joinDateTo">Join Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="joinDateTo"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !joinDateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {joinDateTo ? (
                      format(joinDateTo, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={joinDateTo}
                    onSelect={(date) => {
                      setJoinDateTo(date);
                    }}
                    disabled={(date) => {
                      // Disable dates before the "from" date
                      if (joinDateFrom) {
                        return date < joinDateFrom;
                      }
                      return false;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} className="gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shop Members</CardTitle>
          <CardDescription>
            {membersData?.totalElements || 0} member(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : membersData && membersData.content.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersData.content.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.firstName} {member.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {member.userEmail}
                            {member.emailVerified && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.phoneNumber ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              {member.phoneNumber}
                              {member.phoneVerified && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              member.role === "EMPLOYEE" ? "default" : "secondary"
                            }
                          >
                            {member.role === "EMPLOYEE" ? "Employee" : "Delivery Agent"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {member.createdAt
                              ? format(new Date(member.createdAt), "MMM dd, yyyy")
                              : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.lastLogin
                            ? format(new Date(member.lastLogin), "MMM dd, yyyy HH:mm")
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={member.enabled ? "default" : "destructive"}
                          >
                            {member.enabled ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* Change Role Dropdown */}
                            <Select
                              value={member.role}
                              onValueChange={(value) =>
                                handleChangeRole(member, value as "EMPLOYEE" | "DELIVERY_AGENT")
                              }
                              disabled={changeRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-[140px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                <SelectItem value="DELIVERY_AGENT">Delivery Agent</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {/* Remove Member Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveClick(member)}
                              disabled={removeMemberMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {membersData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {membersData.number * membersData.size + 1} to{" "}
                    {Math.min(
                      (membersData.number + 1) * membersData.size,
                      membersData.totalElements
                    )}{" "}
                    of {membersData.totalElements} members
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(membersData.number - 1)}
                      disabled={membersData.first || membersLoading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(membersData.number + 1)}
                      disabled={membersData.last || membersLoading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Members Found</h3>
              <p className="text-muted-foreground">
                {filters.email || filters.username || filters.role
                  ? "Try adjusting your filters to see more results."
                  : "This shop has no employees or delivery agents yet."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Remove Member from Shop
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {memberToRemove?.firstName} {memberToRemove?.lastName}
              </strong>{" "}
              from this shop?
              <br />
              <br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Change their role to CUSTOMER</li>
                <li>Remove their association with this shop</li>
                <li>Preserve all their historical actions and data</li>
              </ul>
              <br />
              <strong className="text-destructive">
                This action cannot be undone. The member will need to be re-invited to rejoin the shop.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsRemoveDialogOpen(false);
                setMemberToRemove(null);
              }}
              disabled={removeMemberMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive hover:bg-destructive/90"
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Member
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
