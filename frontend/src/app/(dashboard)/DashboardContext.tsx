"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboard } from "@/hooks/useDashboard";
import { useWallets, Wallet, MergedBankWallet, groupWalletsByBank } from "@/hooks/useWallets";
import { useInvoices, Invoice } from "@/hooks/useInvoices";
import { useRequests, MoneyRequest, useApproveRequestMutation, useRejectRequestMutation, useSettleRequestMutation } from "@/hooks/useRequests";
import { useDailyReport } from "@/hooks/useReports";
import { useShops, useProducts, Shop } from "@/hooks/useMasterData";

/* ─── Types ─────────────────────────────────────────── */

type Role = "owner" | "manager" | "staff";

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
  showToast: (msg: string) => void;

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

  // New-transaction dropdown
  newMenu: boolean;
  setNewMenu: (v: boolean) => void;

  // Data
  dashboard: ReturnType<typeof useDashboard>["data"];
  wallets: Wallet[];
  invoicesData: ReturnType<typeof useInvoices>["data"];
  requests: MoneyRequest[];
  reportData: ReturnType<typeof useDailyReport>["data"];
  masterShops: ReturnType<typeof useShops>["data"];
  masterProducts: ReturnType<typeof useProducts>["data"];

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
  const [toastText, setToastText] = useState<string | null>(null);
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
  const { data: dashboard, refetch: refetchDash } = useDashboard(role);
  const { data: wallets = [], refetch: refetchWallets } = useWallets();
  const { data: invoicesData, refetch: refetchInvoices } = useInvoices();
  const { data: requests = [], refetch: refetchRequests } = useRequests(reqTab);
  const { data: reportData, refetch: refetchReport } = useDailyReport();
  const { data: masterShops = [] } = useShops();
  const { data: masterProducts = [] } = useProducts();

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

  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 3500);
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
    toastText,
    showToast,
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
    masterProducts,
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
