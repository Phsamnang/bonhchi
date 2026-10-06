"use client";

import React, { useState } from "react";
import { Invoice, useVoidInvoiceMutation, usePayInvoiceMutation } from "@/hooks/useInvoices";
import { useWallets } from "@/hooks/useWallets";
import BonchiIcon from "./BonchiIcon";
import { BonchiDualTotal } from "./BonchiComponents";
import { formatUsd, formatKhr } from "@/lib/utils";

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  role?: string;
  onSuccess?: () => void;
}

export default function TransactionDetailModal({
  isOpen,
  onClose,
  invoice,
  role = "owner",
  onSuccess,
}: TransactionDetailModalProps) {
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | number>("");
  const [errorMsg, setErrorMsg] = useState("");

  const voidMutation = useVoidInvoiceMutation();
  const payMutation = usePayInvoiceMutation();
  const { data: walletsList = [] } = useWallets();

  React.useEffect(() => {
    if (walletsList.length > 0) {
      if (!selectedWalletId || !walletsList.some((w) => String(w.id) === String(selectedWalletId))) {
        setSelectedWalletId(walletsList[0].id);
      }
    }
  }, [walletsList, selectedWalletId]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !invoice) return null;

  const isVoided = invoice.status === "void";

  const isUnpaid = invoice.status !== "paid" && invoice.status !== "void";
  const oweUsd = Math.max(0, Number(invoice.total_usd || 0) - Number(invoice.paid_usd || 0));
  const oweKhr = Math.max(0, Number(invoice.total_khr || 0) - Number(invoice.paid_khr || 0));

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    const walletIdToPay = selectedWalletId || walletsList[0]?.id;
    if (!walletIdToPay) {
      setErrorMsg("សូមជ្រើសរើសកាបូបដើម្បីកាត់ប្រាក់ (Please select a wallet)");
      return;
    }

    setErrorMsg("");

    try {
      await payMutation.mutateAsync({
        id: invoice.id,
        wallet_id: walletIdToPay,
      });

      setShowPayConfirm(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "ការទូទាត់ប្រាក់បានបរាជ័យ");
    }
  };

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      setErrorMsg("សូមបញ្ចូលមូលហេតុនៃការមោឃភាព");
      return;
    }

    setErrorMsg("");

    try {
      await voidMutation.mutateAsync({
        id: invoice.id,
        reason: voidReason.trim(),
      });

      setShowVoidConfirm(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "ការមោឃភាពបានបរាជ័យ");
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
              <b>វិក្កយបត្រ {invoice.invoice_no}</b>
              <small>Transaction Detail</small>
            </div>
          </div>
          <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="បិទ Close">
            <BonchiIcon name="x" size={20} />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="p-body" style={{ gap: "16px", paddingBottom: "24px" }}>
          {/* Voided Banner */}
          {isVoided && (
            <div className="bc-banner bc-banner-danger" role="status">
              <BonchiIcon name="x" size={22} />
              <div className="bc-banner-main">
                <b>បានលុបចោល (Voided)</b>
                {invoice.void_reason ? ` · មូលហេតុ៖ ${invoice.void_reason}` : ""}
                <br />
                មិនរាប់ក្នុងសរុបទៀតទេ
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bc-banner bc-banner-danger" role="alert">
              <BonchiIcon name="alert" size={20} />
              <div className="bc-banner-main">{errorMsg}</div>
            </div>
          )}

          {/* Supplier Title Row */}
          <div className="p-row">
            <span
              className={`bc-disc ${
                invoice.type === "income"
                  ? "bc-disc-income"
                  : invoice.wallet_code === "transfer"
                  ? "bc-disc-transfer"
                  : "bc-disc-expense"
              }`}
            >
              <BonchiIcon
                name={invoice.type === "income" ? "income" : invoice.expense_kind === "small" ? "coins" : "cart"}
              />
            </span>
            <div className="p-grow">
              <div className="bc-row-t">{invoice.supplier_name}</div>
              <div className="bc-row-m">
                {invoice.category || "ទូទៅ"} · {invoice.date} · {invoice.time}
              </div>
            </div>
            <span
              className={`bc-badge ${
                invoice.status === "paid"
                  ? "bc-badge-success"
                  : invoice.status === "void"
                  ? "bc-badge-danger bc-badge-void"
                  : "bc-badge-warning"
              }`}
            >
              {(invoice.status || "").toUpperCase()}
            </span>
          </div>

          {/* Dual Total */}
          <div className={isVoided ? "p-void" : ""}>
            <BonchiDualTotal
              title="សរុប · Total"
              usd={invoice.total_usd}
              khr={invoice.total_khr}
              kind={invoice.type === "income" ? "income" : "expense"}
            />
          </div>

          {/* Items if present */}
          {invoice.items && invoice.items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="p-label">
                មុខទំនិញ<small>Items · {invoice.items.length}</small>
              </div>
              {invoice.items.map((it) => (
                <div key={it.id} className="bc-item">
                  <div className="bc-item-t">{it.item_name}</div>
                  <div className="bc-item-r">
                    <span className="bc-money bc-num">
                      {it.currency === "USD" ? formatUsd(it.line_total) : formatKhr(it.line_total)}
                    </span>
                    <span className={`bc-cur bc-cur-${it.currency}`}>{it.currency}</span>
                  </div>
                  <div className="bc-item-m">
                    {it.quantity} {it.unit} × {it.currency === "USD" ? formatUsd(it.unit_price) : formatKhr(it.unit_price)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Key-Value Details */}
          <div className="bc-card" style={{ padding: "8px 16px" }}>
            {invoice.table_name && (
              <div className="p-kv">
                <span>លេខតុ · Table</span>
                <b style={{ color: "var(--income, #10b981)" }}>{invoice.table_name}</b>
              </div>
            )}
            <div className="p-kv">
              <span>{invoice.type === "income" ? "ដាក់ចូល · Deposited to" : "បង់ពី · Paid from"}</span>
              <b>{invoice.wallet_code ? invoice.wallet_code.toUpperCase() : "មិនទាន់កាត់ប្រាក់ (Unpaid)"}</b>
            </div>
            {invoice.paid_usd > 0 && (
              <div className="p-kv">
                <span>{invoice.type === "income" ? "ទទួលបាន USD" : "បានបង់ USD"}</span>
                <span className="bc-num font-bold">{formatUsd(invoice.paid_usd)}</span>
              </div>
            )}
            {invoice.paid_khr > 0 && (
              <div className="p-kv">
                <span>{invoice.type === "income" ? "ទទួលបាន KHR" : "បានបង់ KHR"}</span>
                <span className="bc-num font-bold">{formatKhr(invoice.paid_khr)}</span>
              </div>
            )}
            {isUnpaid && (
              <div className="p-kv" style={{ color: "var(--warning)" }}>
                <span>នៅជំពាក់ · Owed</span>
                <span className="bc-num font-bold">
                  {oweUsd > 0 && formatUsd(oweUsd)}
                  {oweUsd > 0 && oweKhr > 0 && " + "}
                  {oweKhr > 0 && formatKhr(oweKhr)}
                </span>
              </div>
            )}
            <div className="p-kv">
              <span>ប្រភេទ · Category</span>
              <span>{invoice.category || (invoice.type === "income" ? "ចំណូលលក់" : "គ្រឿងផ្សំ")}</span>
            </div>
            {invoice.note && (
              <div className="p-kv">
                <span>កំណត់ចំណាំ · Note</span>
                <span>{invoice.note}</span>
              </div>
            )}
          </div>

          {/* Mark as Paid / Pay Invoice Section */}
          {isUnpaid && !isVoided && (
            <div style={{ paddingTop: "4px" }}>
              {showPayConfirm ? (
                <form
                  onSubmit={handlePay}
                  className="bc-card"
                  style={{
                    gap: "12px",
                    display: "flex",
                    flexDirection: "column",
                    border: "1.5px solid var(--brand)",
                    background: "var(--surface-raised)",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>👛</span>
                    <span>ជ្រើសរើសកាបូបដែលត្រូវកាត់ប្រាក់ (Select Wallet to Deduct):</span>
                  </div>

                  <div style={{ padding: "8px 12px", background: "var(--surface)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>ចំនួនទឹកប្រាក់ដែលត្រូវទូទាត់៖</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--expense)" }}>
                      {oweUsd > 0 && formatUsd(oweUsd)}
                      {oweUsd > 0 && oweKhr > 0 && " + "}
                      {oweKhr > 0 && formatKhr(oweKhr)}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      កាបូបទូទាត់ប្រាក់ (Deduct From):
                    </label>
                    <select
                      className="bc-input"
                      value={selectedWalletId}
                      onChange={(e) => setSelectedWalletId(e.target.value)}
                      style={{ width: "100%", fontSize: "13px" }}
                    >
                      {walletsList.map((w) => {
                        const bal = w.current_balance !== undefined ? w.current_balance : (w.currency === "KHR" ? w.khr : w.usd);
                        const cur = w.currency || (w.khr > 0 && w.usd === 0 ? "KHR" : "USD");
                        return (
                          <option key={w.id} value={w.id}>
                            {w.name_km} ({w.name_en || w.code}) — {cur === "USD" ? formatUsd(bal) : formatKhr(bal)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={() => setShowPayConfirm(false)}
                      className="bc-btn bc-btn-secondary"
                      style={{ flex: 1, minHeight: "38px" }}
                    >
                      បោះបង់
                    </button>
                    <button
                      type="submit"
                      disabled={payMutation.isPending}
                      className="bc-btn bc-btn-primary"
                      style={{ flex: 1.5, minHeight: "38px" }}
                    >
                      <BonchiIcon name="check" size={16} />
                      {payMutation.isPending ? "កំពុងទូទាត់..." : "បញ្ជាក់ការកាត់ប្រាក់"}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPayConfirm(true)}
                  className="bc-btn bc-btn-primary bc-btn-block"
                  style={{ minHeight: "44px", fontSize: "14px", fontWeight: 700 }}
                >
                  <BonchiIcon name="wallet" size={18} />
                  💳 បង់ប្រាក់ឥឡូវនេះ · កាត់ពីកាបូប (Mark as Paid)
                </button>
              )}
            </div>
          )}

          {/* Receipt Photo Placeholder */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="p-label">
              រូបវិក្កយបត្រ<small>Receipt</small>
            </div>
            <div className="p-photo">
              <BonchiIcon name="receipt" size={24} />
              <span>[រូបថតវិក្កយបត្រ]</span>
            </div>
          </div>

          {/* Audit Trail note */}
          <div className="p-muted">
            កត់ត្រានៅ {invoice.created_at || invoice.date}
          </div>

          {/* Soft Void Action */}
          {!isVoided && role !== "staff" && (
            <div style={{ paddingTop: "8px" }}>
              {showVoidConfirm ? (
                <form onSubmit={handleVoid} className="bc-card" style={{ gap: "10px", display: "flex", flexDirection: "column" }}>
                  <div className="p-label" style={{ color: "var(--danger)" }}>
                    បញ្ជាក់ការមោឃភាព (Audit Void Reason):
                  </div>
                  <div className="bc-input">
                    <input
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="មូលហេតុ (e.g. បញ្ចូលច្រឡំ)"
                      required
                      autoFocus
                    />
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setShowVoidConfirm(false)}
                      className="bc-btn bc-btn-secondary"
                      style={{ flex: 1 }}
                    >
                      បោះបង់
                    </button>
                    <button
                      type="submit"
                      disabled={voidMutation.isPending}
                      className="bc-btn bc-btn-danger"
                      style={{ flex: 1 }}
                    >
                      {voidMutation.isPending ? "កំពុង..." : "បញ្ជាក់មោឃភាព"}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowVoidConfirm(true)}
                  className="bc-btn bc-btn-danger bc-btn-block"
                >
                  <BonchiIcon name="x" size={18} />
                  មោឃភាពវិក្កយបត្រនេះ (Void)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
