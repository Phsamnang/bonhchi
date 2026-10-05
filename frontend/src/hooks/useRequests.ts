import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface MoneyRequest {
  id: string | number;
  amount: number;
  currency: "USD" | "KHR";
  reason: string;
  status: "pending" | "approved" | "settled" | "rejected";
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  requested_by_name: string;
  approved_by_name?: string;
  category_name?: string;
  distributions?: Array<{
    id: string | number;
    recipient_name: string;
    amount: number;
    currency: "USD" | "KHR";
    given_at: string;
    note?: string;
  }>;
  total_distributed?: number;
  remaining_balance?: number;
}

export function useRequests(status?: string) {
  return useQuery<MoneyRequest[]>({
    queryKey: ["money-requests", status || "all"],
    queryFn: async () => {
      const { data } = await api.get("/money-requests", {
        params: status && status !== "all" ? { status } : undefined,
      });
      return data;
    },
  });
}

export function useCreateRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      amount: number;
      currency: "USD" | "KHR";
      reason: string;
      category_id?: string | number;
    }) => {
      const { data } = await api.post("/money-requests", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["money-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useApproveRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, from_wallet }: { id: string | number; from_wallet?: string }) => {
      const { data } = await api.post(`/money-requests/${id}/approve`, { from_wallet });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["money-requests"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRejectRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string | number; reason: string }) => {
      const { data } = await api.post(`/money-requests/${id}/reject`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["money-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useSettleRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, return_wallet }: { id: string | number; return_wallet?: string }) => {
      const { data } = await api.post(`/money-requests/${id}/settle`, { return_wallet });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["money-requests"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
