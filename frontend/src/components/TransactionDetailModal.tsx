"use client";

import React, { useState } from "react";
import { Invoice, useVoidInvoiceMutation } from "@/hooks/useInvoices";
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
  const [errorMsg, setErrorMsg] = useState("");

  const voidMutation = useVoidInvoiceMutation();

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
              {invoice.status.toUpperCase()}
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
            <div className="p-kv">
              <span>បង់ពី · Paid from</span>
              <b>{invoice.wallet_code.toUpperCase()}</b>
            </div>
            {invoice.paid_usd > 0 && (
              <div className="p-kv">
                <span>បានបង់ USD</span>
                <span className="bc-num font-bold">{formatUsd(invoice.paid_usd)}</span>
              </div>
            )}
            {invoice.paid_khr > 0 && (
              <div className="p-kv">
                <span>បានបង់ KHR</span>
                <span className="bc-num font-bold">{formatKhr(invoice.paid_khr)}</span>
              </div>
            )}
            <div className="p-kv">
              <span>ប្រភេទ · Category</span>
              <span>{invoice.category || "គ្រឿងផ្សំ"}</span>
            </div>
          </div>

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
