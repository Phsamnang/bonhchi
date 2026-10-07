"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboard } from "@/hooks/useDashboard";
import { useWallets, Wallet, MergedBankWallet, groupWalletsByBank } from "@/hooks/useWallets";
import { useInvoices, Invoice } from "@/hooks/useInvoices";
import { useRequests, MoneyRequest, useApproveRequestMutation, useRejectRequestMutation, useSettleRequestMutation } from "@/hooks/useRequests";
import { useDailyReport } from "@/hooks/useReports";
import { useShops, Shop } from "@/hooks/useMasterData";

/* ─── Types ─────────────────────────────────────────── */

type Role = "owner" | "manager" | "staff";

export type ToastType = "success" | "error" | "info" | "warning";

interface DashboardContextValue {
  // Session & Role
  session: ReturnType<typeof useSession>["data"];
  role: Role;
  roleLabel: string;
  logout: () => void;
  isOwner: boolean;
  isStaff: boolean;

  // Toast
  toastText: string | null;
  toastType: ToastType;
  showToast: (msg: string, type?: ToastType) => void;
  hideToast: () => void;

  // Modal controls
  isSmallExpenseOpen: boolean;
  setIsSmallExpenseOpen: (v: boolean) => void;
  isTransferOpen: boolean;
  setIsTransferOpen: (v: boolean) => void;
  isCashCountOpen: boolean;
  setIsCashCountOpen: (v: boolean) => void;
  isMarketTripOpen: boolean;
  setIsMarketTripOpen: (v: boolean) => void;
  /** Supplier to preload when the purchase modal opens (null = normal multi-shop trip) */
  marketTripSupplier: Shop | null;
  openMarketTrip: (supplier?: Shop | null) => void;
  isAddSheetOpen: boolean;
  setIsAddSheetOpen: (v: boolean) => void;
  isMoneyInOpen: boolean;
  setIsMoneyInOpen: (v: boolean) => void;
  selectedInvoice: Invoice | null;
  setSelectedInvoice: (inv: Invoice | null) => void;
  newMenu: boolean;
  setNewMenu: (v: boolean) => void;
  // Data
  dashboard: ReturnType<typeof useDashboard>["data"];
  wallets: Wallet[];
  invoicesData: ReturnType<typeof useInvoices>["data"];
  requests: MoneyRequest[];
  reportData: ReturnType<typeof useDailyReport>["data"];
  masterShops: ReturnType<typeof useShops>["data"];

  // Loading states
  isDashboardLoading: boolean;
  isWalletsLoading: boolean;
  isInvoicesLoading: boolean;
  isRequestsLoading: boolean;
  isReportLoading: boolean;
  isShopsLoading: boolean;

  // Derived
  visibleWallets: Wallet[];
  mergedWallets: MergedBankWallet[];
  unpaidInvoices: Invoice[];
  oweUsd: number;
  oweKhr: number;

  // Request mutations
  approveReqMutation: ReturnType<typeof useApproveRequestMutation>;
  rejectReqMutation: ReturnType<typeof useRejectRequestMutation>;
  settleReqMutation: ReturnType<typeof useSettleRequestMutation>;

  // Filters
  reqTab: string;
  setReqTab: (t: string) => void;

  // Actions
  handleRefreshAll: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboardContext() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboardContext must be used within DashboardProvider");
  return ctx;
}

/* ─── Provider ──────────────────────────────────────── */

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  // Role always comes from the signed-in user (least privilege until the session loads)
  const role: Role = (session?.user?.role as Role) || "staff";
  const queryClient = useQueryClient();
  const logout = useCallback(() => {
    queryClient.clear(); // drop cached data from this user
    signOut({ callbackUrl: "/login" });
  }, [queryClient]);
  const [newMenu, setNewMenu] = useState(false);

  // Filters
  const [reqTab, setReqTab] = useState<string>("all");

  // Modal state
  const [isSmallExpenseOpen, setIsSmallExpenseOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isCashCountOpen, setIsCashCountOpen] = useState(false);
  const [isMarketTripOpen, setIsMarketTripOpen] = useState(false);
  const [marketTripSupplier, setMarketTripSupplier] = useState<Shop | null>(null);
  const openMarketTrip = useCallback((supplier?: Shop | null) => {
    setMarketTripSupplier(supplier ?? null);
    setIsMarketTripOpen(true);
  }, []);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isMoneyInOpen, setIsMoneyInOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // TanStack Query hooks
  const { data: dashboard, isLoading: isDashboardLoading, refetch: refetchDash } = useDashboard(role);
  const { data: wallets = [], isLoading: isWalletsLoading, refetch: refetchWallets } = useWallets();
  const { data: invoicesData, isLoading: isInvoicesLoading, refetch: refetchInvoices } = useInvoices();
  const { data: requests = [], isLoading: isRequestsLoading, refetch: refetchRequests } = useRequests(reqTab);
  const { data: reportData, isLoading: isReportLoading, refetch: refetchReport } = useDailyReport();
  const { data: masterShops = [], isLoading: isShopsLoading } = useShops();

  // Mutations
  const approveReqMutation = useApproveRequestMutation();
  const rejectReqMutation = useRejectRequestMutation();
  const settleReqMutation = useSettleRequestMutation();

  const handleRefreshAll = useCallback(() => {
    refetchDash();
    refetchWallets();
    refetchInvoices();
    refetchRequests();
    refetchReport();
  }, [refetchDash, refetchWallets, refetchInvoices, refetchRequests, refetchReport]);

  const [toast, setToast] = useState<{ text: string; type: ToastType } | null>(null);
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((msg: string, type?: ToastType) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    // Auto-detect error or warning if not explicitly provided
    let determinedType: ToastType = type || "success";
    if (!type) {
      const lower = msg.toLowerCase();
      if (
        lower.includes("error") ||
        lower.includes("failed") ||
        lower.includes("fail") ||
        lower.includes("បរាជ័យ") ||
        lower.includes("មានបញ្ហា") ||
        lower.includes("មិនអាច") ||
        lower.includes("ខុស")
      ) {
        determinedType = "error";
      } else if (
        lower.includes("បដិសេធ") ||
        lower.includes("សូម") ||
        lower.includes("គ្មាន") ||
        lower.includes("warning")
      ) {
        determinedType = "warning";
      }
    }

    setToast({ text: msg, type: determinedType });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 4000);
  }, []);

  const roleLabel =
    role === "owner"
      ? "ម្ចាស់ (Owner)"
      : role === "manager"
      ? "អ្នកគ្រប់គ្រង (Manager)"
      : "បុគ្គលិក (Staff)";

  const isOwner = role === "owner";
  const isStaff = role === "staff";

  // Filter wallets by role
  const visibleWallets = wallets.filter((w) => {
    if (role === "staff") return w.code.startsWith("petty");
    if (role === "manager") return w.category !== "advance";
    return true;
  });

  // Grouped wallets merged by bank
  const mergedWallets = useMemo(() => groupWalletsByBank(visibleWallets), [visibleWallets]);

  // Unpaid invoices
  const unpaidInvoices = invoicesData?.invoices?.filter(
    (inv) => inv.status === "unpaid" || inv.status === "partial"
  ) || [];
  const oweUsd = unpaidInvoices.reduce((s, i) => s + (i.total_usd - i.paid_usd), 0);
  const oweKhr = unpaidInvoices.reduce((s, i) => s + (i.total_khr - i.paid_khr), 0);

  const value: DashboardContextValue = {
    session,
    role,
    roleLabel,
    logout,
    isOwner,
    isStaff,
    toastText: toast?.text || null,
    toastType: toast?.type || "success",
    showToast,
    hideToast,
    isSmallExpenseOpen,
    setIsSmallExpenseOpen,
    isTransferOpen,
    setIsTransferOpen,
    isCashCountOpen,
    setIsCashCountOpen,
    isMarketTripOpen,
    setIsMarketTripOpen,
    marketTripSupplier,
    openMarketTrip,
    isAddSheetOpen,
    setIsAddSheetOpen,
    isMoneyInOpen,
    setIsMoneyInOpen,
    selectedInvoice,
    setSelectedInvoice,
    newMenu,
    setNewMenu,
    dashboard,
    wallets,
    invoicesData,
    requests,
    reportData,
    masterShops,
    isDashboardLoading,
    isWalletsLoading,
    isInvoicesLoading,
    isRequestsLoading,
    isReportLoading,
    isShopsLoading,
    visibleWallets,
    mergedWallets,
    unpaidInvoices,
    oweUsd,
    oweKhr,
    approveReqMutation,
    rejectReqMutation,
    settleReqMutation,
    reqTab,
    setReqTab,
    handleRefreshAll,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
