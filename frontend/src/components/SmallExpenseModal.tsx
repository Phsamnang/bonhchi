"use client";

import React, { useState } from "react";
import { useSmallExpenseMutation } from "@/hooks/useInvoices";
import BonchiIcon from "./BonchiIcon";

interface SmallExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  wallets: Array<{ id: string | number; code: string; name_km: string; category: string; currency?: string }>;
}

// The first group (ភ្លើង … ជួលផ្ទះ, ហ្គាស) is reported as utilities in the monthly report
const CHIPS = ["ភ្លើង", "ទឹក", "អ៊ីនធឺណិត", "ជួលផ្ទះ", "ហ្គាស", "ទឹកកក", "ក្រដាសអនាម័យ", "សាប៊ូ", "ម៉ូតូឌុប", "ធ្យូង", "ផ្សេងៗ"];

export default function SmallExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  wallets,
}: SmallExpenseModalProps) {
  const [cur, setCur] = useState<"KHR" | "USD">("KHR");
  const [digits, setDigits] = useState<string>("");
  const [pick, setPick] = useState<string>(CHIPS[0] || "");
  const [walletId, setWalletId] = useState<string | number>(() => wallets[0]?.id || "");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const mutation = useSmallExpenseMutation();

  React.useEffect(() => {
    if (wallets.length > 0 && (!walletId || !wallets.some((w) => String(w.id) === String(walletId)))) {
      setWalletId(wallets[0].id);
    }
  }, [wallets, walletId]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isKHR = cur === "KHR";
  const numVal = Number(digits) || 0;
  const amountStr =
    digits === ""
      ? "0"
      : isKHR
      ? numVal.toLocaleString("en-US")
      : digits.indexOf(".") >= 0
      ? Number(digits.split(".")[0]).toLocaleString("en-US") + "." + digits.split(".")[1]
      : numVal.toLocaleString("en-US");

  const setDigitsSafe = (d: string) => {
    if (isKHR) d = d.replace(/^0+/, "");
    if (!isKHR) {
      const parts = d.split(".");
      if (parts.length > 2) return;
      if (parts[1] && parts[1].length > 2) return;
    }
    if (d.replace(".", "").length > 9) return;
    setDigits(d);
  };

  const labels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", isKHR ? "000" : ".", "0", "⌫"];

  const handleKeyPress = (l: string) => {
    if (l === "⌫") {
      setDigitsSafe(digits.slice(0, -1));
    } else if (l === "." && digits.indexOf(".") >= 0) {
      return;
    } else {
      setDigitsSafe(digits === "" && l === "." ? "0." : digits + l);
    }
  };

  const qv = isKHR ? [1000, 5000, 10000, 50000] : [1, 5, 10, 20];

  const handleQuickAdd = (v: number) => {
    const t = (Number(digits) || 0) + v;
    setDigitsSafe(isKHR ? String(Math.round(t)) : String(Math.round(t * 100) / 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numVal || numVal <= 0) {
      setErrorMsg("សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ");
      return;
    }

    setErrorMsg("");

    try {
      const chosenWallet = wallets.find((w) => String(w.id) === String(walletId)) || wallets[0];
      await mutation.mutateAsync({
        amount: numVal,
        currency: cur,
        category_name: pick,
        wallet_id: chosenWallet?.id,
        wallet_code: chosenWallet?.code,
        note: `ចំណាយតូចតាច · ${pick}`,
        date: new Date().toISOString().split("T")[0],
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "បរាជ័យក្នុងការកត់ត្រាចំណាយ");
    }
  };

  return (
    <>
      <div className="p-scrim" onClick={onClose} aria-label="បិទ Close" />
      <div className="p-sheet p-screen" style={{ maxHeight: "95vh", padding: 0 }} role="dialog" aria-modal="true">
        {/* App Bar */}
        <header className="bc-appbar bc-appbar-back" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
            <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="ត្រឡប់ Back">
              <BonchiIcon name="back" />
            </button>
            <div className="bc-appbar-t">
              <b>ចំណាយតូចតាច</b>
              <small>Small expense</small>
            </div>
          </div>
          <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="បិទ Close">
            <BonchiIcon name="x" size={20} />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="p-body" style={{ gap: "14px", paddingBottom: "12px" }}>
          {errorMsg && (
            <div className="bc-banner bc-banner-danger" role="alert">
              <BonchiIcon name="alert" size={20} />
              <div className="bc-banner-main">{errorMsg}</div>
            </div>
          )}

          {/* Segmented Currency Switch */}
          <div className="bc-seg bc-seg-full" role="group" aria-label="Currency">
            <button
              type="button"
              aria-pressed={!isKHR}
              onClick={() => {
                setCur("USD");
                setDigits("");
              }}
            >
              $ ដុល្លារ
            </button>
            <button
              type="button"
              aria-pressed={isKHR}
              onClick={() => {
                setCur("KHR");
                setDigits("");
              }}
            >
              ៛ រៀល
            </button>
          </div>

          {/* Centered Amount Display */}
          <div className="p-amount" aria-live="polite">
            {!isKHR && <small>$</small>}
            <span style={{ color: numVal ? "var(--ink)" : "var(--ink-muted)" }}>{amountStr}</span>
            {isKHR && <small>៛</small>}
          </div>

          {/* Quick Amounts */}
          <div className="bc-quick" style={{ justifyContent: "center" }}>
            {qv.map((v) => (
              <button key={v} type="button" onClick={() => handleQuickAdd(v)}>
                +{isKHR ? v.toLocaleString("en-US") : "$" + v}
              </button>
            ))}
          </div>

          {/* Category Chips */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="p-label">
              ចាយលើអ្វី?<small>What for</small>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {CHIPS.map((c) => {
                const on = pick === c;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`p-chip ${on ? "p-chip-on" : ""}`}
                    aria-pressed={on}
                    onClick={() => setPick(c)}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Foot with Keypad & Action Row */}
        <div className="p-foot">
          <div className="p-keypad">
            {labels.map((l) => (
              <button
                key={l}
                type="button"
                className="p-key"
                onClick={() => handleKeyPress(l)}
                aria-label={l === "⌫" ? "លុប Delete" : l}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="p-row" style={{ gap: "8px" }}>
            <div className="bc-input" style={{ flex: 1, minHeight: "56px" }}>
              <BonchiIcon name="coins" size={20} />
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "15px",
                  lineHeight: "22px",
                  width: "100%",
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name_km} {w.currency ? `[${w.currency}]` : `(${(w.category || "").toUpperCase()})`}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={numVal <= 0 || mutation.isPending}
              className={`p-btn ${numVal <= 0 || mutation.isPending ? "p-btn-off" : ""}`}
              style={{ width: "150px" }}
            >
              <BonchiIcon name="check" size={20} />
              {mutation.isPending ? "កំពុង..." : "រក្សាទុក"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
