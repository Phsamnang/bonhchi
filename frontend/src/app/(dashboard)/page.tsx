"use client";

import React from "react";
import { useRouter } from "next/navigation";
import BonchiIcon from "@/components/BonchiIcon";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useDashboardContext } from "./DashboardContext";

export default function HomePage() {
  const router = useRouter();
  const {
    dashboard,
    invoicesData,
    visibleWallets,
    unpaidInvoices,
    oweUsd,
    oweKhr,
    setSelectedInvoice,
    setIsCashCountOpen,
    setIsTransferOpen,
  } = useDashboardContext();

  return (
    <>
      {/* 4 KPIs Grid */}
      <div className="w-kpis">
        <div className="w-kpi">
          <span className="w-kpi-l">ចំណូលថ្ងៃនេះ · Income</span>
          <span className="w-kpi-a" style={{ color: "var(--income)" }}>
            +{formatUsd(dashboard?.income_today.usd ?? 0)}
          </span>
          <span className="w-kpi-b" style={{ color: "var(--income)" }}>
            +{formatKhr(dashboard?.income_today.khr ?? 0)}
          </span>
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

      {/* Two-Column Layout */}
      <div className="w-two">
        {/* Left: Recent Transactions */}
        <section className="w-panel" style={{ gap: 0 }}>
          <h2 style={{ marginBottom: "8px" }}>
            ប្រតិបត្តិការថ្ងៃនេះ <small>ចុចដើម្បីមើលលម្អិត</small>
          </h2>
          <div className="w-tx w-tx-h">
            <span></span>
            <span>ពិពណ៌នា</span>
            <span className="hide-m">កាបូប</span>
            <span className="hide-m" style={{ textAlign: "right" }}>
              ចំនួនទឹកប្រាក់
            </span>
            <span className="hide-m">ស្ថានភាព</span>
          </div>

          {invoicesData?.invoices && invoicesData.invoices.length > 0 ? (
            invoicesData.invoices.map((inv) => (
              <button
                key={inv.id}
                type="button"
                className="w-tx"
                onClick={() => setSelectedInvoice(inv)}
              >
                <span className={`bc-disc bc-disc-${inv.type === "income" ? "income" : "expense"}`}>
                  <BonchiIcon
                    name={inv.type === "income" ? "income" : inv.expense_kind === "small" ? "coins" : "cart"}
                    size={20}
                  />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="bc-row-t" style={{ display: "block" }}>
                    {inv.supplier_name}
                  </span>
                  <span className="bc-row-m" style={{ display: "block" }}>
                    {inv.category || "ទូទៅ"} · {inv.time || inv.date}
                  </span>
                </span>
                <span className="hide-m p-muted" style={{ fontSize: "14px" }}>
                  {(inv.wallet_code || "—").toUpperCase()}
                </span>
                <span className="w-amts">
                  {inv.total_usd > 0 && (
                    <span className={`bc-money bc-money-${inv.type}`}>
                      {inv.type === "expense" ? "-" : "+"}
                      {formatUsd(inv.total_usd)}
                    </span>
                  )}
                  {inv.total_khr > 0 && (
                    <span className={`bc-money bc-money-sm bc-money-${inv.type}`}>
                      {inv.type === "expense" ? "-" : "+"}
                      {formatKhr(inv.total_khr)}
                    </span>
                  )}
                </span>
                <span className="hide-m">
                  <span
                    className={`bc-badge ${
                      inv.status === "paid"
                        ? "bc-badge-success"
                        : inv.status === "void"
                        ? "bc-badge-danger bc-badge-void"
                        : "bc-badge-warning"
                    }`}
                  >
                    {(inv.status || "unpaid").toUpperCase()}
                  </span>
                </span>
              </button>
            ))
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
            {visibleWallets.map((w) => (
              <div
                key={w.id}
                className="p-row cursor-pointer hover:bg-[var(--surface-sunken)] p-1.5 rounded-xl transition"
                onClick={() => router.push("/wallets")}
                style={{ padding: "4px 0", borderBottom: "1px solid var(--line)" }}
              >
                <span
                  className={`bc-disc bc-disc-${w.category === "bank" ? "gold" : "brand"}`}
                  style={{ width: "36px", height: "36px" }}
                >
                  <BonchiIcon
                    name={w.code === "drawer" ? "wallet" : w.code === "petty" ? "coins" : "transfer"}
                    size={18}
                  />
                </span>
                <span className="p-grow">
                  <span style={{ display: "block", fontWeight: 600, fontSize: "15px" }}>
                    {w.name_km}
                  </span>
                  <span className="p-muted" style={{ display: "block" }}>
                    {w.name_en || w.code}
                  </span>
                </span>
                <span className="w-amts">
                  <span className="bc-money bc-money-sm">{formatUsd(w.usd)}</span>
                  <span className="bc-money bc-money-sm">{formatKhr(w.khr)}</span>
                </span>
              </div>
            ))}
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
            {unpaidInvoices.length > 0 ? (
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
