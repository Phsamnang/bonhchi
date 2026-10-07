"use client";

import React, { useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import {
  usePayrollRun,
  usePayPayrollRun,
  useVoidPayrollRun,
} from "@/hooks/usePayroll";
import { Wallet } from "@/hooks/useWallets";
import { formatUsd, formatKhr } from "@/lib/utils";
import { downloadReportPdf } from "@/lib/exportReport";
import { PayrollPrintTemplate, PAYROLL_SHEET_WIDTH } from "./PayrollPrintTemplate";
import { useDashboardContext } from "@/app/(dashboard)/DashboardContext";

interface PayrollRunDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  runId: number | null;
  wallets: Wallet[];
  isOwner: boolean;
  onSuccess?: () => void;
}

export default function PayrollRunDetailModal({
  isOpen,
  onClose,
  runId,
  wallets,
  isOwner,
  onSuccess,
}: PayrollRunDetailModalProps) {
  const { data: run, isLoading } = usePayrollRun(runId || 0);
  const payMutation = usePayPayrollRun();
  const voidMutation = useVoidPayrollRun();
  const { showToast, session } = useDashboardContext();

  const printRef = React.useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [isPaying, setIsPaying] = useState(false);
  const [selectedUsdWallet, setSelectedUsdWallet] = useState<number>(0);
  const [selectedKhrWallet, setSelectedKhrWallet] = useState<number>(0);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDownloadPdf = async () => {
    const el = printRef.current;
    if (!el || !run) {
      showToast("ទម្រង់បើកប្រាក់ខែមិនទាន់រួចរាល់ សូមរង់ចាំបន្តិច", "warning");
      return;
    }
    setIsExportingPdf(true);
    try {
      showToast("កំពុងបង្កើត PDF បើកប្រាក់ខែ (Generating PDF)...", "info");
      const dateStr = run.payout_date || new Date().toISOString().slice(0, 10);
      const cleanTitle = (run.title || "payroll").replace(/[\s\/\\:]+/g, "-");
      await downloadReportPdf(
        el,
        `bonchi-${cleanTitle}-${dateStr}.pdf`,
        `ភោជនីយដ្ឋាន Bonchi · តារាងបើកប្រាក់ខែ (${run.period_start} ដល់ ${run.period_end})`
      );
      showToast("បានទាញយក PDF បើកប្រាក់ខែដោយជោគជ័យ!", "success");
    } catch (err: any) {
      console.error("Export PDF error:", err);
      showToast("មានបញ្ហាក្នុងការបង្កើត PDF: " + (err.message || "Error"), "error");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const usdWallets = React.useMemo(() => wallets.filter((w) => w.currency === "USD" || !w.currency), [wallets]);
  const khrWallets = React.useMemo(() => wallets.filter((w) => w.currency === "KHR" || !w.currency), [wallets]);

  React.useEffect(() => {
    if (usdWallets.length > 0 && !selectedUsdWallet) {
      setSelectedUsdWallet(Number(usdWallets[0].id));
    }
    if (khrWallets.length > 0 && !selectedKhrWallet) {
      setSelectedKhrWallet(Number(khrWallets[0].id));
    }
  }, [usdWallets, khrWallets, selectedUsdWallet, selectedKhrWallet]);

  if (!isOpen || !runId) return null;

  const handleConfirmPayout = async () => {
    setErrorMsg("");
    if (!run) return;

    const payments = [];
    if (Number(run.total_net_usd) > 0) {
      if (!selectedUsdWallet) {
        setErrorMsg("សូមជ្រើសរើសកាបូបសម្រាប់បើក USD");
        return;
      }
      payments.push({
        currency: "USD" as const,
        wallet_id: selectedUsdWallet,
        amount: Number(run.total_net_usd),
      });
    }
    if (Number(run.total_net_khr) > 0) {
      if (!selectedKhrWallet) {
        setErrorMsg("សូមជ្រើសរើសកាបូបសម្រាប់បើក KHR");
        return;
      }
      payments.push({
        currency: "KHR" as const,
        wallet_id: selectedKhrWallet,
        amount: Number(run.total_net_khr),
      });
    }

    try {
      await payMutation.mutateAsync({
        id: run.id,
        payments,
      });
      setIsPaying(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "បរាជ័យក្នុងការបើកប្រាក់ខែ");
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidReason.trim()) {
      setErrorMsg("សូមបញ្ជាក់មូលហេតុមោឃភាព");
      return;
    }
    setErrorMsg("");
    try {
      await voidMutation.mutateAsync({
        id: runId,
        void_reason: voidReason.trim(),
      });
      setIsVoiding(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "បរាជ័យក្នុងការមោឃភាព");
    }
  };

  return (
    <>
      <div className="p-scrim" onClick={onClose} aria-label="បិទ Close" />
      <div
        className="p-sheet p-screen"
        style={{ maxHeight: "95vh", maxWidth: "980px", margin: "auto", padding: 0 }}
        role="dialog"
        aria-modal="true"
      >
        <header className="bc-appbar bc-appbar-back" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="Back">
              <BonchiIcon name="back" />
            </button>
            <div className="bc-appbar-t">
              <b>{run?.title || "ព័ត៌មានលម្អិតការបើកប្រាក់ខែ"}</b>
              <small>
                {run?.period_start} ដល់ {run?.period_end}
              </small>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {run && (
              <button
                type="button"
                className="bc-btn bc-btn-secondary"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                style={{ minHeight: "36px", fontSize: "12.5px", padding: "4px 12px", gap: "6px" }}
              >
                <BonchiIcon name="pdf" size={16} />
                {isExportingPdf ? "កំពុងទាញយក..." : "ទាញយក PDF"}
              </button>
            )}
            <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="Close">
              <BonchiIcon name="x" size={20} />
            </button>
          </div>
        </header>

        <div className="p-body" style={{ gap: "16px", padding: "16px", overflowY: "auto" }}>
          {errorMsg && (
            <div className="bc-banner bc-banner-danger" role="alert">
              <BonchiIcon name="alert" size={20} />
              <div className="bc-banner-main">{errorMsg}</div>
            </div>
          )}

          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>កំពុងផ្ទុកទិន្នន័យ...</div>
          ) : !run ? (
            <div style={{ padding: "40px", textAlign: "center" }}>រកមិនឃើញទិន្នន័យការបើកប្រាក់ខែនេះទេ</div>
          ) : (
            <>
              {/* Header Status Banner */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  background:
                    run.status === "paid"
                      ? "#e8f5e9"
                      : run.status === "void"
                      ? "#ffebee"
                      : "#fff8e1",
                  border: `1px solid ${
                    run.status === "paid"
                      ? "#c8e6c9"
                      : run.status === "void"
                      ? "#ffcdd2"
                      : "#ffe082"
                  }`,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      className={`p-badge ${
                        run.status === "paid"
                          ? "p-badge-paid"
                          : run.status === "void"
                          ? "p-badge-void"
                          : "p-badge-pending"
                      }`}
                    >
                      {run.status === "paid"
                        ? "បានទូទាត់រួច (PAID)"
                        : run.status === "void"
                        ? "មោឃភាព (VOID)"
                        : "ព្រាងរង់ចាំទូទាត់ (DRAFT)"}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: "600" }}>
                      ថ្ងៃកំណត់បើក: {run.payout_date}
                    </span>
                  </div>
                  {run.paid_at && (
                    <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>
                      បានទូទាត់នៅ: {new Date(run.paid_at).toLocaleString("km-KH")}
                    </div>
                  )}
                  {run.void_reason && (
                    <div style={{ fontSize: "11px", color: "#c0392b", marginTop: "4px" }}>
                      មូលហេតុមោឃភាព: {run.void_reason}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#2e7d32" }}>
                    សរុប USD: {formatUsd(run.total_net_usd)}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#b34a1e" }}>
                    សរុប KHR: {formatKhr(run.total_net_khr)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "8px" }}>
                  បញ្ជីបុគ្គលិកទទួលប្រាក់ខែ ({run.items?.length || 0} នាក់)
                </div>
                <div style={{ overflowX: "auto", border: "1px solid #e5e3de", borderRadius: "8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "#f5f3ee", textAlign: "left", borderBottom: "1px solid #e5e3de" }}>
                        <th style={{ padding: "8px 10px" }}>បុគ្គលិក</th>
                        <th style={{ padding: "8px 10px" }}>ប្រាក់ខែគោល</th>
                        <th style={{ padding: "8px 10px" }}>ថ្ងៃគិត</th>
                        <th style={{ padding: "8px 10px" }}>សរុបគោល</th>
                        <th style={{ padding: "8px 10px" }}>ប្រាក់បន្ថែម</th>
                        <th style={{ padding: "8px 10px" }}>ពិន័យ</th>
                        <th style={{ padding: "8px 10px" }}>កាត់បុរេប្រទាន</th>
                        <th style={{ padding: "8px 10px" }}>សងប្រាក់កម្ចី</th>
                        <th style={{ padding: "8px 10px" }}>បំណុលចាស់</th>
                        <th style={{ padding: "8px 10px", fontWeight: "700" }}>ប្រាក់បើកសុទ្ធ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.items?.map((item, idx) => (
                        <tr
                          key={item.id || idx}
                          style={{
                            borderBottom: "1px solid #eee",
                            background: idx % 2 === 0 ? "#fff" : "#faf9f7",
                          }}
                        >
                          <td style={{ padding: "8px 10px" }}>
                            <b>{item.staff_name}</b>
                            <div style={{ color: "#666", fontSize: "11px" }}>{item.position}</div>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            {item.contract_base_rate} {item.currency}
                            <div style={{ fontSize: "10px", color: "#888" }}>
                              {item.salary_type === "monthly" ? `/ ${item.standard_days} ថ្ងៃ` : "/ ថ្ងៃ"}
                            </div>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            {item.days_override !== null ? (
                              <span style={{ color: "#d97706", fontWeight: "600" }}>
                                {item.days_override} ថ្ងៃ (កែ)
                              </span>
                            ) : (
                              <span>{item.days_counted} ថ្ងៃ</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: "600" }}>
                            {item.currency === "USD" ? formatUsd(item.gross) : formatKhr(item.gross)}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#2e7d32" }}>
                            +{Number(item.bonus || 0) + Number(item.allowance || 0)} {item.currency}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#c0392b" }}>
                            {item.penalty > 0 ? `-${item.penalty} ${item.currency}` : "0"}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#b34a1e" }}>
                            {item.advances > 0 ? `-${item.advances} ${item.currency}` : "0"}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#b34a1e" }}>
                            {item.loan_deduction > 0 ? `-${item.loan_deduction} ${item.currency}` : "0"}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#888" }}>
                            {item.carry_in > 0 ? `-${item.carry_in}` : "0"}
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: "700", color: "#2e7d32" }}>
                            {item.currency === "USD" ? formatUsd(item.net) : formatKhr(item.net)}
                            {item.carry_out > 0 && (
                              <div style={{ fontSize: "10px", color: "#c0392b" }}>
                                ជំពាក់បន្ត: {item.carry_out}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payout Options Form (when user clicks "Disburse") */}
              {isPaying && (
                <div className="w-panel" style={{ padding: "16px", background: "#f8fdf9", border: "1px solid #c8e6c9" }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#2e7d32", marginBottom: "8px" }}>
                    ជ្រើសរើសកាបូបសាច់ប្រាក់សម្រាប់បើកប្រាក់ខែ
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    {run.total_net_usd > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "600" }}>
                          កាបូប USD (សរុប {formatUsd(run.total_net_usd)})
                        </label>
                        <select
                          className="bc-input"
                          value={selectedUsdWallet}
                          onChange={(e) => setSelectedUsdWallet(Number(e.target.value))}
                        >
                          {usdWallets.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name_km} ({w.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {run.total_net_khr > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "600" }}>
                          កាបូប KHR (សរុប {formatKhr(run.total_net_khr)})
                        </label>
                        <select
                          className="bc-input"
                          value={selectedKhrWallet}
                          onChange={(e) => setSelectedKhrWallet(Number(e.target.value))}
                        >
                          {khrWallets.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name_km} ({w.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="bc-btn bc-btn-secondary"
                      onClick={() => setIsPaying(false)}
                      disabled={payMutation.isPending}
                    >
                      ថយក្រោយ
                    </button>
                    <button
                      type="button"
                      className="bc-btn bc-btn-primary"
                      onClick={handleConfirmPayout}
                      disabled={payMutation.isPending}
                    >
                      {payMutation.isPending ? "កំពុងកាត់ប្រាក់ & កត់ត្រា..." : "បញ្ជាក់ការកាត់ប្រាក់ខែចេញពីកាបូប"}
                    </button>
                  </div>
                </div>
              )}

              {/* Void Prompt (when user clicks "Void") */}
              {isVoiding && (
                <div className="w-panel" style={{ padding: "16px", background: "#fef8f8", border: "1px solid #ffcdd2" }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#c0392b", marginBottom: "8px" }}>
                    បញ្ជាក់ការមោឃភាពការបើកប្រាក់ខែ
                  </div>
                  <input
                    type="text"
                    className="bc-input"
                    placeholder="បញ្ចូលមូលហេតុមោឃភាព (ឧ. គណនាខុសថ្ងៃ...)"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    style={{ marginBottom: "12px" }}
                  />
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="bc-btn bc-btn-secondary"
                      onClick={() => setIsVoiding(false)}
                    >
                      បោះបង់
                    </button>
                    <button
                      type="button"
                      className="bc-btn bc-btn-primary"
                      style={{ background: "#c0392b", borderColor: "#c0392b" }}
                      onClick={handleConfirmVoid}
                      disabled={voidMutation.isPending}
                    >
                      {voidMutation.isPending ? "កំពុងមោឃភាព..." : "បញ្ជាក់មោឃភាព"}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
                {isOwner && run.status === "draft" && !isPaying && !isVoiding && (
                  <>
                    <button
                      type="button"
                      className="bc-btn bc-btn-secondary"
                      style={{ color: "#c0392b" }}
                      onClick={() => setIsVoiding(true)}
                    >
                      មោឃភាព (Void)
                    </button>
                    <button
                      type="button"
                      className="bc-btn bc-btn-primary"
                      style={{ minWidth: "160px" }}
                      onClick={() => setIsPaying(true)}
                    >
                      <BonchiIcon name="wallet" size={18} />
                      បើកប្រាក់ខែ (Disburse Payment)
                    </button>
                  </>
                )}

                {isOwner && run.status === "paid" && !isVoiding && (
                  <button
                    type="button"
                    className="bc-btn bc-btn-secondary"
                    style={{ color: "#c0392b" }}
                    onClick={() => setIsVoiding(true)}
                  >
                    មោឃភាព & សងចូលកាបូបវិញ (Void & Refund)
                  </button>
                )}

                {run && (
                  <button
                    type="button"
                    className="bc-btn bc-btn-secondary"
                    onClick={handleDownloadPdf}
                    disabled={isExportingPdf}
                    style={{ minHeight: "40px" }}
                  >
                    <BonchiIcon name="pdf" size={16} />
                    {isExportingPdf ? "កំពុងទាញយក..." : "ទាញយក PDF"}
                  </button>
                )}

                <button type="button" className="bc-btn bc-btn-secondary" onClick={onClose}>
                  បិទ
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Off-screen Printable Sheet for PDF export */}
      {run && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: `${PAYROLL_SHEET_WIDTH}px`,
            zIndex: -99999,
            pointerEvents: "none",
          }}
        >
          <PayrollPrintTemplate
            ref={printRef}
            run={run}
            preparedBy={session?.user?.name || run.created_by_name || "អ្នកគ្រប់គ្រង"}
          />
        </div>
      )}
    </>
  );
}
