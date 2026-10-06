"use client";

import React, { useState } from "react";
import { useTransferMutation, Wallet } from "@/hooks/useWallets";
import BonchiIcon from "./BonchiIcon";
import { formatUsd, formatKhr } from "@/lib/utils";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  wallets: Array<{ id: string | number; code: string; name_km: string; usd: number; khr: number; category: string }>;
}

export default function TransferModal({
  isOpen,
  onClose,
  onSuccess,
  wallets,
}: TransferModalProps) {
  const [fromCode, setFromCode] = useState<string>(() => wallets[0]?.code || "drawer");
  const [toCode, setToCode] = useState<string>(() => (wallets[1]?.code && wallets[1]?.code !== wallets[0]?.code ? wallets[1].code : "petty"));
  const [cur, setCur] = useState<"USD" | "KHR">("USD");
  const [raw, setRaw] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const mutation = useTransferMutation();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fromWallet = wallets.find((w) => w.code === fromCode) || wallets[0];
  const toWallet = wallets.find((w) => w.code === toCode) || wallets[1];

  const amount = Number(raw) || 0;
  const availableBal = cur === "USD" ? fromWallet?.usd || 0 : fromWallet?.khr || 0;
  const isOver = amount > availableBal;

  const qv = cur === "KHR" ? [10000, 50000, 100000] : [10, 50, 100];

  const handleSwap = () => {
    const temp = fromCode;
    setFromCode(toCode);
    setToCode(temp);
  };

  const handleQuickAdd = (v: number) => {
    setRaw(String(Math.round(((Number(raw) || 0) + v) * 100) / 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg("សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ");
      return;
    }
    if (fromCode === toCode) {
      setErrorMsg("កាបូបប្រភព និងគោលដៅត្រូវតែខុសគ្នា");
      return;
    }
    if (isOver) {
      setErrorMsg(`លើសពីលុយដែលមានក្នុង ${fromWallet?.name_km}`);
      return;
    }

    setErrorMsg("");

    try {
      await mutation.mutateAsync({
        from_wallet_id: fromCode,
        to_wallet_id: toCode,
        amount,
        currency: cur,
        note: `ផ្ទេររវាងកាបូប ${fromWallet?.name_km} → ${toWallet?.name_km}`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "ការផ្ទេរបានបរាជ័យ");
    }
  };

  const fmt = (n: number, c: "USD" | "KHR") => (c === "USD" ? formatUsd(n) : formatKhr(n));

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
              <b>ផ្ទេរប្រាក់</b>
              <small>Transfer · មិនមែនចំណូល ឬចំណាយ</small>
            </div>
          </div>
          <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="បិទ Close">
            <BonchiIcon name="x" size={20} />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="p-body" style={{ gap: "12px", paddingBottom: "12px" }}>
          {errorMsg && (
            <div className="bc-banner bc-banner-danger" role="alert">
              <BonchiIcon name="alert" size={20} />
              <div className="bc-banner-main">{errorMsg}</div>
            </div>
          )}

          {/* From Wallet Card */}
          <div className="bc-card" style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px" }}>
            <div className="p-label">
              ពី<small>From · មាន {fmt(availableBal, cur)}</small>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {wallets.map((w) => {
                const on = fromCode === w.code;
                const isOther = toCode === w.code;
                return (
                  <button
                    key={w.code}
                    type="button"
                    className={`p-chip ${on ? "p-chip-on" : isOther ? "p-btn-off" : ""}`}
                    aria-pressed={on}
                    onClick={() => setFromCode(w.code)}
                  >
                    {w.name_km}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Swap Button */}
          <div style={{ display: "flex", justifyContent: "center", margin: "-8px 0" }}>
            <button
              type="button"
              onClick={handleSwap}
              className="bc-iconbtn"
              aria-label="ប្តូរ Swap"
              style={{
                background: "var(--surface-raised)",
                border: "1.5px solid var(--line-strong)",
                transform: "rotate(90deg)",
              }}
            >
              <BonchiIcon name="transfer" size={20} />
            </button>
          </div>

          {/* To Wallet Card */}
          <div className="bc-card" style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px" }}>
            <div className="p-label">
              ទៅ<small>To</small>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {wallets.map((w) => {
                const on = toCode === w.code;
                const isOther = fromCode === w.code;
                return (
                  <button
                    key={w.code}
                    type="button"
                    className={`p-chip ${on ? "p-chip-on" : isOther ? "p-btn-off" : ""}`}
                    aria-pressed={on}
                    onClick={() => setToCode(w.code)}
                  >
                    {w.name_km}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Segmented Currency Switch */}
          <div className="bc-seg bc-seg-full" role="group" aria-label="Currency">
            <button
              type="button"
              aria-pressed={cur === "USD"}
              onClick={() => {
                setCur("USD");
                setRaw("");
              }}
            >
              $ ដុល្លារ
            </button>
            <button
              type="button"
              aria-pressed={cur === "KHR"}
              onClick={() => {
                setCur("KHR");
                setRaw("");
              }}
            >
              ៛ រៀល
            </button>
          </div>

          {/* Amount Field */}
          <label className="bc-field">
            <span className="bc-field-label">
              ចំនួនទឹកប្រាក់<small>Amount</small>
            </span>
            <span className="bc-input bc-input-amount">
              <input
                inputMode={cur === "KHR" ? "numeric" : "decimal"}
                value={raw}
                onChange={(e) => {
                  const cleaned = String(e.target.value).replace(cur === "KHR" ? /[^0-9]/g : /[^0-9.]/g, "");
                  setRaw(cleaned);
                }}
                placeholder="0"
                aria-label="ចំនួនទឹកប្រាក់"
              />
              <span className={`bc-cur bc-cur-${cur}`}>{cur}</span>
            </span>
          </label>

          {/* Quick Amounts */}
          <div className="bc-quick">
            {qv.map((v) => (
              <button key={v} type="button" onClick={() => handleQuickAdd(v)}>
                +{cur === "KHR" ? v.toLocaleString("en-US") : "$" + v}
              </button>
            ))}
          </div>

          {/* Over-limit Warning */}
          {isOver && (
            <div className="bc-banner bc-banner-danger" role="alert">
              <BonchiIcon name="alert" size={22} />
              <div className="bc-banner-main">លើសពីលុយដែលមានក្នុង {fromWallet?.name_km}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-foot">
          <div className="bc-banner bc-banner-info" style={{ padding: "8px 12px" }}>
            <BonchiIcon name="transfer" size={22} />
            <div className="bc-banner-main">
              ផ្ទេរ <b>{fmt(amount, cur)}</b> ពី <b>{fromWallet?.name_km}</b> ទៅ <b>{toWallet?.name_km}</b>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={amount <= 0 || isOver || mutation.isPending}
            className={`p-btn ${amount <= 0 || isOver || mutation.isPending ? "p-btn-off" : ""}`}
          >
            <BonchiIcon name="check" size={20} />
            {mutation.isPending ? "កំពុងផ្ទេរ..." : "ផ្ទេរ"}
          </button>
        </div>
      </div>
    </>
  );
}
