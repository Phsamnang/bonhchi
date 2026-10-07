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
  table_name?: string;
  category: string;
  wallet_code: string;
  wallet_id?: string | number;
  total_usd: number;
  total_khr: number;
  paid_usd: number;
  paid_khr: number;
  status: "paid" | "partial" | "unpaid" | "void";
  void_reason?: string;
  receipt_url?: string;
  note?: string;
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
  wallet_id?: string | number;
  note?: string;
  date?: string;
}

export interface MoneyInPayload {
  date?: string;
  time?: string;
  table_name?: string;
  wallet_code?: string;
  wallet_id?: string | number;
  usd_wallet_id?: string | number;
  khr_wallet_id?: string | number;
  amount_usd?: number;
  amount_khr?: number;
  source_name?: string;
  category_name?: string;
  reference_no?: string;
  note?: string;
  receipt_url?: string;
}

export interface MarketTripPayload {
  trip_date: string;
  wallet_id?: string | number;
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

export interface InvoiceFilters {
  status?: string;
  type?: string;
  supplier?: string;
  wallet_code?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InvoicesResponse {
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  invoices: Invoice[];
}

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery<InvoicesResponse>({
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
      queryClient.invalidateQueries({ queryKey: ["daily-cashflow"] });
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
      queryClient.invalidateQueries({ queryKey: ["daily-cashflow"] });
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
      queryClient.invalidateQueries({ queryKey: ["daily-cashflow"] });
    },
  });
}

export function usePayInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, wallet_id }: { id: string | number; wallet_id: string | number }) => {
      const { data } = await api.post(`/invoices/${id}/pay`, { wallet_id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchased-items"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallets-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["daily-cashflow"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useMoneyInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MoneyInPayload) => {
      const { data } = await api.post("/invoices/income", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallets-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["daily-cashflow"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
