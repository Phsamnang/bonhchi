"use client";

import React, { useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import CreateWalletModal from "@/components/CreateWalletModal";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useDashboardContext } from "../DashboardContext";

export default function WalletsPage() {
  const { visibleWallets, wallets, invoicesData, setIsTransferOpen, role, showToast } = useDashboardContext();
  const [selectedWalletCode, setSelectedWalletCode] = useState<string>("drawer");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const canCreateWallet = role === "owner";

  const selectedWallet = wallets.find((w) => w.code === selectedWalletCode) || wallets[0];

  return (
    <>
      <div className="w-kpis">
        {visibleWallets.map((w) => {
          const isSelected = selectedWalletCode === w.code;
          return (
            <button
              key={w.id}
              type="button"
              className="w-kpi"
              onClick={() => setSelectedWalletCode(w.code)}
              style={{
                cursor: "pointer",
                outline: isSelected ? "2px solid var(--brand)" : "none",
                outlineOffset: "-2px",
              }}
            >
              <span className="p-row">
                <span
                  className={`bc-disc bc-disc-${w.category === "bank" ? "gold" : "brand"}`}
                  style={{ width: "36px", height: "36px" }}
                >
                  <BonchiIcon name="wallet" size={18} />
                </span>
                <span>
                  <span style={{ display: "block", fontWeight: 600 }}>{w.name_km}</span>
                  <span className="p-muted" style={{ display: "block" }}>
                    {w.name_en || w.code}
                  </span>
                </span>
              </span>
              <span className="w-kpi-a" style={{ marginTop: "8px" }}>
                {formatUsd(w.usd)}
              </span>
              <span className="w-kpi-b">{formatKhr(w.khr)}</span>
            </button>
          );
        })}

        {/* Owner: add a new wallet */}
        {canCreateWallet && (
          <button
            type="button"
            className="w-kpi"
            onClick={() => setIsCreateOpen(true)}
            style={{
              cursor: "pointer",
              border: "2px dashed var(--line-strong)",
              background: "transparent",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              color: "var(--ink-muted)",
            }}
          >
            <BonchiIcon name="plus" size={24} />
            <span style={{ fontWeight: 600 }}>បង្កើតកាបូបថ្មី</span>
            <span className="p-muted">New wallet</span>
          </button>
        )}
      </div>

      <CreateWalletModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(w) => {
          setSelectedWalletCode(w.code);
          showToast(`បានបង្កើតកាបូប "${w.name_km}" រួចរាល់!`);
        }}
      />

      <section className="w-panel" style={{ gap: 0 }}>
        <div className="flex items-center justify-between pb-3">
          <h2 style={{ margin: 0 }}>
            ចលនាប្រាក់ · {selectedWallet?.name_km || "ថតលុយ"} <small>ថ្ងៃនេះ</small>
          </h2>
          <button
            type="button"
            onClick={() => setIsTransferOpen(true)}
            className="bc-btn bc-btn-primary"
            style={{ minHeight: "40px" }}
          >
            <BonchiIcon name="transfer" size={18} />
            ផ្ទេរប្រាក់
          </button>
        </div>

        <div
          className="w-tx w-tx-h"
          style={{ gridTemplateColumns: "64px minmax(0, 1fr) 160px 160px" }}
        >
          <span>ម៉ោង</span>
          <span>ពិពណ៌នា</span>
          <span style={{ textAlign: "right" }}>ចូល (In)</span>
          <span style={{ textAlign: "right" }}>ចេញ (Out)</span>
        </div>

        {invoicesData?.invoices
          ?.filter((i) => i.wallet_code === selectedWalletCode)
          .map((m) => (
            <div
              key={m.id}
              className="w-tx"
              style={{
                gridTemplateColumns: "64px minmax(0, 1fr) 160px 160px",
                cursor: "default",
              }}
            >
              <span className="p-muted bc-num">{m.time}</span>
              <span style={{ fontWeight: 600 }}>
                {m.supplier_name} ({m.category || "ទូទៅ"})
              </span>
              <span className="bc-money bc-money-income" style={{ textAlign: "right" }}>
                {m.type === "income"
                  ? m.total_usd > 0
                    ? formatUsd(m.total_usd)
                    : formatKhr(m.total_khr)
                  : "—"}
              </span>
              <span className="bc-money bc-money-expense" style={{ textAlign: "right" }}>
                {m.type === "expense"
                  ? m.total_usd > 0
                    ? formatUsd(m.total_usd)
                    : formatKhr(m.total_khr)
                  : "—"}
              </span>
            </div>
          ))}
      </section>
    </>
  );
}
