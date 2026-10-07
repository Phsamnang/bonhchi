import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Invoice } from "@/hooks/useInvoices";

/** What caused a wallet movement */
export type TransactionKind =
  | "opening"
  | "income"
  | "purchase"
  | "expense"
  | "payment"
  | "salary"
  | "advance"
  | "loan"
  | "transfer"
  | "request"
  | "void";

/** One money in / out of a wallet (wallet_transactions ledger) */
export interface WalletTransaction {
  id: number;
  /** Business date YYYY-MM-DD */
  date: string;
  /** HH:mm:ss, Phnom Penh */
  time: string;
  created_at: string;
  wallet_id: number;
  wallet_code: string;
  wallet_name: string;
  direction: "in" | "out";
  /** In the wallet's currency */
  amount: number;
  currency: "USD" | "KHR";
  /** Wallet balance right after; null for history copied in before the ledger existed */
  balance_after: number | null;
  kind: TransactionKind;
  ref_type: "invoice" | "transfer" | "wallet" | null;
  ref_id: number | null;
  description: string | null;
  invoice_no: string | null;
  invoice_status: string | null;
  created_by_name: string | null;
}

export interface TransactionsResponse {
  from: string;
  to: string;
  transactions: WalletTransaction[];
  /** For the whole filter, not only the returned page */
  totals: { in_usd: number; out_usd: number; in_khr: number; out_khr: number; count: number };
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface TransactionFilters {
  from: string;
  to: string;
  walletIds?: Array<string | number>;
  kind?: TransactionKind | "";
  direction?: "in" | "out" | "";
  q?: string;
  page?: number;
  limit?: number;
}

/** Khmer label + icon per kind */
export const TRANSACTION_KINDS: Record<TransactionKind, { label: string; icon: string }> = {
  income: { label: "ចំណូល", icon: "income" },
  purchase: { label: "ទិញទំនិញ", icon: "cart" },
  expense: { label: "ចំណាយតូចតាច", icon: "coins" },
  payment: { label: "បង់វិក្កយបត្រ", icon: "receipt" },
  salary: { label: "ប្រាក់ខែ", icon: "payroll" },
  advance: { label: "បុរេប្រទាន", icon: "user" },
  loan: { label: "ប្រាក់កម្ចី", icon: "bank" },
  transfer: { label: "ផ្ទេរប្រាក់", icon: "transfer" },
  request: { label: "សំណើលុយ", icon: "request" },
  void: { label: "លុប / ត្រឡប់ប្រាក់", icon: "x" },
  opening: { label: "សមតុល្យដើម", icon: "wallet" },
};

/** Every money in / out for the filter (newest first) */
export function useTransactions(f: TransactionFilters) {
  return useQuery<TransactionsResponse>({
    queryKey: ["transactions", f],
    queryFn: async () => {
      const { data } = await api.get("/transactions", {
        params: {
          from: f.from,
          to: f.to,
          wallet_id: f.walletIds && f.walletIds.length > 0 ? f.walletIds.join(",") : undefined,
          kind: f.kind || undefined,
          direction: f.direction || undefined,
          q: f.q?.trim() || undefined,
          page: f.page ?? 1,
          limit: f.limit ?? 200,
        },
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

/** Loads the invoice behind a transaction (for the detail modal) */
export async function fetchInvoice(id: number | string): Promise<Invoice> {
  const { data } = await api.get(`/invoices/${id}`);
  return data;
}
