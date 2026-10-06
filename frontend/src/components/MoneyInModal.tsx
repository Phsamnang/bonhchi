"use client";

import React, { useState } from "react";
import { useMoneyInMutation } from "@/hooks/useInvoices";
import BonchiIcon from "./BonchiIcon";
import { formatUsd, formatKhr } from "@/lib/utils";

interface MoneyInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  wallets: Array<{
    id: string | number;
    code: string;
    name_km: string;
    name_en?: string;
    category?: string;
    current_usd?: number | string;
    current_khr?: number | string;
  }>;
}

const TABLE_PRESETS = [
  "តុ 1",
  "តុ 2",
  "តុ 3",
  "តុ 4",
  "តុ 5",
  "តុ 6",
  "តុ 7",
  "តុ 8",
  "តុ 9",
  "តុ 10",
  "តុ 11",
  "តុ 12",
  "តុ VIP 1",
  "តុ VIP 2",
  "ខ្ចប់ (Takeaway)",
  "Delivery",
];

export default function MoneyInModal({
  isOpen,
  onClose,
  onSuccess,
  wallets,
}: MoneyInModalProps) {
  const [tableName, setTableName] = useState<string>("តុ 1");
  const [walletCode, setWalletCode] = useState<string>(() => wallets[0]?.code || "drawer");
  const [usdAmount, setUsdAmount] = useState<string>("");
  const [khrAmount, setKhrAmount] = useState<string>("");
  const [refNo, setRefNo] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const mutation = useMoneyInMutation();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Set default wallet to drawer if found
  React.useEffect(() => {
    if (wallets.length > 0 && !wallets.some((w) => w.code === walletCode)) {
      const drawer = wallets.find((w) => w.code === "drawer");
      setWalletCode(drawer ? drawer.code : wallets[0].code);
    }
  }, [wallets, walletCode]);

  if (!isOpen) return null;

  const numUsd = parseFloat(usdAmount) || 0;
  const numKhr = parseFloat(khrAmount) || 0;
  const hasValidAmount = numUsd > 0 || numKhr > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidAmount) {
      setErrorMsg("សូមបញ្ចូលចំនួនទឹកប្រាក់យ៉ាងហោចណាស់មួយ (USD ឬ KHR)");
      return;
    }

    const trimmedTable = tableName.trim();
    if (!trimmedTable) {
      setErrorMsg("សូមជ្រើសរើស ឬ បញ្ចូលឈ្មោះតុ");
      return;
    }

    setErrorMsg("");

    try {
      await mutation.mutateAsync({
        date,
        table_name: trimmedTable,
        wallet_code: walletCode,
        amount_usd: numUsd > 0 ? numUsd : undefined,
        amount_khr: numKhr > 0 ? numKhr : undefined,
        source_name: trimmedTable,
        category_name: "ចំណូលលក់",
        reference_no: refNo.trim() || undefined,
        note: note.trim() || undefined,
      });

      // Reset form
      setUsdAmount("");
      setKhrAmount("");
      setRefNo("");
      setNote("");
      setErrorMsg("");

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "បរាជ័យក្នុងការកត់ត្រាចំណូល");
    }
  };

  const getWalletIcon = (code: string) => {
    if (code.includes("drawer")) return "wallet";
    if (code.includes("aba") || code.includes("bank")) return "bank";
    if (code.includes("bakong")) return "coins";
    return "wallet";
  };

  return (
    <>
      {/* Dimmed Backdrop */}
      <div className="p-scrim" onClick={onClose} aria-label="បិទ Close" />

      {/* Sheet / Screen Modal Container */}
      <div
        className="p-sheet p-screen"
        style={{
          maxHeight: "92vh",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          zIndex: 1000,
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* App Bar Header */}
        <header
          className="bc-appbar bc-appbar-back"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
            <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="ត្រឡប់ Back">
              <BonchiIcon name="back" />
            </button>
            <div className="bc-appbar-t">
              <b>កត់ត្រាចំណូលពីតុ · Table Sales</b>
              <small>ជ្រើសរើសតុ បញ្ចូលទឹកប្រាក់ និង កាបូបទទួល</small>
            </div>
          </div>
          <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="បិទ Close">
            <BonchiIcon name="x" size={20} />
          </button>
        </header>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          <div
            className="p-body"
            style={{
              gap: "18px",
              padding: "16px 20px",
              overflowY: "auto",
              flex: 1,
            }}
          >
            {/* Error Banner */}
            {errorMsg && (
              <div className="bc-banner bc-banner-danger" role="alert">
                <BonchiIcon name="alert" size={18} />
                <div className="bc-banner-main">{errorMsg}</div>
              </div>
            )}

            {/* 1. SELECT TABLE SECTION */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <label className="bc-field-label" style={{ margin: 0, fontWeight: 700 }}>
                  ១. ជ្រើសរើសឈ្មោះតុ · Select Table <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                {tableName && (
                  <span style={{ fontSize: "12px", color: "var(--income)", fontWeight: 600 }}>
                    បានជ្រើសរើស: {tableName}
                  </span>
                )}
              </div>

              {/* Table Chips Grid */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginBottom: "10px",
                }}
              >
                {TABLE_PRESETS.map((t) => {
                  const isSelected = tableName === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTableName(t)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? "1.5px solid var(--income)" : "1px solid var(--line)",
                        background: isSelected ? "var(--income-bg, rgba(16, 185, 129, 0.12))" : "var(--surface)",
                        color: isSelected ? "var(--income)" : "var(--ink)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Custom Table Input */}
              <div className="bc-input" style={{ display: "flex", alignItems: "center", position: "relative" }}>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="ឬ វាយបញ្ចូលឈ្មោះតុផ្សេងទៀត (ឧ. តុ VIP 3, ជាន់លើ...)"
                  style={{ width: "100%", paddingRight: "36px" }}
                  required
                />
                {tableName && (
                  <button
                    type="button"
                    onClick={() => setTableName("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      background: "transparent",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="លុបឈ្មោះតុ Clear"
                  >
                    <BonchiIcon name="x" size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* 2. ENTER AMOUNT SECTION */}
            <div>
              <label className="bc-field-label" style={{ marginBottom: "8px", display: "block", fontWeight: 700 }}>
                ២. ចំនួនទឹកប្រាក់ទទួលបាន · Amount Received <span style={{ color: "var(--danger)" }}>*</span>
                <small style={{ color: "var(--muted)", marginLeft: "6px", fontWeight: 400 }}>
                  (អាចបញ្ចូលទាំង ដុល្លារ ឬ រៀល)
                </small>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {/* USD Card */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: numUsd > 0 ? "2px solid var(--income)" : "1px solid var(--line)",
                    background: numUsd > 0 ? "var(--surface-raised, #ffffff)" : "var(--surface)",
                    boxShadow: numUsd > 0 ? "0 2px 8px rgba(16, 185, 129, 0.1)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                      ដុល្លារ · USD ($)
                    </span>
                    {numUsd > 0 && (
                      <button
                        type="button"
                        onClick={() => setUsdAmount("")}
                        style={{ border: 0, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "11px" }}
                      >
                        លុប
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--income)" }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={usdAmount}
                      onChange={(e) => setUsdAmount(e.target.value)}
                      style={{
                        width: "100%",
                        border: 0,
                        outline: "none",
                        fontSize: "20px",
                        fontWeight: 700,
                        background: "transparent",
                        color: "var(--ink)",
                      }}
                    />
                  </div>
                </div>

                {/* KHR Card */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: numKhr > 0 ? "2px solid var(--income)" : "1px solid var(--line)",
                    background: numKhr > 0 ? "var(--surface-raised, #ffffff)" : "var(--surface)",
                    boxShadow: numKhr > 0 ? "0 2px 8px rgba(16, 185, 129, 0.1)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                      រៀល · KHR (៛)
                    </span>
                    {numKhr > 0 && (
                      <button
                        type="button"
                        onClick={() => setKhrAmount("")}
                        style={{ border: 0, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "11px" }}
                      >
                        លុប
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--income)" }}>៛</span>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      placeholder="0"
                      value={khrAmount}
                      onChange={(e) => setKhrAmount(e.target.value)}
                      style={{
                        width: "100%",
                        border: 0,
                        outline: "none",
                        fontSize: "20px",
                        fontWeight: 700,
                        background: "transparent",
                        color: "var(--ink)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. SELECT TARGET WALLET SECTION */}
            <div>
              <label className="bc-field-label" style={{ marginBottom: "8px", display: "block", fontWeight: 700 }}>
                ៣. ដាក់ចូលកាបូបណា? · Deposit Into Which Wallet <span style={{ color: "var(--danger)" }}>*</span>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                {wallets.map((w) => {
                  const isSelected = walletCode === w.code;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWalletCode(w.code)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: isSelected ? "2px solid var(--income)" : "1px solid var(--line)",
                        background: isSelected ? "var(--income-bg, rgba(16, 185, 129, 0.08))" : "var(--surface)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isSelected ? "var(--income)" : "var(--line)",
                          color: isSelected ? "#ffffff" : "var(--ink)",
                          flexShrink: 0,
                        }}
                      >
                        <BonchiIcon name={getWalletIcon(w.code)} size={18} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: isSelected ? 700 : 600, color: "var(--ink)" }}>
                          {w.name_km}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {formatUsd((w as any).usd ?? w.current_usd)} · {formatKhr((w as any).khr ?? w.current_khr)}
                        </div>
                      </div>
                      {isSelected && (
                        <span style={{ color: "var(--income)", display: "flex", flexShrink: 0 }}>
                          <BonchiIcon name="check" size={18} strokeWidth={2.5} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. REFERENCE & DATE DETAILS */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
              <label className="bc-field">
                <span className="bc-field-label">លេខវិក្កយបត្រ POS / Bill # (Optional)</span>
                <span className="bc-input">
                  <input
                    type="text"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    placeholder="ឧ. #INV-0012 ឬ Shift 1"
                  />
                </span>
              </label>

              <label className="bc-field">
                <span className="bc-field-label">កាលបរិច្ឆេទ · Date</span>
                <span className="bc-input">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </span>
              </label>
            </div>

            {/* 5. OPTIONAL NOTE */}
            <label className="bc-field">
              <span className="bc-field-label">កំណត់ចំណាំបន្ថែម · Note (Optional)</span>
              <span className="bc-input">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ចំណាំបន្ថែម (ឧ. ភ្ញៀវបង់លុយសុទ្ធ និង QR)..."
                />
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div
            className="p-foot"
            style={{
              padding: "14px 20px",
              borderTop: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              background: "var(--surface-raised)",
            }}
          >
            <div>
              {hasValidAmount && (
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--income)" }}>
                  សរុប: {numUsd > 0 ? `$${numUsd.toFixed(2)}` : ""} {numUsd > 0 && numKhr > 0 ? " + " : ""} {numKhr > 0 ? `${numKhr.toLocaleString()} ៛` : ""}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="bc-btn bc-btn-secondary"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                បោះបង់ Cancel
              </button>
              <button
                type="submit"
                className="bc-btn bc-btn-primary"
                disabled={mutation.isPending || !hasValidAmount || !tableName.trim()}
                style={{
                  background: "var(--income)",
                  borderColor: "var(--income)",
                  color: "#ffffff",
                  minWidth: "160px",
                  fontWeight: 600,
                }}
              >
                {mutation.isPending ? "កំពុងកត់ត្រា..." : "រក្សាទុកចំណូល Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
