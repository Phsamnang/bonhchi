"use client";

import React, { useState } from "react";
import BonchiIcon from "./BonchiIcon";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useCreateWalletMutation, Wallet, WalletType } from "@/hooks/useWallets";

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (wallet: Wallet) => void;
}

type Category = "cash" | "bank";

const WALLET_TYPES: Array<{
  value: WalletType;
  km: string;
  en: string;
  category: Category;
  icon: string;
}> = [
  { value: "bank", km: "ធនាគារ / QR", en: "Bank / KHQR", category: "bank", icon: "wallet" },
  { value: "cash", km: "សាច់ប្រាក់", en: "Cash", category: "cash", icon: "coins" },
];

const CATEGORY_LABEL: Record<Category, string> = {
  bank: "ធនាគារ · Bank",
  cash: "សាច់ប្រាក់ · Cash",
};

export default function CreateWalletModal({ isOpen, onClose, onCreated }: CreateWalletModalProps) {
  const [nameKm, setNameKm] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [type, setType] = useState<WalletType>("bank");
  const [openingUsd, setOpeningUsd] = useState("");
  const [openingKhr, setOpeningKhr] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const mutation = useCreateWalletMutation();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedType = WALLET_TYPES.find((t) => t.value === type) || WALLET_TYPES[0];
  const usd = Number(openingUsd) || 0;
  const khr = Number(openingKhr) || 0;
  const canSubmit = nameKm.trim().length > 0 && !mutation.isPending;

  const reset = () => {
    setNameKm("");
    setNameEn("");
    setType("bank");
    setOpeningUsd("");
    setOpeningKhr("");
    setErrorMsg("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nameKm.trim()) {
      setErrorMsg("សូមបញ្ចូលឈ្មោះកាបូប (Khmer name is required)");
      return;
    }

    setErrorMsg("");
    try {
      const wallet = await mutation.mutateAsync({
        name_km: nameKm.trim(),
        name_en: nameEn.trim() || undefined,
        type,
        category: type === "bank" ? "bank" : "cash",
        opening_usd: usd,
        opening_khr: khr,
      });
      reset();
      onCreated?.(wallet);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "មិនអាចបង្កើតកាបូបបានទេ");
    }
  };

  return (
    <>
      <div className="p-scrim" onClick={handleClose} aria-label="បិទ Close" />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label="បង្កើតកាបូបថ្មី"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(740px, 94vw)",
          background: "var(--surface-raised)",
          borderRadius: "20px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.28)",
          border: "1px solid var(--line)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modern Modal Header */}
        <header
          style={{
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "var(--brand-soft)",
                color: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BonchiIcon name="wallet" size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>បង្កើតកាបូបថ្មី</span>
                <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink-muted)" }}>· New Wallet / Account</span>
              </div>
              <div style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "2px" }}>
                បន្ថែមថតលុយ សាច់ប្រាក់ ឬគណនីធនាគារ / QR សម្រាប់ដំណើរការអាជីវកម្ម
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="បិទ Close"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--surface-sunken)",
              border: "1px solid var(--line)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-muted)",
              transition: "all 0.15s ease",
            }}
          >
            <BonchiIcon name="x" size={18} />
          </button>
        </header>

        {/* Modal Body without scrollbars */}
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflowX: "hidden",
            overflowY: "visible",
            boxSizing: "border-box",
          }}
        >
          {errorMsg && (
            <div className="bc-banner bc-banner-danger" role="alert" style={{ margin: 0 }}>
              <BonchiIcon name="alert" size={20} />
              <div className="bc-banner-main">{errorMsg}</div>
            </div>
          )}

          {/* Row 1: Name Inputs (2 Columns) */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "16px" }}>
            <label className="bc-field" style={{ margin: 0, minWidth: 0 }}>
              <span className="bc-field-label">
                <span>ឈ្មោះកាបូប (ខ្មែរ) <strong style={{ color: "var(--danger)" }}>*</strong></span>
                <small>Khmer name</small>
              </span>
              <span className="bc-input" style={{ boxSizing: "border-box", width: "100%" }}>
                <BonchiIcon name="wallet" size={18} />
                <input
                  value={nameKm}
                  onChange={(e) => setNameKm(e.target.value)}
                  placeholder="ឧ. Wing, ACLEDA, ថតលុយទី 2"
                  aria-label="ឈ្មោះកាបូប"
                  style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
                  autoFocus
                />
              </span>
            </label>

            <label className="bc-field" style={{ margin: 0, minWidth: 0 }}>
              <span className="bc-field-label">
                <span>ឈ្មោះជាអង់គ្លេស</span>
                <small>English name · optional</small>
              </span>
              <span className="bc-input" style={{ boxSizing: "border-box", width: "100%" }}>
                <input
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Wing Bank, Main Drawer"
                  aria-label="English name"
                  style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
                />
              </span>
            </label>
          </div>

          {/* Row 2: Wallet Type Selection (Bank vs Cash only) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
                ប្រភេទកាបូប <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink-muted)" }}>Type</span>
              </span>
              <span style={{ fontSize: "12px", color: "var(--brand)", fontWeight: 600 }}>
                {CATEGORY_LABEL[selectedType.category]}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {WALLET_TYPES.map((wt) => {
                const isSelected = type === wt.value;
                return (
                  <button
                    key={wt.value}
                    type="button"
                    onClick={() => setType(wt.value)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "14px 16px",
                      borderRadius: "14px",
                      border: isSelected ? "2px solid var(--brand)" : "1.5px solid var(--line)",
                      background: isSelected ? "var(--brand-soft)" : "var(--surface)",
                      color: isSelected ? "var(--brand)" : "var(--ink)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      boxSizing: "border-box",
                      boxShadow: isSelected ? "0 4px 12px rgba(11, 93, 75, 0.12)" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: isSelected ? "var(--brand)" : "var(--surface-sunken)",
                        color: isSelected ? "var(--on-brand)" : "var(--ink-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <BonchiIcon name={wt.icon} size={20} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: isSelected ? 700 : 600,
                          lineHeight: 1.3,
                        }}
                      >
                        {wt.km}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: isSelected ? "var(--brand)" : "var(--ink-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {wt.en}
                      </div>
                    </div>
                    {isSelected && (
                      <span
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "var(--brand)",
                          color: "var(--on-brand)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "bold",
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Opening Balances (2 Columns) */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "16px" }}>
            <div className="bc-field" style={{ margin: 0, minWidth: 0 }}>
              <span className="bc-field-label">
                <span>សមតុល្យដើម USD</span>
                <small>Opening USD · optional</small>
              </span>
              <label className="bc-input bc-input-amount" style={{ width: "100%", boxSizing: "border-box" }}>
                <input
                  inputMode="decimal"
                  value={openingUsd}
                  onChange={(e) => setOpeningUsd(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  aria-label="សមតុល្យដើម USD"
                  style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
                />
                <span className="bc-cur bc-cur-USD">USD</span>
              </label>
            </div>

            <div className="bc-field" style={{ margin: 0, minWidth: 0 }}>
              <span className="bc-field-label">
                <span>សមតុល្យដើម KHR</span>
                <small>Opening KHR · optional</small>
              </span>
              <label className="bc-input bc-input-amount" style={{ width: "100%", boxSizing: "border-box" }}>
                <input
                  inputMode="numeric"
                  value={openingKhr}
                  onChange={(e) => setOpeningKhr(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  aria-label="សមតុល្យដើម KHR"
                  style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
                />
                <span className="bc-cur bc-cur-KHR">KHR</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <footer
          style={{
            padding: "14px 24px",
            background: "var(--surface)",
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexShrink: 0,
          }}
        >
          {/* Live Preview Summary Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              background: "var(--surface-sunken)",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--line)",
              fontSize: "13px",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <BonchiIcon name="wallet" size={16} />
            <span style={{ fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>
              {nameKm.trim() || "កាបូបថ្មី"}
            </span>
            <span style={{ color: "var(--ink-muted)" }}>•</span>
            <span style={{ color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{selectedType.km}</span>
            <span style={{ color: "var(--ink-muted)" }}>•</span>
            <span style={{ fontWeight: 600, color: "var(--brand)", whiteSpace: "nowrap" }}>
              {formatUsd(usd)}
            </span>
            <span style={{ color: "var(--ink-muted)" }}>/</span>
            <span style={{ fontWeight: 600, color: "var(--gold)", whiteSpace: "nowrap" }}>
              {formatKhr(khr)}
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: "9px 18px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--line)",
                background: "var(--surface-raised)",
                color: "var(--ink)",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              បោះបង់ Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                padding: "9px 22px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: canSubmit ? "var(--brand)" : "var(--surface-sunken)",
                color: canSubmit ? "var(--on-brand)" : "var(--ink-muted)",
                fontWeight: 600,
                fontSize: "14px",
                cursor: canSubmit ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: canSubmit ? "0 4px 12px rgba(16, 185, 129, 0.25)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <BonchiIcon name="check" size={18} />
              <span>{mutation.isPending ? "កំពុងរក្សាទុក..." : "បង្កើតកាបូប Create"}</span>
            </button>
          </div>
        </footer>
      </form>
    </>
  );
}
