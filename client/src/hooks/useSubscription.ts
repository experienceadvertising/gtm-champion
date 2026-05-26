import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSubscriptionStatus } from "@/lib/api";

const SUBSCRIPTION_QUERY_KEY = ["subscription"] as const;

interface SubscriptionState {
  isPremium: boolean;
  subscription: unknown;
}

async function fetchSubscriptionState(): Promise<SubscriptionState> {
  try {
    const result = await getSubscriptionStatus();
    return { isPremium: !!result.isPremium, subscription: result.subscription };
  } catch {
    return { isPremium: false, subscription: null };
  }
}

export function useSubscription() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: fetchSubscriptionState,
    staleTime: 60_000,
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("upgrade") === "success") {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
    }
  }, [queryClient]);

  return {
    isPremium: query.data?.isPremium ?? false,
    subscription: query.data?.subscription ?? null,
    isLoading: query.isLoading,
    refetch: () => queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY }),
  };
}

export const subscriptionQueryKey = SUBSCRIPTION_QUERY_KEY;
