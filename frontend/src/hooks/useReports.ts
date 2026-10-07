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

export interface CashflowAmounts {
  income_usd: number;
  income_khr: number;
  /** Market-trip product purchases (the item list) */
  purchase_usd: number;
  purchase_khr: number;
  /** Utilities: electricity, water, internet, gas, rent, rubbish */
  utility_usd: number;
  utility_khr: number;
  /** Staff salary payouts + salary advances */
  payroll_usd: number;
  payroll_khr: number;
  /** Small expenses that are none of the above */
  other_usd: number;
  other_khr: number;
  expense_usd: number;
  expense_khr: number;
  net_usd: number;
  net_khr: number;
}

export interface CashflowDay extends CashflowAmounts {
  date: string;
  income_count: number;
  expense_count: number;
}

export interface DailyCashflowResponse {
  period: string;
  days: CashflowDay[];
  totals: CashflowAmounts;
}

/** Income vs expense for every day of the period (invoice totals, voids excluded) */
export function useDailyCashflow(period: string) {
  return useQuery<DailyCashflowResponse>({
    queryKey: ["daily-cashflow", period],
    queryFn: async () => {
      const { data } = await api.get("/reports/daily-cashflow", { params: { period } });
      return data;
    },
  });
}

export interface MonthlyReportResponse {
  month: string;
  start: string;
  /** Last day included (today for the current month) */
  end: string;
  exchange_rate: number;
  /** Day rows carry no utility or payroll (= 0): both are monthly costs, see totals and categories */
  days: CashflowDay[];
  /** utility_* = the month's utility categories; payroll_* = salary for the month (runs ending this month); expense/net include both */
  totals: CashflowAmounts;
  /**
   * Income/expense by category. Payroll rows are one per run (count = staff,
   * amounts = salary earned) with run_id, status and paid_on.
   */
  categories: {
    grp: "income" | "purchase" | "utility" | "payroll" | "other";
    category: string;
    count: number;
    usd: number;
    khr: number;
    /** First / last invoice date of the category in the month (not on payroll rows) */
    first_date?: string;
    last_date?: string;
    run_id?: number | string;
    status?: "draft" | "paid";
    paid_on?: string | null;
  }[];
  /** Salary money paid out in the month (by payment date); listed only, not in the totals */
  payroll: { invoice_no: string; date: string; description: string; category: string; wallet_code: string; usd: number; khr: number }[];
  /** Payroll runs whose period ends in the month (whenever paid); cost_* = salary earned, net_* = paid out */
  payroll_runs: {
    id: number | string;
    title: string;
    period_start: string;
    period_end: string;
    status: "draft" | "paid" | "void";
    paid_on: string | null;
    net_usd: number;
    net_khr: number;
    cost_usd: number;
    cost_khr: number;
    staff_count: number;
  }[];
}

/** Monthly brief: each day + month totals by income / purchase / utility / payroll / other */
export function useMonthlyReport(month: string) {
  return useQuery<MonthlyReportResponse>({
    queryKey: ["monthly-report", month],
    queryFn: async () => {
      const { data } = await api.get("/reports/monthly", { params: { month } });
      return data;
    },
    enabled: /^\d{4}-\d{2}$/.test(month),
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
