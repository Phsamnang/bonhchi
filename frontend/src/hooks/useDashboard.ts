import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DashboardSummary {
  date: string;
  date_km: string;
  role: string;
  closing_count_completed: boolean;
  closing_time: string;
  income_today: { usd: number; khr: number };
  expense_today: { usd: number; khr: number };
  staff_spend_today: { usd: number; khr: number };
  liquidity: {
    total: { usd: number; khr: number };
    cash: { usd: number; khr: number };
    bank: { usd: number; khr: number };
  };
  wallets: Array<{
    id: string | number;
    code: string;
    name_km: string;
    name_en: string;
    type: string;
    category: "cash" | "bank" | "advance";
    usd: number;
    khr: number;
  }>;
  recent_transactions: Array<{
    id: string | number;
    invoice_no: string;
    date: string;
    time: string;
    type: "expense" | "income";
    expense_kind: "product" | "small";
    supplier_name: string;
    category: string;
    wallet_code: string;
    total_usd: number;
    total_khr: number;
    paid_usd: number;
    paid_khr: number;
    status: "paid" | "partial" | "unpaid" | "void";
    receipt_url?: string;
  }>;
}

export function useDashboard(role: string = "owner") {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard", role],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/summary", {
        params: { role },
      });
      return data;
    },
    staleTime: 1000 * 15, // 15 seconds
  });
}
