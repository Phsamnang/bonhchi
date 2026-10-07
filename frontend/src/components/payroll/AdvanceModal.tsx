"use client";

import React, { useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import { Staff, useCreateAdvance } from "@/hooks/usePayroll";
import { Wallet } from "@/hooks/useWallets";
import { formatUsd, formatKhr } from "@/lib/utils";

interface AdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  wallets: Wallet[];
  defaultStaffId?: number | null;
  onSuccess?: () => void;
}

export default function AdvanceModal({
  isOpen,
  onClose,
  staffList,
  wallets,
  defaultStaffId,
  onSuccess,
}: AdvanceModalProps) {
  const [staffId, setStaffId] = useState<number>(() => defaultStaffId || staffList[0]?.id || 0);
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD");
  const [amount, setAmount] = useState<string>("");
  const [givenAt, setGivenAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [walletId, setWalletId] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const createMutation = useCreateAdvance();

  // Filter wallets matching currency
  const availableWallets = React.useMemo(
    () => wallets.filter((w) => !w.currency || w.currency === currency),
    [wallets, currency]
  );

  React.useEffect(() => {
    if (defaultStaffId && staffList.some((s) => s.id === defaultStaffId)) {
      setStaffId(defaultStaffId);
    } else if (staffList.length > 0 && (!staffId || !staffList.some((s) => s.id === staffId))) {
      setStaffId(staffList[0].id);
    }
  }, [isOpen, defaultStaffId, staffList]);

  React.useEffect(() => {
    if (availableWallets.length > 0) {
      setWalletId(Number(availableWallets[0].id));
    }
  }, [availableWallets]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!staffId) {
      setErrorMsg("សូមជ្រើសរើសបុគ្គលិក");
      return;
    }
    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setErrorMsg("សូមបញ្ចូលចំនួនទឹកប្រាក់បុរេប្រទាន (> 0)");
      return;
    }
    if (!walletId) {
      setErrorMsg("សូមជ្រើសរើសកាបូបសាច់ប្រាក់សម្រាប់ដក");
      return;
    }

    try {
      await createMutation.mutateAsync({
        staff_id: staffId,
        amount: amtNum,
        currency,
        given_at: givenAt,
        wallet_id: walletId,
        note: note.trim() || undefined,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "បរាជ័យក្នុងការផ្តល់បុរេប្រទាន");
    }
  };

  const selectedWallet = wallets.find((w) => Number(w.id) === walletId);
  const walletBal = selectedWallet
    ? currency === "USD"
      ? selectedWallet.current_balance !== undefined
        ? Number(selectedWallet.current_balance)
        : Number(selectedWallet.usd || 0)
      : selectedWallet.current_balance !== undefined
      ? Number(selectedWallet.current_balance)
      : Number(selectedWallet.khr || 0)
    : 0;

  return (
    <>
      <div className="p-scrim" onClick={onClose} aria-label="បិទ Close" />
      <div
        className="p-sheet p-screen"
        style={{ maxHeight: "90vh", maxWidth: "520px", margin: "auto", padding: 0 }}
        role="dialog"
        aria-modal="true"
      >
        <header className="bc-appbar bc-appbar-back" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="Back">
              <BonchiIcon name="back" />
            </button>
            <div className="bc-appbar-t">
              <b>ផ្តល់បុរេប្រទានប្រាក់ខែ</b>
              <small>Staff Salary Advance</small>
            </div>
          </div>
          <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="Close">
            <BonchiIcon name="x" size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-body" style={{ gap: "16px", padding: "16px" }}>
          {errorMsg && (
            <div className="bc-banner bc-banner-danger" role="alert">
              <BonchiIcon name="alert" size={20} />
              <div className="bc-banner-main">{errorMsg}</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600" }}>បុគ្គលិកទទួលបុរេប្រទាន *</label>
            <select
              className="bc-input"
              value={staffId}
              onChange={(e) => setStaffId(Number(e.target.value))}
              required
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.position})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>រូបិយប័ណ្ណ</label>
              <div className="bc-seg bc-seg-full">
                <button
                  type="button"
                  aria-pressed={currency === "USD"}
                  onClick={() => setCurrency("USD")}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  aria-pressed={currency === "KHR"}
                  onClick={() => setCurrency("KHR")}
                >
                  KHR (៛)
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>ចំនួនទឹកប្រាក់ *</label>
              <input
                type="number"
                step="any"
                className="bc-input"
                placeholder={currency === "USD" ? "50" : "200000"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>កាបូបសម្រាប់ដក *</label>
              <select
                className="bc-input"
                value={walletId}
                onChange={(e) => setWalletId(Number(e.target.value))}
                required
              >
                {availableWallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name_km} ({w.code})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: "11px", color: "#666" }}>
                សមតុល្យមាន: {currency === "USD" ? formatUsd(walletBal) : formatKhr(walletBal)}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>ថ្ងៃបើកបុរេប្រទាន</label>
              <input
                type="date"
                className="bc-input"
                value={givenAt}
                onChange={(e) => setGivenAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600" }}>សម្គាល់ (មូលហេតុ)</label>
            <input
              type="text"
              className="bc-input"
              placeholder="ឧ. បុរេប្រទានសម្រាប់ព្យាបាលជំងឺ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="bc-banner" style={{ fontSize: "12px", background: "#fbf6ed", border: "1px solid #ebd9bf" }}>
            <BonchiIcon name="receipt" size={18} />
            <div>
              ទឹកប្រាក់បុរេប្រទាននេះ នឹងត្រូវកត់ត្រាជាចំណាយភ្លាមៗពីកាបូប ហើយនឹងកាត់ស្វ័យប្រវត្តិនៅថ្ងៃបើកប្រាក់ខែបន្ទាប់។
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="bc-btn bc-btn-secondary"
              onClick={onClose}
              style={{ flex: 1, minHeight: "44px" }}
              disabled={createMutation.isPending}
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="bc-btn bc-btn-primary"
              style={{ flex: 2, minHeight: "44px" }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "កំពុងកត់ត្រា..." : "បញ្ជាក់ការបើកបុរេប្រទាន"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
