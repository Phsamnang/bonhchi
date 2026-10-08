"use client";

import React, { useState, useEffect } from "react";
import { Invoice, useVoidInvoiceMutation, usePayInvoiceMutation } from "@/hooks/useInvoices";
import { useWallets } from "@/hooks/useWallets";
import BonchiIcon from "./BonchiIcon";
import { BonchiLogoMark } from "./BonchiLogo";
import { formatUsd, formatKhr } from "@/lib/utils";

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  role?: string;
  onSuccess?: () => void;
}

const VOID_REASONS = [
  "បញ្ចូលច្រឡំ (Duplicate)",
  "តម្លៃ ឬចំនួនខុស (Wrong Amount/Qty)",
  "ប្តូរ ឬសងទំនិញ (Returned Items)",
  "ការទូទាត់មានបញ្ហា (Payment Issue)",
  "ផ្សេងៗ (Other)",
];

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
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const voidMutation = useVoidInvoiceMutation();
  const payMutation = usePayInvoiceMutation();
  const { data: walletsList = [] } = useWallets();

  // Set default wallet
  useEffect(() => {
    if (walletsList.length > 0) {
      if (!selectedWalletId || !walletsList.some((w) => String(w.id) === String(selectedWalletId))) {
        setSelectedWalletId(walletsList[0].id);
      }
    }
  }, [walletsList, selectedWalletId]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewImage) {
          setPreviewImage(null);
        } else if (showPayConfirm) {
          setShowPayConfirm(false);
        } else if (showVoidConfirm) {
          setShowVoidConfirm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, previewImage, showPayConfirm, showVoidConfirm]);

  // Reset local states when invoice changes
  useEffect(() => {
    setShowVoidConfirm(false);
    setShowPayConfirm(false);
    setVoidReason("");
    setErrorMsg("");
    setCopied(false);
    setPreviewImage(null);
  }, [invoice?.id, isOpen]);

  if (!isOpen || !invoice) return null;

  const isVoided = invoice.status === "void";
  const isUnpaid = invoice.status !== "paid" && invoice.status !== "void";
  const isIncome = invoice.type === "income";

  const totalUsd = Number(invoice.total_usd || 0);
  const totalKhr = Number(invoice.total_khr || 0);
  const paidUsd = Number(invoice.paid_usd || 0);
  const paidKhr = Number(invoice.paid_khr || 0);

  const oweUsd = Math.max(0, totalUsd - paidUsd);
  const oweKhr = Math.max(0, totalKhr - paidKhr);

  const copyInvoiceNo = () => {
    if (!invoice.invoice_no) return;
    navigator.clipboard.writeText(invoice.invoice_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=420,height=650");
    if (!printWindow) {
      window.print();
      return;
    }

    const itemsHtml = invoice.items && invoice.items.length > 0
      ? invoice.items.map((it) => `
        <tr style="border-bottom: 1px dashed #e2dbcf;">
          <td style="padding: 6px 0; font-weight: 500;">
            ${it.item_name}
            <div style="font-size: 11px; color: #68736f;">${it.quantity} ${it.unit} × ${it.currency === "USD" ? formatUsd(it.unit_price) : formatKhr(it.unit_price)}</div>
          </td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; font-family: monospace;">
            ${it.currency === "USD" ? formatUsd(it.line_total) : formatKhr(it.line_total)}
          </td>
        </tr>
      `).join("")
      : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>វិក្កយបត្រ ${invoice.invoice_no}</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&display=swap');
            body {
              font-family: 'Kantumruy Pro', sans-serif;
              margin: 0;
              padding: 20px;
              color: #1d2422;
              font-size: 13px;
              line-height: 1.5;
            }
            .header { text-align: center; margin-bottom: 16px; border-bottom: 2px dashed #075E4D; padding-bottom: 12px; }
            .logo-title { font-size: 22px; font-weight: 750; color: #075E4D; margin: 0; }
            .logo-sub { font-size: 11px; color: #68736f; margin-top: 2px; }
            .inv-meta { margin: 12px 0; font-size: 12px; }
            .inv-meta div { display: flex; justify-content: space-between; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            .totals { border-top: 2px dashed #1d2422; padding-top: 8px; margin-top: 8px; }
            .totals div { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
            .totals .grand { font-size: 16px; font-weight: 700; color: #075E4D; }
            .footer { text-align: center; font-size: 11px; color: #8a8276; margin-top: 24px; border-top: 1px dashed #e2dbcf; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="logo-title">Bonchi</h1>
            <div class="logo-sub">បញ្ជី · ចំណូល · ចំណាយ</div>
            <div style="margin-top: 8px; font-weight: 700; font-size: 14px;">
              ${invoice.type === "income" ? "បង្កាន់ដៃទទួលប្រាក់ · RECEIPT" : "វិក្កយបត្រចំណាយ · EXPENSE"}
            </div>
          </div>

          <div class="inv-meta">
            <div><span>លេខវិក្កយបត្រ (Invoice #):</span> <b>${invoice.invoice_no}</b></div>
            <div><span>កាលបរិច្ឆេទ (Date):</span> <span>${invoice.date} ${invoice.time || ""}</span></div>
            <div><span>ប្រភព/ដៃគូ (Partner):</span> <b>${invoice.supplier_name || "—"}</b></div>
            ${invoice.table_name ? `<div><span>លេខតុ (Table):</span> <b>${invoice.table_name}</b></div>` : ""}
            <div><span>កាបូប (Wallet):</span> <span>${invoice.wallet_code ? invoice.wallet_code.toUpperCase() : "មិនទាន់កាត់ប្រាក់"}</span></div>
          </div>

          ${itemsHtml ? `<table><tbody>${itemsHtml}</tbody></table>` : ""}

          <div class="totals">
            ${totalUsd > 0 ? `<div class="grand"><span>សរុប USD:</span> <span>${formatUsd(totalUsd)}</span></div>` : ""}
            ${totalKhr > 0 ? `<div class="grand"><span>សរុប KHR:</span> <span>${formatKhr(totalKhr)}</span></div>` : ""}
            ${paidUsd > 0 ? `<div><span>បានបង់ USD:</span> <span>${formatUsd(paidUsd)}</span></div>` : ""}
            ${paidKhr > 0 ? `<div><span>បានបង់ KHR:</span> <span>${formatKhr(paidKhr)}</span></div>` : ""}
            ${oweUsd > 0 ? `<div style="color: #b0441a; font-weight: 600;"><span>នៅជំពាក់ USD:</span> <span>${formatUsd(oweUsd)}</span></div>` : ""}
            ${oweKhr > 0 ? `<div style="color: #b0441a; font-weight: 600;"><span>នៅជំពាក់ KHR:</span> <span>${formatKhr(oweKhr)}</span></div>` : ""}
          </div>

          ${invoice.note ? `<div style="margin-top: 12px; padding: 6px; background: #faf7f2; border-radius: 4px; font-size: 11px;"><b>កំណត់ចំណាំ:</b> ${invoice.note}</div>` : ""}

          <div class="footer">
            <div>សូមអរគុណ! Thank you!</div>
            <div>Bonchi Restaurant Management System</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

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
      setErrorMsg("សូមជ្រើសរើស ឬបញ្ចូលមូលហេតុនៃការមោឃភាព");
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

  // Get status color and badge info
  const getStatusBadge = () => {
    if (isVoided) {
      return {
        label: "បានលុបចោល · Voided",
        bg: "rgba(180, 35, 24, 0.12)",
        color: "#B42318",
        border: "1px solid rgba(180, 35, 24, 0.3)",
        icon: "x",
      };
    }
    if (invoice.status === "paid") {
      return {
        label: "បានបង់រួច · Paid",
        bg: "rgba(11, 93, 75, 0.12)",
        color: "#0B5D4B",
        border: "1px solid rgba(11, 93, 75, 0.3)",
        icon: "check",
      };
    }
    if (invoice.status === "partial") {
      return {
        label: "បង់ខ្លះ · Partial",
        bg: "rgba(224, 165, 38, 0.15)",
        color: "#9E6D00",
        border: "1px solid rgba(224, 165, 38, 0.4)",
        icon: "coins",
      };
    }
    return {
      label: "នៅជំពាក់ · Unpaid",
      bg: "rgba(176, 68, 26, 0.12)",
      color: "#B0441A",
      border: "1px solid rgba(176, 68, 26, 0.3)",
      icon: "clock",
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <>
      {/* Lightbox / Zoom Receipt Modal */}
      {previewImage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 1100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "86vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#FFFFFF",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "15px" }}>
                រូបថតវិក្កយបត្រ #{invoice.invoice_no}
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: 0,
                  color: "#FFFFFF",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BonchiIcon name="x" size={20} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Receipt preview"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              }}
            />
          </div>
        </div>
      )}

      {/* Main Scrim */}
      <div
        className="p-scrim"
        onClick={onClose}
        aria-label="បិទ Close"
        style={{
          background: "rgba(18, 32, 27, 0.55)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trx-modal-title"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(680px, 94vw)",
          maxHeight: "90vh",
          background: "var(--surface-raised, #FFFFFF)",
          borderRadius: "24px",
          boxShadow: "0 24px 60px -12px rgba(18, 60, 52, 0.28), 0 4px 16px rgba(0,0,0,0.06)",
          border: "1px solid var(--line, #E2DBCF)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modern Modal Header */}
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line, #E2DBCF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface, #FAF7F2)",
            flexShrink: 0,
            gap: "12px",
          }}
        >
          {/* Left title & meta */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
            {/* Type indicator disc */}
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: isIncome
                  ? "rgba(10, 103, 135, 0.12)"
                  : invoice.wallet_code === "transfer"
                  ? "rgba(90, 100, 96, 0.12)"
                  : "rgba(176, 68, 26, 0.12)",
                color: isIncome
                  ? "var(--income, #0A6787)"
                  : invoice.wallet_code === "transfer"
                  ? "var(--transfer, #5A6460)"
                  : "var(--expense, #B0441A)",
              }}
            >
              <BonchiIcon
                name={isIncome ? "income" : invoice.expense_kind === "small" ? "coins" : "cart"}
                size={22}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h2
                  id="trx-modal-title"
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    fontWeight: 750,
                    fontFamily: "var(--font-sans)",
                    color: "var(--ink, #1D2422)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>{invoice.invoice_no}</span>
                </h2>

                {/* Quick Copy Button */}
                <button
                  type="button"
                  onClick={copyInvoiceNo}
                  title="ចម្លងលេខវិក្កយបត្រ (Copy Invoice #)"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--line, #E2DBCF)",
                    background: copied ? "var(--brand-soft, #DDEFE8)" : "var(--surface-raised, #FFFFFF)",
                    color: copied ? "var(--brand, #0B5D4B)" : "var(--ink-muted, #5A6460)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <BonchiIcon name={copied ? "check" : "file"} size={12} />
                  <span>{copied ? "បានចម្លង!" : "ចម្លង"}</span>
                </button>

                {/* Status Badge */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: statusBadge.bg,
                    color: statusBadge.color,
                    border: statusBadge.border,
                  }}
                >
                  <BonchiIcon name={statusBadge.icon} size={13} />
                  <span>{statusBadge.label}</span>
                </span>
              </div>

              <div
                style={{
                  fontSize: "12.5px",
                  color: "var(--ink-muted, #5A6460)",
                  marginTop: "2px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{invoice.date}</span>
                {invoice.time && <span>· {invoice.time}</span>}
                <span>· {isIncome ? "ចំណូលលក់" : invoice.expense_kind === "small" ? "ចំណាយតូច" : "ចំណាយផ្សារ"}</span>
              </div>
            </div>
          </div>

          {/* Right Header Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={handlePrint}
              className="bc-iconbtn"
              title="បោះពុម្ពវិក្កយបត្រ (Print Receipt)"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: "1px solid var(--line, #E2DBCF)",
                background: "var(--surface-raised, #FFFFFF)",
                color: "var(--ink, #1D2422)",
                cursor: "pointer",
              }}
            >
              <BonchiIcon name="receipt" size={18} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bc-iconbtn"
              aria-label="បិទ Close"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: "1px solid var(--line, #E2DBCF)",
                background: "var(--surface-raised, #FFFFFF)",
                color: "var(--ink-muted, #5A6460)",
                cursor: "pointer",
              }}
            >
              <BonchiIcon name="x" size={18} />
            </button>
          </div>
        </header>

        {/* Scrollable Modal Content */}
        <div
          style={{
            padding: "20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Voided Banner */}
          {isVoided && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "14px",
                background: "#FDE7E4",
                border: "1.5px solid #F87171",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                color: "#991B1B",
              }}
              role="status"
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#EF4444",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <BonchiIcon name="x" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px" }}>
                  វិក្កយបត្រនេះត្រូវបានមោឃភាព (Voided Invoice)
                </div>
                <div style={{ fontSize: "13px", marginTop: "2px", lineHeight: "1.4" }}>
                  {invoice.void_reason ? (
                    <>
                      <b>មូលហេតុ៖</b> {invoice.void_reason}
                    </>
                  ) : (
                    "បានលុបចោលពីប្រព័ន្ធ"
                  )}
                </div>
                <div style={{ fontSize: "11.5px", color: "#B91C1C", marginTop: "4px" }}>
                  * ទិន្នន័យនេះមិនត្រូវបានរាប់បញ្ចូលក្នុងចំណូលចំណាយ ឬសមតុល្យកាបូបឡើយ
                </div>
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMsg && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                background: "#FEF2F2",
                border: "1px solid #FCA5A5",
                color: "#B91C1C",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13.5px",
              }}
              role="alert"
            >
              <BonchiIcon name="alert" size={18} />
              <div style={{ flex: 1 }}>{errorMsg}</div>
              <button
                type="button"
                onClick={() => setErrorMsg("")}
                style={{ background: "none", border: 0, cursor: "pointer", color: "inherit" }}
              >
                <BonchiIcon name="x" size={16} />
              </button>
            </div>
          )}

          {/* Hero Financial Amount Card */}
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "18px",
              background: isIncome
                ? "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)"
                : isVoided
                ? "#F3F4F6"
                : "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
              border: `1.5px solid ${
                isIncome ? "#BAE6FD" : isVoided ? "#E5E7EB" : "#FED7AA"
              }`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: isIncome ? "#0369A1" : isVoided ? "#6B7280" : "#C2410C",
                }}
              >
                {isIncome ? "ចំនួនទឹកប្រាក់ចំណូលសរុប" : "ចំនួនទឹកប្រាក់ចំណាយសរុប"}
              </span>

              {isUnpaid && !isVoided && (
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#C2410C",
                    background: "rgba(255, 255, 255, 0.8)",
                    padding: "2px 8px",
                    borderRadius: "999px",
                  }}
                >
                  នៅជំពាក់ (Owed)
                </span>
              )}
            </div>

            {/* Big Dual Amount */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "16px",
                marginTop: "8px",
                flexWrap: "wrap",
                textDecoration: isVoided ? "line-through" : "none",
                opacity: isVoided ? 0.6 : 1,
              }}
            >
              {totalUsd > 0 && (
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span
                    style={{
                      fontFamily: "Inter, system-ui, sans-serif",
                      fontSize: "30px",
                      lineHeight: "36px",
                      fontWeight: 800,
                      color: isIncome ? "#0C4A6E" : isVoided ? "#374151" : "#7C2D12",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatUsd(totalUsd)}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: isIncome ? "#0284C7" : isVoided ? "#6B7280" : "#EA580C",
                    }}
                  >
                    USD
                  </span>
                </div>
              )}

              {totalKhr > 0 && (
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span
                    style={{
                      fontFamily: "Inter, system-ui, sans-serif",
                      fontSize: totalUsd > 0 ? "24px" : "30px",
                      lineHeight: "36px",
                      fontWeight: 800,
                      color: isIncome ? "#0C4A6E" : isVoided ? "#374151" : "#7C2D12",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatKhr(totalKhr)}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: isIncome ? "#0284C7" : isVoided ? "#6B7280" : "#EA580C",
                    }}
                  >
                    KHR
                  </span>
                </div>
              )}

              {totalUsd === 0 && totalKhr === 0 && (
                <span style={{ fontSize: "24px", fontWeight: 700, color: "#6B7280" }}>
                  $0.00
                </span>
              )}
            </div>

            {/* Paid / Unpaid Breakdown */}
            {(paidUsd > 0 || paidKhr > 0 || isUnpaid) && !isVoided && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "10px",
                  borderTop: "1px dashed rgba(0, 0, 0, 0.12)",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "10px",
                  fontSize: "12.5px",
                }}
              >
                <div>
                  <div style={{ color: "var(--ink-muted, #5A6460)" }}>បានបង់រួច (Paid):</div>
                  <div style={{ fontWeight: 700, color: "#0B5D4B", marginTop: "2px" }}>
                    {paidUsd > 0 ? formatUsd(paidUsd) : ""}
                    {paidUsd > 0 && paidKhr > 0 ? " + " : ""}
                    {paidKhr > 0 ? formatKhr(paidKhr) : ""}
                    {paidUsd === 0 && paidKhr === 0 ? "មិនទាន់បង់" : ""}
                  </div>
                </div>

                {isUnpaid && (
                  <div>
                    <div style={{ color: "#B0441A", fontWeight: 600 }}>នៅជំពាក់ (Remaining):</div>
                    <div style={{ fontWeight: 800, color: "#B0441A", marginTop: "2px" }}>
                      {oweUsd > 0 ? formatUsd(oweUsd) : ""}
                      {oweUsd > 0 && oweKhr > 0 ? " + " : ""}
                      {oweKhr > 0 ? formatKhr(oweKhr) : ""}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Pay CTA Bar (When Unpaid) */}
          {isUnpaid && !isVoided && !showPayConfirm && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: "14px",
                background: "var(--surface-sunken, #F1ECE3)",
                border: "1.5px solid var(--gold, #E0A526)",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--ink, #1D2422)" }}>
                  វិក្កយបត្រនេះមិនទាន់ទូទាត់ទេ
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--ink-muted, #5A6460)" }}>
                  ជ្រើសរើសកាបូបដើម្បីកាត់ប្រាក់ភ្លាមៗ
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPayConfirm(true)}
                className="bc-btn"
                style={{
                  background: "var(--brand, #0B5D4B)",
                  color: "#FFFFFF",
                  border: 0,
                  borderRadius: "10px",
                  padding: "8px 16px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <BonchiIcon name="wallet" size={17} />
                <span>ទូទាត់ប្រាក់ឥឡូវនេះ (Pay Now)</span>
              </button>
            </div>
          )}

          {/* Inline Pay Confirm Form */}
          {showPayConfirm && (
            <form
              onSubmit={handlePay}
              style={{
                padding: "16px",
                borderRadius: "16px",
                background: "var(--surface-raised, #FFFFFF)",
                border: "2px solid var(--brand, #0B5D4B)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                boxShadow: "0 8px 24px rgba(11, 93, 75, 0.12)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 750, fontSize: "15px", color: "var(--brand, #0B5D4B)" }}>
                  <BonchiIcon name="wallet" size={20} />
                  <span>ជ្រើសរើសកាបូបកាត់ប្រាក់ (Select Wallet)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPayConfirm(false)}
                  style={{ background: "none", border: 0, cursor: "pointer", color: "var(--ink-muted)" }}
                >
                  <BonchiIcon name="x" size={16} />
                </button>
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  background: "var(--surface, #FAF7F2)",
                  borderRadius: "10px",
                  border: "1px solid var(--line, #E2DBCF)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--ink-muted, #5A6460)" }}>
                  ចំនួនទឹកប្រាក់ត្រូវកាត់៖
                </span>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--expense, #B0441A)" }}>
                  {oweUsd > 0 && formatUsd(oweUsd)}
                  {oweUsd > 0 && oweKhr > 0 && " + "}
                  {oweKhr > 0 && formatKhr(oweKhr)}
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "6px", color: "var(--ink)" }}>
                  កាបូបដែលត្រូវកាត់ប្រាក់ចេញ៖
                </label>
                <select
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "44px",
                    padding: "0 12px",
                    borderRadius: "10px",
                    border: "1.5px solid var(--line-strong, #8A8276)",
                    background: "var(--surface-raised, #FFFFFF)",
                    color: "var(--ink, #1D2422)",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {walletsList.map((w) => {
                    const bal =
                      w.current_balance !== undefined
                        ? w.current_balance
                        : w.currency === "KHR"
                        ? w.khr
                        : w.usd;
                    const cur = w.currency || (w.khr > 0 && w.usd === 0 ? "KHR" : "USD");
                    return (
                      <option key={w.id} value={w.id}>
                        {w.name_km} ({w.name_en || w.code}) — សមតុល្យ {cur === "USD" ? formatUsd(bal) : formatKhr(bal)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setShowPayConfirm(false)}
                  style={{
                    flex: 1,
                    minHeight: "42px",
                    borderRadius: "10px",
                    border: "1px solid var(--line, #E2DBCF)",
                    background: "var(--surface-raised, #FFFFFF)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending}
                  style={{
                    flex: 1.5,
                    minHeight: "42px",
                    borderRadius: "10px",
                    border: 0,
                    background: "var(--brand, #0B5D4B)",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    cursor: payMutation.isPending ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <BonchiIcon name="check" size={17} />
                  <span>{payMutation.isPending ? "កំពុងទូទាត់..." : "បញ្ជាក់ការកាត់ប្រាក់"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Key Details Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            {/* Card 1: Partner & Transaction Details */}
            <div
              style={{
                padding: "16px",
                borderRadius: "16px",
                background: "var(--surface, #FAF7F2)",
                border: "1px solid var(--line, #E2DBCF)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--ink-muted, #5A6460)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "2px",
                }}
              >
                <BonchiIcon name="user" size={14} />
                <span>ព័ត៌មានប្រភព & ប្រតិបត្តិការ</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13.5px", color: "var(--ink-muted, #5A6460)" }}>
                  {isIncome ? "ប្រភព/អតិថិជន:" : "អ្នកផ្គត់ផ្គង់/ហាង:"}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #1D2422)" }}>
                  {invoice.supplier_name || "—"}
                </span>
              </div>

              {invoice.table_name && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13.5px", color: "var(--ink-muted, #5A6460)" }}>
                    លេខតុ (Table):
                  </span>
                  <span
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 750,
                      color: "var(--income, #0A6787)",
                      background: "rgba(10, 103, 135, 0.1)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {invoice.table_name}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13.5px", color: "var(--ink-muted, #5A6460)" }}>
                  ប្រភេទ (Category):
                </span>
                <span
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "var(--brand, #0B5D4B)",
                    background: "var(--brand-soft, #DDEFE8)",
                    padding: "2px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {invoice.category || (isIncome ? "ចំណូលលក់" : "ទូទៅ")}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13.5px", color: "var(--ink-muted, #5A6460)" }}>
                  ប្រភេទប្រតិបត្តិការ:
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink, #1D2422)" }}>
                  {isIncome
                    ? "ចំណូល (Income)"
                    : invoice.expense_kind === "small"
                    ? "ចំណាយតូច (Small Expense)"
                    : "ចំណាយទិញទំនិញ (Market Trip)"}
                </span>
              </div>
            </div>

            {/* Card 2: Payment & Wallet Details */}
            <div
              style={{
                padding: "16px",
                borderRadius: "16px",
                background: "var(--surface, #FAF7F2)",
                border: "1px solid var(--line, #E2DBCF)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--ink-muted, #5A6460)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "2px",
                }}
              >
                <BonchiIcon name="wallet" size={14} />
                <span>ព័ត៌មានគណនី & ការទូទាត់</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13.5px", color: "var(--ink-muted, #5A6460)" }}>
                  {isIncome ? "ដាក់ចូលកាបូប:" : "កាត់ពីកាបូប:"}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: invoice.wallet_code ? "var(--brand, #0B5D4B)" : "var(--expense, #B0441A)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <BonchiIcon name={invoice.wallet_code ? "wallet" : "alert"} size={14} />
                  <span>
                    {invoice.wallet_code
                      ? invoice.wallet_code.toUpperCase()
                      : "មិនទាន់កាត់ប្រាក់ (Unpaid)"}
                  </span>
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13.5px", color: "var(--ink-muted, #5A6460)" }}>
                  កាលបរិច្ឆេទ & ម៉ោង:
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink, #1D2422)" }}>
                  {invoice.date} {invoice.time ? `(${invoice.time})` : ""}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13.5px", color: "var(--ink-muted, #5A6460)" }}>
                  ស្ថានភាពទូទាត់:
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: statusBadge.color,
                  }}
                >
                  {statusBadge.label}
                </span>
              </div>

              {invoice.created_at && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "var(--ink-muted, #5A6460)" }}>
                    កត់ត្រាក្នុងប្រព័ន្ធ:
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--ink-muted, #5A6460)" }}>
                    {invoice.created_at.slice(0, 16).replace("T", " ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table (When items exist) */}
          {invoice.items && invoice.items.length > 0 && (
            <div
              style={{
                borderRadius: "16px",
                border: "1px solid var(--line, #E2DBCF)",
                background: "var(--surface-raised, #FFFFFF)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--surface, #FAF7F2)",
                  borderBottom: "1px solid var(--line, #E2DBCF)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <BonchiIcon name="cart" size={17} />
                  <span>មុខទំនិញលម្អិត (Line Items)</span>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--brand, #0B5D4B)",
                    background: "var(--brand-soft, #DDEFE8)",
                    padding: "2px 8px",
                    borderRadius: "999px",
                  }}
                >
                  {invoice.items.length} មុខ
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
                  <thead>
                    <tr
                      style={{
                        background: "var(--surface, #FAF7F2)",
                        borderBottom: "1px solid var(--line, #E2DBCF)",
                        color: "var(--ink-muted, #5A6460)",
                        fontSize: "12px",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "8px 14px", fontWeight: 600 }}>មុខទំនិញ (Item)</th>
                      <th style={{ padding: "8px 14px", fontWeight: 600, textAlign: "center" }}>ចំនួន (Qty)</th>
                      <th style={{ padding: "8px 14px", fontWeight: 600, textAlign: "right" }}>តម្លៃឯកតា (Unit)</th>
                      <th style={{ padding: "8px 14px", fontWeight: 600, textAlign: "right" }}>សរុប (Total)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((it, idx) => (
                      <tr
                        key={it.id || idx}
                        style={{
                          borderBottom: idx === invoice.items!.length - 1 ? "none" : "1px solid var(--line, #E2DBCF)",
                          background: idx % 2 === 1 ? "rgba(250, 247, 242, 0.4)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--ink, #1D2422)" }}>
                          {it.item_name}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "var(--ink-muted)" }}>
                          {it.quantity} <span style={{ fontSize: "12px" }}>{it.unit}</span>
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            fontFamily: "Inter, monospace",
                            color: "var(--ink-muted)",
                          }}
                        >
                          {it.currency === "USD" ? formatUsd(it.unit_price) : formatKhr(it.unit_price)}
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            fontWeight: 700,
                            fontFamily: "Inter, monospace",
                            color: isIncome ? "var(--income, #0A6787)" : "var(--expense, #B0441A)",
                          }}
                        >
                          {it.currency === "USD" ? formatUsd(it.line_total) : formatKhr(it.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Receipt Image Card */}
          <div
            style={{
              padding: "16px",
              borderRadius: "16px",
              background: "var(--surface, #FAF7F2)",
              border: "1px solid var(--line, #E2DBCF)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--ink-muted, #5A6460)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <BonchiIcon name="receipt" size={15} />
                <span>រូបថតវិក្កយបត្រ (Receipt Attachment)</span>
              </div>
              {invoice.receipt_url && (
                <span style={{ fontSize: "11.5px", color: "var(--brand, #0B5D4B)", fontWeight: 600 }}>
                  ចុចលើរូបដើម្បីពង្រីក
                </span>
              )}
            </div>

            {invoice.receipt_url ? (
              <div
                onClick={() => setPreviewImage(invoice.receipt_url!)}
                style={{
                  position: "relative",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  border: "1px solid var(--line, #E2DBCF)",
                  maxHeight: "220px",
                  background: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={invoice.receipt_url}
                  alt="Receipt"
                  style={{
                    width: "100%",
                    height: "100%",
                    maxHeight: "220px",
                    objectFit: "contain",
                    transition: "transform 0.2s ease",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "8px",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.65)",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <BonchiIcon name="search" size={13} />
                  <span>មើលធំ</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "20px",
                  borderRadius: "12px",
                  border: "1.5px dashed var(--line-strong, #8A8276)",
                  background: "var(--surface-raised, #FFFFFF)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  color: "var(--ink-muted, #5A6460)",
                }}
              >
                <BonchiIcon name="receipt" size={24} />
                <span style={{ fontSize: "13px" }}>គ្មានរូបថតវិក្កយបត្រភ្ជាប់មកជាមួយទេ (No Receipt Attached)</span>
              </div>
            )}
          </div>

          {/* Notes Callout (If Present) */}
          {invoice.note && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "14px",
                background: "var(--surface-sunken, #F1ECE3)",
                borderLeft: "4px solid var(--brand, #0B5D4B)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--brand, #0B5D4B)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <BonchiIcon name="note" size={14} />
                <span>កំណត់ចំណាំ (Note)</span>
              </div>
              <div style={{ fontSize: "13.5px", color: "var(--ink, #1D2422)", lineHeight: "1.5" }}>
                {invoice.note}
              </div>
            </div>
          )}

          {/* Soft Void Action Section */}
          {!isVoided && role !== "staff" && (
            <div style={{ paddingTop: "8px" }}>
              {showVoidConfirm ? (
                <form
                  onSubmit={handleVoid}
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    background: "#FEF2F2",
                    border: "1.5px solid #FCA5A5",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#B91C1C", fontWeight: 750, fontSize: "15px" }}>
                    <BonchiIcon name="alert" size={18} />
                    <span>បញ្ជាក់ការមោឃភាពវិក្កយបត្រ (Confirm Void)</span>
                  </div>

                  <div style={{ fontSize: "12.5px", color: "#991B1B", lineHeight: "1.4" }}>
                    ការមោឃភាពនឹងលុបប្រតិបត្តិការនេះចេញពីការគណនាសរុបទាំងអស់។ សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។
                  </div>

                  {/* Preset Quick Chips */}
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#7F1D1D", marginBottom: "6px" }}>
                      ជ្រើសរើសមូលហេតុរហ័ស៖
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {VOID_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setVoidReason(r)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 600,
                            border: voidReason === r ? "1.5px solid #DC2626" : "1px solid #FCA5A5",
                            background: voidReason === r ? "#DC2626" : "#FFFFFF",
                            color: voidReason === r ? "#FFFFFF" : "#991B1B",
                            cursor: "pointer",
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Reason Input */}
                  <div>
                    <input
                      type="text"
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="ឬបញ្ចូលមូលហេតុជាក់លាក់ (e.g. បញ្ចូលច្រឡំ)"
                      required
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        minHeight: "40px",
                        padding: "0 12px",
                        borderRadius: "8px",
                        border: "1.5px solid #F87171",
                        background: "#FFFFFF",
                        fontSize: "13.5px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={() => setShowVoidConfirm(false)}
                      style={{
                        flex: 1,
                        minHeight: "40px",
                        borderRadius: "8px",
                        border: "1px solid #D1D5DB",
                        background: "#FFFFFF",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      បោះបង់
                    </button>
                    <button
                      type="submit"
                      disabled={voidMutation.isPending}
                      style={{
                        flex: 1.5,
                        minHeight: "40px",
                        borderRadius: "8px",
                        border: 0,
                        background: "#DC2626",
                        color: "#FFFFFF",
                        fontWeight: 700,
                        cursor: voidMutation.isPending ? "not-allowed" : "pointer",
                      }}
                    >
                      {voidMutation.isPending ? "កំពុងមោឃភាព..." : "បញ្ជាក់មោឃភាព (Confirm Void)"}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setShowVoidConfirm(true)}
                    style={{
                      background: "transparent",
                      border: "1px solid #FCA5A5",
                      color: "#DC2626",
                      borderRadius: "10px",
                      padding: "8px 14px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#FEF2F2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <BonchiIcon name="x" size={15} />
                    <span>មោឃភាពវិក្កយបត្រនេះ (Void Invoice)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <footer
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--line, #E2DBCF)",
            background: "var(--surface, #FAF7F2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BonchiLogoMark size={24} />
            <span style={{ fontSize: "12px", color: "var(--ink-muted, #5A6460)", fontWeight: 500 }}>
              Bonchi RMS · ប្រព័ន្ធគ្រប់គ្រងចំណូលចំណាយ
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1px solid var(--line, #E2DBCF)",
                background: "var(--surface-raised, #FFFFFF)",
                color: "var(--ink, #1D2422)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <BonchiIcon name="receipt" size={16} />
              <span>បោះពុម្ព</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                border: 0,
                background: "var(--brand, #0B5D4B)",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              រួចរាល់
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
