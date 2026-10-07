"use client";

import React from "react";
import { useRouter } from "next/navigation";
import BonchiIcon from "@/components/BonchiIcon";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useDashboardContext } from "./DashboardContext";
import { useTransactions, fetchInvoice, TRANSACTION_KINDS, type WalletTransaction } from "@/hooks/useTransactions";

import { KpiGridSkeleton, TransactionRowsSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const router = useRouter();
  const {
    dashboard,
    invoicesData,
    visibleWallets,
    mergedWallets,
    unpaidInvoices,
    oweUsd,
    oweKhr,
    isDashboardLoading,
    isWalletsLoading,
    isInvoicesLoading,
    setSelectedInvoice,
    setIsCashCountOpen,
    setIsTransferOpen,
    setIsMoneyInOpen,
  } = useDashboardContext();

  // Today's money in / out (every kind: income, expenses, salary, advances, transfers, voids)
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
  const { data: txData, isLoading: isTxLoading } = useTransactions({ from: today, to: today, limit: 10 });
  const todayTx = txData?.transactions ?? [];

  const openTransaction = async (t: WalletTransaction) => {
    if (t.ref_type !== "invoice" || t.ref_id == null) {
      router.push("/wallets");
      return;
    }
    try {
      setSelectedInvoice(await fetchInvoice(t.ref_id));
    } catch {
      router.push("/wallets");
    }
  };

  return (
    <>
      {/* 4 KPIs Grid */}
      {isDashboardLoading && !dashboard ? (
        <KpiGridSkeleton count={4} />
      ) : (
        <div className="w-kpis">
          <div className="w-kpi">
            <span className="w-kpi-l">ចំណូលថ្ងៃនេះ · Income</span>
            <span className="w-kpi-a" style={{ color: "var(--income)" }}>
              +{formatUsd(dashboard?.income_today.usd ?? 0)}
            </span>
            <span className="w-kpi-b" style={{ color: "var(--income)" }}>
              +{formatKhr(dashboard?.income_today.khr ?? 0)}
            </span>
            <button
              type="button"
              className="bc-btn bc-btn-secondary"
              onClick={() => setIsMoneyInOpen(true)}
              style={{ alignSelf: "flex-start", minHeight: "36px", marginTop: "4px", fontSize: "12px", color: "var(--income)" }}
            >
              + កត់ត្រាចំណូល
            </button>
          </div>

          <div className="w-kpi">
            <span className="w-kpi-l">ចំណាយថ្ងៃនេះ · Expense</span>
            <span className="w-kpi-a" style={{ color: "var(--expense)" }}>
              −{formatUsd(dashboard?.expense_today.usd ?? 0)}
            </span>
            <span className="w-kpi-b" style={{ color: "var(--expense)" }}>
              −{formatKhr(dashboard?.expense_today.khr ?? 0)}
            </span>
          </div>

          <div className={`w-kpi ${oweUsd > 0 || oweKhr > 0 ? "w-kpi-warn" : ""}`}>
            <span className="w-kpi-l" style={{ color: "var(--ink)", fontWeight: 600 }}>
              ត្រូវបង់បន្ថែម · Still to pay
            </span>
            <span className="w-kpi-a" style={{ color: "var(--warning)" }}>
              {formatUsd(oweUsd)}
            </span>
            <span className="w-kpi-b" style={{ color: "var(--warning)" }}>
              {formatKhr(oweKhr)}
            </span>
          </div>

          <div className={`w-kpi ${dashboard && !dashboard.closing_count_completed ? "w-kpi-warn" : ""}`}>
            <span className="w-kpi-l">រាប់លុយបិទហាង · Daily count</span>
            <span
              style={{
                font: "600 16px/26px var(--font-sans)",
                color: dashboard?.closing_count_completed ? "var(--success)" : "var(--warning)",
              }}
            >
              {dashboard?.closing_count_completed ? "បានរាប់រួចរាល់" : "មិនទាន់រាប់"}
            </span>
            <button
              type="button"
              className="bc-btn bc-btn-secondary"
              onClick={() => setIsCashCountOpen(true)}
              style={{ alignSelf: "flex-start", minHeight: "40px", marginTop: "4px" }}
            >
              រាប់ឥឡូវ
            </button>
          </div>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="w-two">
        {/* Left: Recent Transactions */}
        <section className="w-panel" style={{ gap: 0 }}>
          <h2 style={{ marginBottom: "8px" }}>
            ប្រតិបត្តិការថ្ងៃនេះ <small>ចូល-ចេញទាំងអស់ · ចុចដើម្បីមើលលម្អិត</small>
          </h2>
          <div className="w-tx w-tx-h">
            <span></span>
            <span>ពិពណ៌នា</span>
            <span className="hide-m">កាបូប</span>
            <span className="hide-m" style={{ textAlign: "right" }}>
              ចំនួនទឹកប្រាក់
            </span>
            <span className="hide-m">ប្រភេទ</span>
          </div>

          {isTxLoading && !txData ? (
            <TransactionRowsSkeleton count={6} />
          ) : todayTx.length > 0 ? (
            <>
              {todayTx.map((t) => {
                const dir = t.direction === "in" ? "income" : "expense";
                return (
                  <button key={t.id} type="button" className="w-tx" onClick={() => openTransaction(t)}>
                    <span className={`bc-disc bc-disc-${dir}`}>
                      <BonchiIcon name={TRANSACTION_KINDS[t.kind]?.icon ?? dir} size={20} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="bc-row-t" style={{ display: "block" }}>
                        {t.description || TRANSACTION_KINDS[t.kind]?.label}
                      </span>
                      <span className="bc-row-m" style={{ display: "block" }}>
                        {t.invoice_no ? `${t.invoice_no} · ` : ""}
                        {t.time.slice(0, 5)}
                      </span>
                    </span>
                    <span className="hide-m p-muted" style={{ fontSize: "14px" }}>
                      {t.wallet_name || t.wallet_code}
                    </span>
                    <span className="w-amts">
                      <span className={`bc-money bc-money-${dir}`}>
                        {t.direction === "out" ? "-" : "+"}
                        {t.currency === "KHR" ? formatKhr(t.amount) : formatUsd(t.amount)}
                      </span>
                    </span>
                    <span className="hide-m">
                      <span className={`bc-badge ${t.kind === "void" ? "bc-badge-danger" : dir === "income" ? "bc-badge-success" : "bc-badge-warning"}`}>
                        {TRANSACTION_KINDS[t.kind]?.label ?? t.kind}
                      </span>
                    </span>
                  </button>
                );
              })}
              {(txData?.total ?? 0) > todayTx.length && (
                <button
                  type="button"
                  className="bc-btn"
                  onClick={() => router.push("/wallets")}
                  style={{ marginTop: "10px", alignSelf: "center" }}
                >
                  មើលទាំងអស់ ({txData?.total}) →
                </button>
              )}
            </>
          ) : (
            <div className="p-muted" style={{ padding: "24px 0", textAlign: "center" }}>
              មិនទាន់មានប្រតិបត្តិការថ្មីៗទេ
            </div>
          )}
        </section>

        {/* Right: Wallets & Owed */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section className="w-panel">
            <h2>
              កាបូប <small>Wallets</small>
            </h2>
            {isWalletsLoading && mergedWallets.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "4px 0" }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-row" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                    <Skeleton className="h-9 w-9 shrink-0" circle />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              mergedWallets.map((w) => (
                <div
                  key={w.groupKey}
                  className="p-row cursor-pointer hover:bg-[var(--surface-sunken)] p-1.5 rounded-xl transition"
                  onClick={() => router.push("/wallets")}
                  style={{ padding: "4px 0", borderBottom: "1px solid var(--line)" }}
                >
                  <span
                    className={`bc-disc bc-disc-${w.category === "bank" ? "gold" : "brand"}`}
                    style={{ width: "36px", height: "36px" }}
                  >
                    <BonchiIcon
                      name={w.codes.includes("drawer") ? "wallet" : w.codes.includes("petty") ? "coins" : "transfer"}
                      size={18}
                    />
                  </span>
                  <span className="p-grow">
                    <span style={{ display: "block", fontWeight: 600, fontSize: "15px" }}>
                      {w.name_km}
                    </span>
                    <span className="p-muted" style={{ display: "block" }}>
                      {w.name_en || w.codes.join(" / ")}
                    </span>
                  </span>
                  <span className="w-amts">
                    <span className="bc-money bc-money-sm">{formatUsd(w.usd)}</span>
                    <span className="bc-money bc-money-sm">{formatKhr(w.khr)}</span>
                  </span>
                </div>
              ))
            )}
            <button
              type="button"
              onClick={() => setIsTransferOpen(true)}
              className="bc-btn bc-btn-secondary"
              style={{ minHeight: "40px", marginTop: "4px" }}
            >
              <BonchiIcon name="transfer" size={18} />
              ផ្ទេរប្រាក់រវាងកាបូប
            </button>
          </section>

          <section className="w-panel">
            <h2>
              នៅជំពាក់ហាង <small>Owed to shops</small>
            </h2>
            {isInvoicesLoading && !invoicesData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "6px 0" }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-kv">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : unpaidInvoices.length > 0 ? (
              unpaidInvoices.map((inv) => (
                <div key={inv.id} className="p-kv">
                  <span>{inv.supplier_name}</span>
                  <b className="bc-num">
                    {inv.total_usd > 0
                      ? formatUsd(inv.total_usd - inv.paid_usd)
                      : formatKhr(inv.total_khr - inv.paid_khr)}
                  </b>
                </div>
              ))
            ) : (
              <div className="p-muted" style={{ padding: "8px 0" }}>
                គ្មានការជំពាក់នៅសល់ទេ (All settled)
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
