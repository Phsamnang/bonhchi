import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DailyReportResponse {
  date: string;
  summary: {
    total_expense: { usd: number; khr: number };
    total_income: { usd: number; khr: number };
    net: { usd: number; khr: number };
    paid_by: {
      qr: number;
      cash: number;
    };
    unpaid: { usd: number; khr: number };
  };
  rows: Array<{
    n: number;
    item: string;
    shop: string;
    qty: string | number;
    price: string | number;
    pay: string;
    payCls: string;
    usd: string | number;
    khr: string | number;
  }>;
}

export interface PurchasedItem {
  id: string | number;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  currency: "USD" | "KHR";
  line_total: number;
  is_paid: boolean;
  invoice_id: string | number;
  invoice_no: string;
  invoice_date: string;
  supplier_name: string;
  wallet_code: string;
  status: string;
}

export function usePurchasedItems(period: string) {
  return useQuery<{ period: string; total: number; items: PurchasedItem[] }>({
    queryKey: ["purchased-items", period],
    queryFn: async () => {
      const { data } = await api.get("/reports/items", { params: { period } });
      return data;
    },
  });
}

export function useDailyReport(date?: string) {
  const queryDate = date || new Date().toISOString().split("T")[0];

  return useQuery<DailyReportResponse>({
    queryKey: ["daily-report", queryDate],
    queryFn: async () => {
      const { data } = await api.get("/reports/daily", {
        params: { date: queryDate },
      });
      return data;
    },
  });
}
