import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/lib/services/order-service";

export function usePendingOrdersCount(shopId?: string | null) {
  return useQuery({
    queryKey: ["pending-orders-count", shopId],
    queryFn: () => orderService.getPendingOrdersCount(shopId!),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
    enabled: !!shopId, // Only enabled when shopId is available
  });
}
