import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ExpectedCountResponse {
  expected: {
    USD: number;
    KHR: number;
  };
  tolerance: {
    USD: number;
    KHR: number;
  };
}

export interface CashCountRecord {
  id: string | number;
  wallet_code: string;
  wallet_name: string;
  currency: "USD" | "KHR";
  count_date: string;
  system_amount: number;
  counted_amount: number;
  difference: number;
  tolerance_threshold: number;
  denominations_breakdown: Record<string, number>;
  reason_for_gap?: string;
  created_at: string;
}

export function useExpectedCount() {
  return useQuery<ExpectedCountResponse>({
    queryKey: ["count-expected"],
    queryFn: async () => {
      const { data } = await api.get("/wallet-counts/expected");
      return data;
    },
  });
}

export function useCountsHistory() {
  return useQuery<CashCountRecord[]>({
    queryKey: ["counts-history"],
    queryFn: async () => {
      const { data } = await api.get("/wallet-counts/history");
      return data;
    },
  });
}

export function useSubmitCountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      wallet_id?: string | number;
      currency: "USD" | "KHR";
      denominations: Record<string, number>;
      reason_for_gap?: string;
    }) => {
      const { data } = await api.post("/wallet-counts", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counts-history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
