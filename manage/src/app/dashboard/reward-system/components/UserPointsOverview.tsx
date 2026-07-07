"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { rewardSystemService } from "@/lib/services/reward-system-service";

export function UserPointsOverview() {
  const [searchUserId, setSearchUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchUserId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a user ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const summary = await rewardSystemService.getUserRewardSummary(
        searchUserId
      );
      toast({
        title: "Success",
        description: `User ${summary.userFullName} has ${summary.currentPoints} points`,
      });
    } catch (error: any) {
      console.error("Failed to get user summary:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to get user summary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Points Overview</CardTitle>
          <CardDescription>
            Search for users to view their reward points summary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter user UUID"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={loading || !searchUserId.trim()}
              >
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
