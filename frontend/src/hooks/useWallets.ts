import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type WalletType =
  | "cash"
  | "bank"
  | "cash_drawer"
  | "petty_cash"
  | "delivery_app"
  | "staff_advance"
  | "manager_advance"
  | "tips";

export type WalletCategory = "cash" | "bank" | "advance" | "other";

export interface Wallet {
  id: string | number;
  code: string;
  name_km: string;
  name_en: string;
  type: string;
  category: WalletCategory;
  usd: number;
  khr: number;
}

export interface LiquiditySummary {
  total: { usd: number; khr: number };
  cash: { usd: number; khr: number };
  bank: { usd: number; khr: number };
}

export interface TransferPayload {
  from_wallet_id: string | number;
  to_wallet_id: string | number;
  amount: number;
  currency: "USD" | "KHR";
  note?: string;
}

export function useWallets(category?: "cash" | "bank") {
  return useQuery<Wallet[]>({
    queryKey: ["wallets", category || "all"],
    queryFn: async () => {
      const { data } = await api.get("/wallets", {
        params: category ? { category } : undefined,
      });
      return data;
    },
  });
}

export function useLiquiditySummary() {
  return useQuery<LiquiditySummary>({
    queryKey: ["wallets-summary"],
    queryFn: async () => {
      const { data } = await api.get("/wallets/summary");
      return data;
    },
  });
}

export function useTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TransferPayload) => {
      const { data } = await api.post("/wallets/transfer", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallets-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export interface CreateWalletPayload {
  name_km: string;
  name_en?: string;
  type?: WalletType;
  category?: WalletCategory;
  opening_usd?: number;
  opening_khr?: number;
}

export function useCreateWalletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateWalletPayload) => {
      const { data } = await api.post<Wallet>("/wallets", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallets-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
