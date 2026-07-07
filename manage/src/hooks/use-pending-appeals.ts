import { useQuery } from "@tanstack/react-query";
import appealService from "@/lib/services/appeal-service";

export function usePendingAppealsCount(shopId?: string | null) {
  return useQuery({
    queryKey: ["pending-appeals-count", shopId],
    queryFn: () => appealService.getPendingAppealsCount(shopId!),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
    enabled: !!shopId, // Only enabled when shopId is available
  });
}
