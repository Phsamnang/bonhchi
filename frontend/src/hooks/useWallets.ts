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
  currency?: "USD" | "KHR";
  opening_balance?: number;
  current_balance?: number;
  usd: number;
  khr: number;
}

export interface MergedBankWallet {
  groupKey: string;
  name_km: string;
  name_en: string;
  category: WalletCategory;
  type: string;
  usd: number;
  khr: number;
  codes: string[];
  ids: (string | number)[];
  wallets: Wallet[];
  primaryWallet: Wallet;
}

export function cleanWalletName(name?: string): string {
  if (!name) return "";
  return name
    .replace(/\s*[\(\[]?\s*(USD|KHR|ដុល្លារ|រៀល)\s*[\)\]]?\s*$/i, "")
    .trim();
}

export function groupWalletsByBank(wallets: Wallet[]): MergedBankWallet[] {
  const map = new Map<string, MergedBankWallet>();

  for (const w of wallets) {
    const cleanKm = cleanWalletName(w.name_km) || w.name_km;
    const cleanEn = cleanWalletName(w.name_en) || w.name_en || cleanKm;
    const groupKey = `${cleanKm.toLowerCase()}__${w.category || "cash"}`;

    const usdVal = w.currency === "USD"
      ? (w.current_balance !== undefined ? Number(w.current_balance) : Number(w.usd || 0))
      : Number(w.usd || 0);
    const khrVal = w.currency === "KHR"
      ? (w.current_balance !== undefined ? Number(w.current_balance) : Number(w.khr || 0))
      : Number(w.khr || 0);

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        groupKey,
        name_km: cleanKm,
        name_en: cleanEn,
        category: w.category,
        type: w.type,
        usd: usdVal,
        khr: khrVal,
        codes: [w.code],
        ids: [w.id],
        wallets: [w],
        primaryWallet: w,
      });
    } else {
      const g = map.get(groupKey)!;
      g.usd += usdVal;
      g.khr += khrVal;
      if (!g.codes.includes(w.code)) g.codes.push(w.code);
      if (!g.ids.includes(w.id)) g.ids.push(w.id);
      g.wallets.push(w);
    }
  }

  return Array.from(map.values());
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
  code?: string;
  name_km: string;
  name_en?: string;
  type?: WalletType;
  category?: WalletCategory;
  currency?: "USD" | "KHR";
  opening_balance?: number;
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
