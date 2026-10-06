"use client";

import React, { useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import CreateWalletModal from "@/components/CreateWalletModal";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useDashboardContext } from "../DashboardContext";

function formatDisplayTime(t?: string) {
  if (!t) return "—";
  const parts = t.split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return t;
}

function getWalletBadge(code?: string | null) {
  if (!code) {
    return {
      label: "ជំពាក់ (Unpaid)",
      bg: "#FEF3C7",
      color: "#92400E",
      border: "#FDE68A",
    };
  }
  const c = code.toLowerCase();
  switch (c) {
    case "drawer":
      return {
        label: "ថតលុយ",
        bg: "#DCFCE7",
        color: "#15803D",
        border: "#BBF7D0",
      };
    case "petty":
      return {
        label: "លុយរាយ",
        bg: "#FEF9C3",
        color: "#A16207",
        border: "#FEF08A",
      };
    case "aba":
      return {
        label: "ABA Bank",
        bg: "#E0F2FE",
        color: "#0369A1",
        border: "#BAE6FD",
      };
    case "bakong":
      return {
        label: "Bakong KHQR",
        bg: "#FFE4E6",
        color: "#BE123C",
        border: "#FECDD3",
      };
    default:
      return {
        label: code.toUpperCase(),
        bg: "#F1F5F9",
        color: "#475569",
        border: "#E2E8F0",
      };
  }
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
    wallets,
    invoicesData,
    setIsTransferOpen,
    role,
    showToast,
    setSelectedInvoice,
  } = useDashboardContext();

  const [selectedWalletCode, setSelectedWalletCode] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const canCreateWallet = role === "owner";

  const totalAllUsd = visibleWallets.reduce((acc, w) => acc + Number(w.usd || 0), 0);
  const totalAllKhr = visibleWallets.reduce((acc, w) => acc + Number(w.khr || 0), 0);

  const selectedWallet =
    selectedWalletCode === "all" ? null : wallets.find((w) => w.code === selectedWalletCode);

  const filteredInvoices = (invoicesData?.invoices || []).filter((i) => {
    if (selectedWalletCode !== "all" && i.wallet_code !== selectedWalletCode) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSupplier = (i.supplier_name || "").toLowerCase().includes(q);
      const matchCategory = (i.category || "").toLowerCase().includes(q);
      const matchInvoiceNo = (i.invoice_no || "").toLowerCase().includes(q);
      const matchWallet = (i.wallet_code || "").toLowerCase().includes(q);
      if (!matchSupplier && !matchCategory && !matchInvoiceNo && !matchWallet) {
        return false;
      }
    }
    return true;
  });

  const totalInUsd = filteredInvoices
    .filter((i) => i.type === "income" && i.status !== "void")
    .reduce((sum, i) => sum + Number(i.total_usd || 0), 0);
  const totalInKhr = filteredInvoices
    .filter((i) => i.type === "income" && i.status !== "void")
    .reduce((sum, i) => sum + Number(i.total_khr || 0), 0);

  const totalOutUsd = filteredInvoices
    .filter((i) => i.type === "expense" && i.status !== "void")
    .reduce((sum, i) => sum + Number(i.total_usd || 0), 0);
  const totalOutKhr = filteredInvoices
    .filter((i) => i.type === "expense" && i.status !== "void")
    .reduce((sum, i) => sum + Number(i.total_khr || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ─── Wallets Grid ────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            ជ្រើសរើសកាបូប · Select Wallet ({visibleWallets.length + 1})
          </div>
          {selectedWalletCode !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedWalletCode("all")}
              className="bc-badge bc-badge-info"
              style={{ cursor: "pointer", border: "none", fontSize: "12px", padding: "4px 10px" }}
            >
              🔄 បង្ហាញកាបូបទាំងអស់ (Show All)
            </button>
          )}
        </div>

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
            onClick={() => setSelectedWalletCode("all")}
            style={{
              cursor: "pointer",
              padding: "16px",
              borderRadius: "16px",
              border: selectedWalletCode === "all" ? "2px solid var(--brand)" : "1px solid var(--line)",
              background: selectedWalletCode === "all" ? "#F5FAF8" : "var(--surface-raised)",
              boxShadow: selectedWalletCode === "all" ? "0 4px 14px rgba(11, 93, 75, 0.12)" : "var(--shadow-card)",
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
              {selectedWalletCode === "all" && (
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
              <div style={{ fontSize: "21px", fontWeight: 800, lineHeight: "28px", color: selectedWalletCode === "all" ? "var(--brand)" : "var(--ink)" }}>
                {formatUsd(totalAllUsd)}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-muted)" }}>
                {formatKhr(totalAllKhr)}
              </div>
            </div>
          </button>

          {/* Cards: Individual Wallets */}
          {visibleWallets.map((w) => {
            const isSelected = selectedWalletCode === w.code;
            const avatar = getWalletAvatar(w.code, w.category);

            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWalletCode(w.code)}
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
                      <div style={{ fontWeight: 700, fontSize: "15px", lineHeight: "20px" }}>{w.name_km}</div>
                      <div style={{ fontSize: "11px", color: "var(--ink-muted)", lineHeight: "16px" }}>
                        {w.name_en || w.code}
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
                  <div style={{ fontSize: "21px", fontWeight: 800, lineHeight: "28px", color: isSelected ? "var(--brand)" : "var(--ink)" }}>
                    {formatUsd(w.usd)}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-muted)" }}>
                    {formatKhr(w.khr)}
                  </div>
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
      </div>

      <CreateWalletModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(w) => {
          setSelectedWalletCode(w.code);
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
                · {selectedWallet ? selectedWallet.name_km : "កាបូបទាំងអស់ (All Wallets)"}
              </span>
            </h2>
            <div style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "2px" }}>
              បង្ហាញប្រតិបត្តិការសរុប {filteredInvoices.length} ក្នុងថ្ងៃនេះ
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
              <span>+{formatUsd(totalInUsd)}</span>
              {totalInKhr > 0 && <span style={{ fontSize: "11px" }}>({formatKhr(totalInKhr)})</span>}
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
              <span>−{formatUsd(totalOutUsd)}</span>
              {totalOutKhr > 0 && <span style={{ fontSize: "11px" }}>({formatKhr(totalOutKhr)})</span>}
            </div>

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

        {/* Search Bar */}
        <div style={{ marginTop: "4px" }}>
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
              placeholder="ស្វែងរកតាមឈ្មោះ ឬប្រភេទ..."
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
        </div>

        {/* ─── Transactions Table ───────────────────────────────── */}
        <div style={{ marginTop: "4px" }}>
          {/* Table Header (Desktop) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "72px 36px minmax(180px, 1.4fr) 130px 100px 130px 130px",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--ink-muted)",
              background: "var(--surface-sunken)",
              borderRadius: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            <span>ម៉ោង</span>
            <span></span>
            <span>ពិពណ៌នា / អ្នកផ្គត់ផ្គង់</span>
            <span>កាបូប</span>
            <span>ស្ថានភាព</span>
            <span style={{ textAlign: "right" }}>ចូល (In)</span>
            <span style={{ textAlign: "right" }}>ចេញ (Out)</span>
          </div>

          {/* Table Rows */}
          {filteredInvoices.map((m) => {
            const walletBadge = getWalletBadge(m.wallet_code);
            const isIncome = m.type === "income";
            const isVoided = m.status === "void";

            return (
              <div
                key={m.id}
                onClick={() => setSelectedInvoice(m)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "72px 36px minmax(180px, 1.4fr) 130px 100px 130px 130px",
                  alignItems: "center",
                  gap: "12px",
                  padding: "13px 14px",
                  borderBottom: "1px solid var(--line)",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                className="hover:bg-[var(--surface-sunken)]"
              >
                {/* 1. Time Column (Safely formatted to HH:mm) */}
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--ink-muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatDisplayTime(m.time)}
                </span>

                {/* 2. Type Icon */}
                <span
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "999px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isIncome ? "var(--income-soft)" : "var(--expense-soft)",
                    color: isIncome ? "var(--income)" : "var(--expense)",
                  }}
                >
                  <BonchiIcon
                    name={isIncome ? "income" : m.expense_kind === "small" ? "coins" : "cart"}
                    size={16}
                  />
                </span>

                {/* 3. Description & Category */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: isVoided ? "var(--ink-muted)" : "var(--ink)", textDecoration: isVoided ? "line-through" : "none" }}>
                    {m.supplier_name}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                    {m.category || "ទូទៅ"} · {m.invoice_no}
                  </div>
                </div>

                {/* 4. Wallet Badge */}
                <div>
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
                    {walletBadge.label}
                  </span>
                </div>

                {/* 5. Status Badge */}
                <div>
                  <span
                    className={`bc-badge ${
                      m.status === "paid"
                        ? "bc-badge-success"
                        : m.status === "void"
                        ? "bc-badge-danger bc-badge-void"
                        : "bc-badge-warning"
                    }`}
                    style={{ fontSize: "11px", height: "22px" }}
                  >
                    {(m.status || "unpaid").toUpperCase()}
                  </span>
                </div>

                {/* 6. Income Amount (In) */}
                <div style={{ textAlign: "right" }}>
                  {isIncome && !isVoided ? (
                    <div>
                      <div className="bc-money bc-money-income" style={{ fontSize: "15px", fontWeight: 700 }}>
                        +{formatUsd(m.total_usd)}
                      </div>
                      {m.total_khr > 0 && (
                        <div style={{ fontSize: "11px", color: "var(--income)", fontWeight: 600 }}>
                          +{formatKhr(m.total_khr)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "var(--line-strong)" }}>—</span>
                  )}
                </div>

                {/* 7. Expense Amount (Out) */}
                <div style={{ textAlign: "right" }}>
                  {!isIncome && !isVoided ? (
                    <div>
                      <div className="bc-money bc-money-expense" style={{ fontSize: "15px", fontWeight: 700 }}>
                        −{formatUsd(m.total_usd)}
                      </div>
                      {m.total_khr > 0 && (
                        <div style={{ fontSize: "11px", color: "var(--expense)", fontWeight: 600 }}>
                          −{formatKhr(m.total_khr)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "var(--line-strong)" }}>—</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {filteredInvoices.length === 0 && (
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
                  : selectedWallet
                  ? `មិនទាន់មានប្រតិបត្តិការសម្រាប់ "${selectedWallet.name_km}" ក្នុងថ្ងៃនេះទេ`
                  : "មិនទាន់មានប្រតិបត្តិការណាមួយក្នុងថ្ងៃនេះទេ"}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
