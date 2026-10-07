"use client";

import React, { useState, useMemo } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import CreateWalletModal from "@/components/CreateWalletModal";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useDashboardContext } from "../DashboardContext";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import {
  useTransactions,
  fetchInvoice,
  TRANSACTION_KINDS,
  type TransactionKind,
  type WalletTransaction,
} from "@/hooks/useTransactions";
import { WalletCardsSkeleton, Skeleton } from "@/components/ui/skeleton";

function formatDisplayTime(t?: string) {
  if (!t) return "—";
  const parts = t.split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return t;
}

/** YYYY-MM-DD in Phnom Penh, `offset` days from today */
function ppDate(offset = 0) {
  const d = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(d);
}

/** "07/10" from "2026-10-07" */
function shortDate(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

function getWalletBadge(code?: string | null, walletsList?: Array<{ code: string; name_km: string }>) {
  if (!code) {
    return {
      label: "ជំពាក់ (Unpaid)",
      bg: "#FEF3C7",
      color: "#92400E",
      border: "#FDE68A",
    };
  }
  const c = code.toLowerCase();
  const matched = walletsList?.find((w) => w.code.toLowerCase() === c);
  const defaultLabel = matched?.name_km || code.toUpperCase();

  if (c.startsWith("drawer")) {
    return {
      label: matched?.name_km || "ថតលុយ",
      bg: "#DCFCE7",
      color: "#15803D",
      border: "#BBF7D0",
    };
  }
  if (c.startsWith("petty")) {
    return {
      label: matched?.name_km || "លុយរាយ",
      bg: "#FEF9C3",
      color: "#A16207",
      border: "#FEF08A",
    };
  }
  if (c.startsWith("aba")) {
    return {
      label: matched?.name_km || "ABA Bank",
      bg: "#E0F2FE",
      color: "#0369A1",
      border: "#BAE6FD",
    };
  }
  if (c.startsWith("bakong")) {
    return {
      label: matched?.name_km || "Bakong KHQR",
      bg: "#FFE4E6",
      color: "#BE123C",
      border: "#FECDD3",
    };
  }
  if (c.startsWith("mgr")) {
    return {
      label: matched?.name_km || "លុយគ្រប់គ្រង",
      bg: "#F3E8FF",
      color: "#7E22CE",
      border: "#E9D5FF",
    };
  }
  return {
    label: defaultLabel,
    bg: "#F1F5F9",
    color: "#475569",
    border: "#E2E8F0",
  };
}

function getWalletAvatar(code?: string | null, category?: string) {
  const c = (code || "").toLowerCase();
  if (c === "aba") {
    return { bg: "#005C8A", color: "#FFFFFF", icon: "wallet" };
  }
  if (c === "bakong") {
    return { bg: "#CC1E27", color: "#FFFFFF", icon: "wallet" };
  }
  if (c === "drawer") {
    return { bg: "#0B5D4B", color: "#FFFFFF", icon: "wallet" };
  }
  if (c === "petty") {
    return { bg: "#D97706", color: "#FFFFFF", icon: "coins" };
  }
  if (category === "bank") {
    return { bg: "#0284C7", color: "#FFFFFF", icon: "wallet" };
  }
  return { bg: "#4B5563", color: "#FFFFFF", icon: "wallet" };
}

export default function WalletsPage() {
  const {
    visibleWallets,
    mergedWallets,
    wallets,
    isWalletsLoading,
    setIsTransferOpen,
    setIsMoneyInOpen,
    role,
    showToast,
    setSelectedInvoice,
  } = useDashboardContext();

  const [selectedGroupKey, setSelectedGroupKey] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const canCreateWallet = role === "owner";

  // Table Page Size
  const [pageSize, setPageSize] = useState(15);

  const totalAllUsd = mergedWallets.reduce((acc, g) => acc + Number(g.usd || 0), 0);
  const totalAllKhr = mergedWallets.reduce((acc, g) => acc + Number(g.khr || 0), 0);

  const selectedGroup =
    selectedGroupKey === "all" ? null : mergedWallets.find((g) => g.groupKey === selectedGroupKey);

  // ─── Money in / out (wallet transactions ledger) ───
  const today = ppDate();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [kind, setKind] = useState<TransactionKind | "">("");
  const [direction, setDirection] = useState<"in" | "out" | "">("");
  const deferredSearch = React.useDeferredValue(searchQuery);

  const { data: txData, isLoading: isTxLoading, isFetching: isTxFetching } = useTransactions({
    from: fromDate,
    to: toDate > fromDate ? toDate : fromDate,
    walletIds: selectedGroup ? selectedGroup.ids : undefined,
    kind,
    direction,
    q: deferredSearch,
  });
  const transactions = txData?.transactions ?? [];
  const totalCount = txData?.total ?? 0;
  const multiDay = fromDate !== toDate;

  const totalInUsd = Number(txData?.totals.in_usd ?? 0);
  const totalInKhr = Number(txData?.totals.in_khr ?? 0);
  const totalOutUsd = Number(txData?.totals.out_usd ?? 0);
  const totalOutKhr = Number(txData?.totals.out_khr ?? 0);

  const setRange = (from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
  };
  const quickRanges = [
    { label: "ថ្ងៃនេះ", from: today, to: today },
    { label: "ម្សិលមិញ", from: ppDate(-1), to: ppDate(-1) },
    { label: "៧ ថ្ងៃ", from: ppDate(-6), to: today },
    { label: "ខែនេះ", from: `${today.slice(0, 8)}01`, to: today },
  ];
  const rangeLabel =
    fromDate === today && toDate === today
      ? "ថ្ងៃនេះ"
      : multiDay
      ? `${shortDate(fromDate)} – ${shortDate(toDate)}`
      : shortDate(fromDate);

  const openTransaction = async (t: WalletTransaction) => {
    if (t.ref_type !== "invoice" || t.ref_id == null) return;
    try {
      setSelectedInvoice(await fetchInvoice(t.ref_id));
    } catch {
      showToast("មិនអាចបើកវិក្កយបត្របានទេ");
    }
  };

  const money = (t: WalletTransaction) => (t.currency === "KHR" ? formatKhr(t.amount) : formatUsd(t.amount));

  // DataTable column definitions
  const columns = useMemo<ColumnDef<WalletTransaction>[]>(
    () => [
      {
        accessorKey: "time",
        header: multiDay ? "ថ្ងៃ / ម៉ោង" : "ម៉ោង",
        cell: ({ row }) => (
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--ink-muted)",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {multiDay && <b style={{ color: "var(--ink)", marginRight: 6 }}>{shortDate(row.original.date)}</b>}
            {formatDisplayTime(row.original.time)}
          </span>
        ),
      },
      {
        id: "icon",
        header: "",
        cell: ({ row }) => {
          const isIn = row.original.direction === "in";
          return (
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: isIn ? "var(--income-soft)" : "var(--expense-soft)",
                color: isIn ? "var(--income)" : "var(--expense)",
                flexShrink: 0,
              }}
            >
              <BonchiIcon name={TRANSACTION_KINDS[row.original.kind]?.icon ?? (isIn ? "income" : "cart")} size={16} />
            </span>
          );
        },
      },
      {
        accessorKey: "description",
        header: "ពិពណ៌នា",
        cell: ({ row }) => {
          const t = row.original;
          const isVoided = t.invoice_status === "void" && t.kind !== "void";
          return (
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "14px",
                  color: isVoided ? "var(--ink-muted)" : "var(--ink)",
                  textDecoration: isVoided ? "line-through" : "none",
                }}
              >
                {t.description || TRANSACTION_KINDS[t.kind]?.label || "—"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                {TRANSACTION_KINDS[t.kind]?.label ?? t.kind}
                {t.invoice_no && ` · ${t.invoice_no}`}
                {isVoided && " · បានលុប"}
                {t.created_by_name && ` · ${t.created_by_name}`}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "wallet_code",
        header: "កាបូប",
        cell: ({ row }) => {
          const walletBadge = getWalletBadge(row.original.wallet_code, wallets);
          return (
            <span
              style={{
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                background: walletBadge.bg,
                color: walletBadge.color,
                border: `1px solid ${walletBadge.border}`,
                whiteSpace: "nowrap",
              }}
            >
              {row.original.wallet_name || walletBadge.label}
            </span>
          );
        },
      },
      {
        id: "income",
        header: () => <div style={{ textAlign: "right" }}>ចូល (In)</div>,
        cell: ({ row }) => (
          <div style={{ textAlign: "right" }}>
            {row.original.direction === "in" ? (
              <div className="bc-money bc-money-income" style={{ fontSize: "14px", fontWeight: 700 }}>
                +{money(row.original)}
              </div>
            ) : (
              <span style={{ color: "var(--line-strong)" }}>—</span>
            )}
          </div>
        ),
      },
      {
        id: "expense",
        header: () => <div style={{ textAlign: "right" }}>ចេញ (Out)</div>,
        cell: ({ row }) => (
          <div style={{ textAlign: "right" }}>
            {row.original.direction === "out" ? (
              <div className="bc-money bc-money-expense" style={{ fontSize: "14px", fontWeight: 700 }}>
                −{money(row.original)}
              </div>
            ) : (
              <span style={{ color: "var(--line-strong)" }}>—</span>
            )}
          </div>
        ),
      },
      {
        id: "balance",
        header: () => <div style={{ textAlign: "right" }}>សមតុល្យ</div>,
        cell: ({ row }) => {
          const t = row.original;
          if (t.balance_after == null) return <div style={{ textAlign: "right", color: "var(--line-strong)" }}>—</div>;
          const b = Number(t.balance_after);
          return (
            <div
              style={{
                textAlign: "right",
                fontSize: "13px",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: b < 0 ? "var(--expense)" : "var(--ink-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {t.currency === "KHR" ? formatKhr(b) : formatUsd(b)}
            </div>
          );
        },
      },
    ],
    [wallets, multiDay]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ─── Wallets Grid ────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            ជ្រើសរើសកាបូប · Select Wallet ({mergedWallets.length + 1})
          </div>
          {selectedGroupKey !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedGroupKey("all")}
              className="bc-badge bc-badge-info"
              style={{ cursor: "pointer", border: "none", fontSize: "12px", padding: "4px 10px" }}
            >
              🔄 បង្ហាញកាបូបទាំងអស់ (Show All)
            </button>
          )}
        </div>

        {isWalletsLoading && mergedWallets.length === 0 ? (
          <WalletCardsSkeleton count={6} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: "12px",
            }}
          >
            {/* Card: All Wallets (Overview) */}
            <button
              type="button"
              onClick={() => setSelectedGroupKey("all")}
              style={{
                cursor: "pointer",
                padding: "16px",
                borderRadius: "16px",
                border: selectedGroupKey === "all" ? "2px solid var(--brand)" : "1px solid var(--line)",
                background: selectedGroupKey === "all" ? "#F5FAF8" : "var(--surface-raised)",
                boxShadow: selectedGroupKey === "all" ? "0 4px 14px rgba(11, 93, 75, 0.12)" : "var(--shadow-card)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                textAlign: "left",
                transition: "all 0.18s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "var(--brand)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <BonchiIcon name="wallet" size={18} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "15px", lineHeight: "20px" }}>កាបូបទាំងអស់</div>
                    <div style={{ fontSize: "11px", color: "var(--ink-muted)", lineHeight: "16px" }}>All Wallets · សរុប</div>
                  </div>
                </div>
                {selectedGroupKey === "all" && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "6px",
                      background: "var(--brand-soft)",
                      color: "var(--brand)",
                    }}
                  >
                    កំពុងមើល
                  </span>
                )}
              </div>

              <div>
                <div style={{ fontSize: "21px", fontWeight: 800, lineHeight: "28px", color: selectedGroupKey === "all" ? "var(--brand)" : "var(--ink)" }}>
                  {formatUsd(totalAllUsd)}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-muted)" }}>
                  {formatKhr(totalAllKhr)}
                </div>
              </div>
            </button>

            {/* Cards: Merged Bank / Wallet Cards */}
            {mergedWallets.map((g) => {
              const isSelected = selectedGroupKey === g.groupKey;
              const avatar = getWalletAvatar(g.codes[0], g.category);

              return (
                <button
                  key={g.groupKey}
                  type="button"
                  onClick={() => setSelectedGroupKey(g.groupKey)}
                  style={{
                    cursor: "pointer",
                    padding: "16px",
                    borderRadius: "16px",
                    border: isSelected ? "2px solid var(--brand)" : "1px solid var(--line)",
                    background: isSelected ? "#F5FAF8" : "var(--surface-raised)",
                    boxShadow: isSelected ? "0 4px 14px rgba(11, 93, 75, 0.12)" : "var(--shadow-card)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    textAlign: "left",
                    transition: "all 0.18s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: avatar.bg,
                          color: avatar.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <BonchiIcon name={avatar.icon} size={18} />
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "15px", lineHeight: "20px" }}>{g.name_km}</div>
                        <div style={{ fontSize: "11px", color: "var(--ink-muted)", lineHeight: "16px" }}>
                          {g.name_en || g.codes.join(" / ")}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "6px",
                          background: "var(--brand-soft)",
                          color: "var(--brand)",
                        }}
                      >
                        កំពុងមើល
                      </span>
                    )}
                  </div>

                  <div>
                    {g.usd > 0 && g.khr > 0 ? (
                      <>
                        <div style={{ fontSize: "21px", fontWeight: 800, lineHeight: "28px", color: isSelected ? "var(--brand)" : "var(--ink)" }}>
                          {formatUsd(g.usd)}
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-muted)" }}>
                          {formatKhr(g.khr)}
                        </div>
                      </>
                    ) : g.khr > 0 ? (
                      <div style={{ fontSize: "21px", fontWeight: 800, lineHeight: "28px", color: isSelected ? "var(--brand)" : "var(--ink)" }}>
                        {formatKhr(g.khr)}
                      </div>
                    ) : (
                      <div style={{ fontSize: "21px", fontWeight: 800, lineHeight: "28px", color: isSelected ? "var(--brand)" : "var(--ink)" }}>
                        {formatUsd(g.usd)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Owner: Add New Wallet Card */}
            {canCreateWallet && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                style={{
                  cursor: "pointer",
                  padding: "16px",
                  borderRadius: "16px",
                  border: "2px dashed var(--line-strong)",
                  background: "transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  color: "var(--ink-muted)",
                  transition: "all 0.15s ease",
                  minHeight: "110px",
                }}
                className="hover:bg-[var(--surface-sunken)]"
              >
                <BonchiIcon name="plus" size={24} />
                <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--ink)" }}>បង្កើតកាបូបថ្មី</span>
                <span style={{ fontSize: "11px" }}>+ New wallet</span>
              </button>
            )}
          </div>
        )}
      </div>

      <CreateWalletModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(w) => {
          const baseKm = (w.name_km || "").replace(/\s*[\(\[].*?[\)\]]/gi, "").trim().toLowerCase();
          const groupKey = `${baseKm}__${w.category}`;
          setSelectedGroupKey(groupKey);
          showToast(`បានបង្កើតកាបូប "${w.name_km}" រួចរាល់!`);
        }}
      />

      {/* ─── Transactions Panel ─────────────────────────────────── */}
      <section className="w-panel" style={{ padding: "20px", borderRadius: "20px" }}>
        {/* Panel Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>ចលនាប្រាក់</span>
              <span style={{ color: "var(--brand)" }}>
                · {selectedGroup ? selectedGroup.name_km : "កាបូបទាំងអស់ (All Wallets)"}
              </span>
            </h2>
            <div style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "2px" }}>
              ប្រតិបត្តិការចូល-ចេញទាំងអស់ {totalCount} · {rangeLabel}
              {isTxFetching && !isTxLoading && <span style={{ marginLeft: 8 }}>កំពុងផ្ទុក…</span>}
            </div>
          </div>

          {/* Summary Badges & Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Total In Pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "10px",
                background: "var(--income-soft)",
                color: "var(--income)",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 600 }}>ចូល:</span>
              {totalInUsd > 0 && totalInKhr > 0 ? (
                <>
                  <span>+{formatUsd(totalInUsd)}</span>
                  <span style={{ fontSize: "11px" }}>({formatKhr(totalInKhr)})</span>
                </>
              ) : totalInKhr > 0 ? (
                <span>+{formatKhr(totalInKhr)}</span>
              ) : (
                <span>+{formatUsd(totalInUsd)}</span>
              )}
            </div>

            {/* Total Out Pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "10px",
                background: "var(--expense-soft)",
                color: "var(--expense)",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 600 }}>ចេញ:</span>
              {totalOutUsd > 0 && totalOutKhr > 0 ? (
                <>
                  <span>−{formatUsd(totalOutUsd)}</span>
                  <span style={{ fontSize: "11px" }}>({formatKhr(totalOutKhr)})</span>
                </>
              ) : totalOutKhr > 0 ? (
                <span>−{formatKhr(totalOutKhr)}</span>
              ) : (
                <span>−{formatUsd(totalOutUsd)}</span>
              )}
            </div>

            {/* Money In Button */}
            <button
              type="button"
              onClick={() => setIsMoneyInOpen(true)}
              className="bc-btn"
              style={{
                minHeight: "38px",
                height: "38px",
                padding: "0 14px",
                fontSize: "14px",
                borderRadius: "10px",
                background: "var(--income)",
                color: "#ffffff",
                borderColor: "var(--income)",
              }}
            >
              <BonchiIcon name="income" size={16} />
              + កត់ត្រាចំណូល
            </button>

            {/* Transfer Button */}
            <button
              type="button"
              onClick={() => setIsTransferOpen(true)}
              className="bc-btn bc-btn-primary"
              style={{ minHeight: "38px", height: "38px", padding: "0 14px", fontSize: "14px", borderRadius: "10px" }}
            >
              <BonchiIcon name="transfer" size={16} />
              ផ្ទេរប្រាក់
            </button>
          </div>
        </div>

        {/* Search Bar & Per-Page Selector */}
        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0 14px",
              height: "40px",
              borderRadius: "10px",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              width: "100%",
              maxWidth: "360px",
            }}
          >
            <BonchiIcon name="search" size={16} className="text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកតាមពិពណ៌នា លេខវិក្កយបត្រ ឬកាបូប..."
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "13px",
                width: "100%",
                color: "var(--ink)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-muted)" }}
              >
                <BonchiIcon name="x" size={14} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--ink-muted)" }}>
            <span>ក្នុងមួយទំព័រ:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Date range + type filters */}
        <div style={{ marginTop: "10px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", fontSize: "13px" }}>
          {quickRanges.map((r) => {
            const active = fromDate === r.from && toDate === r.to;
            return (
              <button
                key={r.label}
                type="button"
                onClick={() => setRange(r.from, r.to)}
                style={{
                  height: "34px",
                  padding: "0 12px",
                  borderRadius: "999px",
                  border: `1px solid ${active ? "var(--brand)" : "var(--line)"}`,
                  background: active ? "var(--brand)" : "var(--surface)",
                  color: active ? "#fff" : "var(--ink)",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {r.label}
              </button>
            );
          })}
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--ink-muted)" }}>
            <BonchiIcon name="calendar" size={15} />
            <input
              type="date"
              value={fromDate}
              max={today}
              onChange={(e) => e.target.value && setRange(e.target.value, e.target.value > toDate ? e.target.value : toDate)}
              style={{ height: "34px", padding: "0 8px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            />
            <span>ដល់</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={today}
              onChange={(e) => e.target.value && setToDate(e.target.value)}
              style={{ height: "34px", padding: "0 8px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            />
          </span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "in" | "out" | "")}
            style={{ height: "34px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontWeight: 600 }}
          >
            <option value="">ចូល និង ចេញ</option>
            <option value="in">ចូលប៉ុណ្ណោះ</option>
            <option value="out">ចេញប៉ុណ្ណោះ</option>
          </select>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as TransactionKind | "")}
            style={{ height: "34px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontWeight: 600 }}
          >
            <option value="">ប្រភេទទាំងអស់</option>
            {(Object.keys(TRANSACTION_KINDS) as TransactionKind[]).map((k) => (
              <option key={k} value={k}>
                {TRANSACTION_KINDS[k].label}
              </option>
            ))}
          </select>
        </div>
        {totalCount > transactions.length && (
          <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--ink-muted)" }}>
            បង្ហាញ {transactions.length} ចុងក្រោយ ក្នុងចំណោម {totalCount} — សូមបង្រួមថ្ងៃ ឬប្រភេទ ដើម្បីមើលបន្ថែម
          </div>
        )}

        {/* ─── Transactions Table (DataTable) ───────────────────── */}
        <div style={{ marginTop: "12px" }}>
          <DataTable
            columns={columns}
            data={transactions}
            isLoading={isTxLoading && !txData}
            onRowClick={openTransaction}
            pageSize={pageSize}
            emptyMessage={
              <div
                style={{
                  padding: "48px 16px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  color: "var(--ink-muted)",
                }}
              >
                <span
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "var(--surface-sunken)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--ink-muted)",
                  }}
                >
                  <BonchiIcon name="receipt" size={24} />
                </span>
                <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--ink)" }}>
                  មិនទាន់មានចលនាប្រាក់ទេ
                </div>
                <div style={{ fontSize: "13px" }}>
                  {searchQuery
                    ? "គ្មានទិន្នន័យត្រូវគ្នានឹងពាក្យស្វែងរកឡើយ"
                    : selectedGroup
                    ? `មិនទាន់មានប្រតិបត្តិការសម្រាប់ "${selectedGroup.name_km}" (${rangeLabel}) ទេ`
                    : `មិនទាន់មានប្រតិបត្តិការណាមួយ (${rangeLabel}) ទេ`}
                </div>
              </div>
            }
          />
        </div>
      </section>
    </div>
  );
}
