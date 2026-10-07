"use client";

import React, { useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import { Staff, useCreateLoan } from "@/hooks/usePayroll";
import { Wallet } from "@/hooks/useWallets";
import { formatUsd, formatKhr } from "@/lib/utils";

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  wallets: Wallet[];
  defaultStaffId?: number | null;
  onSuccess?: () => void;
}

/** Lend money to a staff member, paid back by a fixed installment from each payroll run */
export default function LoanModal({
  isOpen,
  onClose,
  staffList,
  wallets,
  defaultStaffId,
  onSuccess,
}: LoanModalProps) {
  // What the user picked; until then the preselected staff / first matching wallet is used
  const [pickedStaffId, setPickedStaffId] = useState<number | null>(null);
  const [pickedWalletId, setPickedWalletId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [installment, setInstallment] = useState<string>("");
  const [givenAt, setGivenAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const createMutation = useCreateLoan();

  const isListed = (id: number | null | undefined) => !!id && staffList.some((s) => s.id === id);
  const staffId = isListed(pickedStaffId)
    ? (pickedStaffId as number)
    : isListed(defaultStaffId)
    ? (defaultStaffId as number)
    : staffList[0]?.id || 0;

  // Installments come out of the salary, so the loan is in the salary currency
  const selectedStaff = staffList.find((s) => s.id === staffId);
  const currency: "USD" | "KHR" = selectedStaff?.currency === "KHR" ? "KHR" : "USD";
  const fmt = (v: number) => (currency === "USD" ? formatUsd(v) : formatKhr(v));

  const availableWallets = wallets.filter((w) => !w.currency || w.currency === currency);
  const walletId = availableWallets.some((w) => Number(w.id) === pickedWalletId)
    ? (pickedWalletId as number)
    : Number(availableWallets[0]?.id || 0);

  if (!isOpen) return null;

  const handleClose = () => {
    setPickedStaffId(null);
    setErrorMsg("");
    onClose();
  };

  const amtNum = Number(amount);
  const instNum = Number(installment);
  const runsToRepay = amtNum > 0 && instNum > 0 ? Math.ceil(amtNum / Math.min(instNum, amtNum)) : 0;
  const monthlySalary =
    selectedStaff?.base_rate != null
      ? selectedStaff.salary_type === "monthly"
        ? Number(selectedStaff.base_rate)
        : Number(selectedStaff.base_rate) * (selectedStaff.standard_days || 26)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!staffId) {
      setErrorMsg("សូមជ្រើសរើសបុគ្គលិក");
      return;
    }
    if (isNaN(amtNum) || amtNum <= 0) {
      setErrorMsg("សូមបញ្ចូលចំនួនប្រាក់កម្ចី (> 0)");
      return;
    }
    if (isNaN(instNum) || instNum <= 0) {
      setErrorMsg("សូមបញ្ចូលចំនួនកាត់សងក្នុងមួយខែ (> 0)");
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
        installment: Math.min(instNum, amtNum),
        given_at: givenAt,
        wallet_id: walletId,
        note: note.trim() || undefined,
      });
      if (onSuccess) onSuccess();
      setAmount("");
      setInstallment("");
      setNote("");
      handleClose();
    } catch (err) {
      setErrorMsg((err instanceof Error && err.message) || "បរាជ័យក្នុងការផ្តល់ប្រាក់កម្ចី");
    }
  };

  const selectedWallet = wallets.find((w) => Number(w.id) === walletId);
  const walletBal = selectedWallet
    ? selectedWallet.current_balance !== undefined
      ? Number(selectedWallet.current_balance)
      : Number((currency === "USD" ? selectedWallet.usd : selectedWallet.khr) || 0)
    : 0;

  return (
    <>
      <div className="p-scrim" onClick={handleClose} aria-label="បិទ Close" />
      <div
        className="p-sheet p-screen"
        style={{ maxHeight: "90vh", maxWidth: "520px", margin: "auto", padding: 0 }}
        role="dialog"
        aria-modal="true"
      >
        <header className="bc-appbar bc-appbar-back" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button type="button" onClick={handleClose} className="bc-iconbtn" aria-label="Back">
              <BonchiIcon name="back" />
            </button>
            <div className="bc-appbar-t">
              <b>ផ្តល់ប្រាក់កម្ចីលើប្រាក់ខែ</b>
              <small>Staff Salary Loan</small>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="bc-iconbtn" aria-label="Close">
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
            <label style={{ fontSize: "13px", fontWeight: "600" }}>បុគ្គលិកខ្ចីប្រាក់ *</label>
            <select
              className="bc-input"
              value={staffId}
              onChange={(e) => setPickedStaffId(Number(e.target.value))}
              required
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.position})
                </option>
              ))}
            </select>
            <span style={{ fontSize: "11px", color: "#666" }}>
              រូបិយប័ណ្ណ: {currency} (តាមប្រាក់ខែ)
              {monthlySalary != null && ` · ប្រាក់ខែប្រហែល ${fmt(monthlySalary)} / ខែ`}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>ចំនួនប្រាក់កម្ចី *</label>
              <input
                type="number"
                step="any"
                min="0"
                className="bc-input"
                placeholder={currency === "USD" ? "300" : "1200000"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>កាត់សងម្តង (ក្នុងមួយខែ) *</label>
              <input
                type="number"
                step="any"
                min="0"
                className="bc-input"
                placeholder={currency === "USD" ? "50" : "200000"}
                value={installment}
                onChange={(e) => setInstallment(e.target.value)}
                required
              />
            </div>
          </div>

          {runsToRepay > 0 && (
            <div style={{ fontSize: "12px", color: "#444", marginTop: "-6px" }}>
              សងរួចក្នុងរយៈពេលប្រហែល <b>{runsToRepay}</b> ដងបើកប្រាក់ខែ
              {monthlySalary != null && instNum > monthlySalary && (
                <span style={{ color: "#c0392b" }}> · ចំនួនកាត់លើសប្រាក់ខែ</span>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>កាបូបសម្រាប់ដក *</label>
              <select
                className="bc-input"
                value={walletId}
                onChange={(e) => setPickedWalletId(Number(e.target.value))}
                required
              >
                {availableWallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name_km} ({w.code})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: "11px", color: "#666" }}>សមតុល្យមាន: {fmt(walletBal)}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>ថ្ងៃខ្ចី</label>
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
              placeholder="ឧ. ខ្ចីសម្រាប់ជួសជុលផ្ទះ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="bc-banner" style={{ fontSize: "12px", background: "#fbf6ed", border: "1px solid #ebd9bf" }}>
            <BonchiIcon name="receipt" size={18} />
            <div>
              ប្រាក់កម្ចីនឹងត្រូវដកពីកាបូបភ្លាមៗ ហើយកាត់សងស្វ័យប្រវត្តិពីប្រាក់ខែរៀងរាល់ការបើកប្រាក់ខែ
              តាមចំនួនកាត់ខាងលើ រហូតដល់សងគ្រប់។ អាចកែចំនួនកាត់បាននៅពេលបង្កើតការបើកប្រាក់ខែ។
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="bc-btn bc-btn-secondary"
              onClick={handleClose}
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
              {createMutation.isPending ? "កំពុងកត់ត្រា..." : "បញ្ជាក់ការផ្តល់ប្រាក់កម្ចី"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
