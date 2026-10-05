import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Invoice {
  id: string | number;
  invoice_no: string;
  date: string;
  time: string;
  type: "expense" | "income";
  expense_kind?: "product" | "small";
  supplier_name: string;
  category: string;
  wallet_code: string;
  total_usd: number;
  total_khr: number;
  paid_usd: number;
  paid_khr: number;
  status: "paid" | "partial" | "unpaid" | "void";
  void_reason?: string;
  receipt_url?: string;
  created_at: string;
  items?: Array<{
    id: string | number;
    item_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    currency: "USD" | "KHR";
    line_total: number;
    is_paid?: boolean;
  }>;
}

export interface SmallExpensePayload {
  amount: number;
  currency: "USD" | "KHR";
  category_name: string;
  wallet_code?: string;
  note?: string;
  date?: string;
}

export interface MarketTripPayload {
  trip_date: string;
  wallet_id: string | number;
  is_paid?: boolean;
  shops: Array<{
    supplier_id?: string | number;
    supplier_name: string;
    wallet_id?: string | number;
    items: Array<{
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      currency: "USD" | "KHR";
      is_paid?: boolean;
    }>;
  }>;
}

export function useInvoices(filters?: { status?: string; type?: string; supplier?: string }) {
  return useQuery<{ total: number; invoices: Invoice[] }>({
    queryKey: ["invoices", filters],
    queryFn: async () => {
      const { data } = await api.get("/invoices", { params: filters });
      return data;
    },
  });
}

export function useSmallExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SmallExpensePayload) => {
      const { data } = await api.post("/invoices/small-expense", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchased-items"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallets-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMarketTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MarketTripPayload) => {
      const { data } = await api.post("/invoices/market-trip", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchased-items"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallets-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useVoidInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string | number; reason: string }) => {
      const { data } = await api.post(`/invoices/${id}/void`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchased-items"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
