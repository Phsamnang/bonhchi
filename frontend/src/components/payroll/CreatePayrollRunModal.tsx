"use client";

import React, { useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import {
  usePreviewPayroll,
  useCreatePayrollRun,
  PayrollRunItem,
  PayrollPreviewResult,
} from "@/hooks/usePayroll";
import { formatUsd, formatKhr } from "@/lib/utils";

interface CreatePayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreatePayrollRunModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePayrollRunModalProps) {
  // Default to 1st to end of current month
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDayOfMonth = new Date(year, now.getMonth() + 1, 0).getDate();

  const [startDate, setStartDate] = useState(`${year}-${month}-01`);
  const [endDate, setEndDate] = useState(`${year}-${month}-${String(lastDayOfMonth).padStart(2, "0")}`);
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState(`បើកប្រាក់ខែប្រចាំខែ ${month}/${year}`);
  const [exchangeRate, setExchangeRate] = useState<number>(4000);
  const [notes, setNotes] = useState<string>("");

  const [preview, setPreview] = useState<PayrollPreviewResult | null>(null);
  const [editableItems, setEditableItems] = useState<PayrollRunItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const previewMutation = usePreviewPayroll();
  const createRunMutation = useCreatePayrollRun();

  if (!isOpen) return null;

  const handleGeneratePreview = async () => {
    setErrorMsg("");
    try {
      const res = await previewMutation.mutateAsync({
        period_start: startDate,
        period_end: endDate,
        payout_date: payoutDate,
        exchange_rate: Number(exchangeRate) || 4000,
      });
      setPreview(res);
      setEditableItems(res.items);
    } catch (err: any) {
      setErrorMsg(err.message || "បរាជ័យក្នុងការគណនាទិន្នន័យ");
    }
  };

  const handleItemChange = (index: number, field: keyof PayrollRunItem, value: any) => {
    const updated = [...editableItems];
    const item = { ...updated[index], [field]: value };

    // Recompute gross if days_override changed
    const effectiveDays = item.days_override !== null && item.days_override !== undefined
      ? Number(item.days_override)
      : Number(item.days_counted);

    const std = item.standard_days || 26;
    const normalDays = Math.min(effectiveDays, std);
    const extraDays = Math.max(0, effectiveDays - std);
    item.gross = Math.round((normalDays * item.daily_rate + extraDays * item.daily_rate) * 100) / 100;

    // Recompute net
    const allowance = Number(item.allowance) || 0;
    const bonus = Number(item.bonus) || 0;
    const penalty = Number(item.penalty) || 0;
    const advances = Number(item.advances) || 0;
    const carryIn = Number(item.carry_in) || 0;

    const netBeforeCarry = item.gross + allowance + bonus - penalty - carryIn - advances;
    if (netBeforeCarry < 0) {
      item.carry_out = Math.round(Math.abs(netBeforeCarry) * 100) / 100;
      item.net = 0;
    } else {
      item.carry_out = 0;
      item.net = Math.round(netBeforeCarry * 100) / 100;
      if (item.currency === "KHR") {
        item.net = Math.round(item.net);
      }
    }

    updated[index] = item;
    setEditableItems(updated);
  };

  // Compute live totals
  let totalNetUSD = 0;
  let totalNetKHR = 0;
  for (const it of editableItems) {
    if (it.currency === "USD") totalNetUSD += it.net;
    else totalNetKHR += it.net;
  }

  const handleSaveDraft = async () => {
    if (!preview || editableItems.length === 0) {
      setErrorMsg("សូមគណនាមើលទិន្នន័យជាមុនសិន");
      return;
    }
    setErrorMsg("");
    try {
      await createRunMutation.mutateAsync({
        title: title.trim(),
        period_start: startDate,
        period_end: endDate,
        payout_date: payoutDate,
        exchange_rate: Number(exchangeRate) || 4000,
        notes: notes.trim() || undefined,
        items: editableItems,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "បរាជ័យក្នុងការបង្កើតការបើកប្រាក់ខែ");
    }
  };

  return (
    <>
      <div className="p-scrim" onClick={onClose} aria-label="បិទ Close" />
      <div
        className="p-sheet p-screen"
        style={{ maxHeight: "94vh", maxWidth: "980px", margin: "auto", padding: 0 }}
        role="dialog"
        aria-modal="true"
      >
        <header className="bc-appbar bc-appbar-back" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="Back">
              <BonchiIcon name="back" />
            </button>
            <div className="bc-appbar-t">
              <b>បង្កើតការបើកប្រាក់ខែថ្មី (Set Date Cycle)</b>
              <small>New Payroll Cycle & Calculation</small>
            </div>
          </div>
          <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="Close">
            <BonchiIcon name="x" size={20} />
          </button>
        </header>

        <div className="p-body" style={{ gap: "16px", padding: "16px", overflowY: "auto" }}>
          {errorMsg && (
            <div className="bc-banner bc-banner-danger" role="alert">
              <BonchiIcon name="alert" size={20} />
              <div className="bc-banner-main">{errorMsg}</div>
            </div>
          )}

          {/* Configuration Form */}
          <div className="w-panel" style={{ padding: "14px", gap: "12px", background: "#fcfbfa" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600" }}>ចំណងជើង</label>
                <input
                  type="text"
                  className="bc-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600" }}>ចាប់ពីថ្ងៃ (Start Date)</label>
                <input
                  type="date"
                  className="bc-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600" }}>ដល់ថ្ងៃ (End Date)</label>
                <input
                  type="date"
                  className="bc-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600" }}>ថ្ងៃបើកប្រាក់ខែ (Payout Date)</label>
                <input
                  type="date"
                  className="bc-input"
                  value={payoutDate}
                  onChange={(e) => setPayoutDate(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="bc-btn bc-btn-primary"
                onClick={handleGeneratePreview}
                disabled={previewMutation.isPending}
                style={{ minHeight: "40px" }}
              >
                <BonchiIcon name="chart" size={18} />
                {previewMutation.isPending ? "កំពុងគណនា..." : "គណនាផ្ទៀងផ្ទាត់វត្តមាន (Preview)"}
              </button>
            </div>
          </div>

          {/* Preview Table */}
          {preview && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontSize: "14px", fontWeight: "700" }}>
                  បញ្ជីបុគ្គលិក & ទឹកប្រាក់ត្រូវបើក ({editableItems.length} នាក់)
                </div>
                <div style={{ display: "flex", gap: "12px", fontSize: "13px", fontWeight: "700" }}>
                  {totalNetUSD > 0 && <span style={{ color: "#2e7d32" }}>សរុប: {formatUsd(totalNetUSD)}</span>}
                  {totalNetKHR > 0 && <span style={{ color: "#b34a1e" }}>សរុប: {formatKhr(totalNetKHR)}</span>}
                </div>
              </div>

              <div style={{ overflowX: "auto", border: "1px solid #e5e3de", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#f5f3ee", textAlign: "left", borderBottom: "1px solid #e5e3de" }}>
                      <th style={{ padding: "8px 10px" }}>បុគ្គលិក</th>
                      <th style={{ padding: "8px 10px" }}>ប្រាក់ខែគោល</th>
                      <th style={{ padding: "8px 10px" }}>ថ្ងៃធ្វើការ (រាប់)</th>
                      <th style={{ padding: "8px 10px" }}>កែថ្ងៃ</th>
                      <th style={{ padding: "8px 10px" }}>សរុបគោល (Gross)</th>
                      <th style={{ padding: "8px 10px" }}>ប្រាក់បន្ថែម</th>
                      <th style={{ padding: "8px 10px" }}>ពិន័យ</th>
                      <th style={{ padding: "8px 10px" }}>បុរេប្រទាន</th>
                      <th style={{ padding: "8px 10px" }}>បំណុលចាស់</th>
                      <th style={{ padding: "8px 10px", fontWeight: "700" }}>ប្រាក់ត្រូវបើក (Net)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableItems.map((item, idx) => (
                      <tr key={item.staff_id} style={{ borderBottom: "1px solid #eee", background: idx % 2 === 0 ? "#fff" : "#faf9f7" }}>
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
                          <span style={{ fontWeight: "600" }}>{item.days_counted} ថ្ងៃ</span>
                          {item.unrecorded_days > 0 && (
                            <span
                              style={{
                                marginLeft: "4px",
                                fontSize: "10px",
                                color: "#d97706",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                              title="មានថ្ងៃមិនទាន់កត់វត្តមាន"
                            >
                              <BonchiIcon name="alert" size={11} />
                              <span>{item.unrecorded_days}d</span>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "6px" }}>
                          <input
                            type="number"
                            step="0.5"
                            style={{ width: "54px", padding: "4px", fontSize: "12px", border: "1px solid #ccc", borderRadius: "4px" }}
                            value={item.days_override !== null ? item.days_override : ""}
                            placeholder={String(item.days_counted)}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "days_override",
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                          />
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: "600" }}>
                          {item.currency === "USD" ? formatUsd(item.gross) : formatKhr(item.gross)}
                        </td>
                        <td style={{ padding: "6px" }}>
                          <input
                            type="number"
                            style={{ width: "54px", padding: "4px", fontSize: "12px", border: "1px solid #ccc", borderRadius: "4px" }}
                            value={item.bonus || ""}
                            placeholder="0"
                            onChange={(e) => handleItemChange(idx, "bonus", Number(e.target.value) || 0)}
                          />
                        </td>
                        <td style={{ padding: "6px" }}>
                          <input
                            type="number"
                            style={{ width: "54px", padding: "4px", fontSize: "12px", border: "1px solid #ccc", borderRadius: "4px" }}
                            value={item.penalty || ""}
                            placeholder="0"
                            onChange={(e) => handleItemChange(idx, "penalty", Number(e.target.value) || 0)}
                          />
                        </td>
                        <td style={{ padding: "8px 10px", color: "#b34a1e" }}>
                          -{item.advances} {item.currency}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#888" }}>
                          {item.carry_in > 0 ? `-${item.carry_in}` : "0"}
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: "700", color: "#2e7d32" }}>
                          {item.currency === "USD" ? formatUsd(item.net) : formatKhr(item.net)}
                          {item.carry_out > 0 && (
                            <div style={{ fontSize: "10px", color: "#c0392b" }}>
                              ជំពាក់លើស: {item.carry_out}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="bc-btn bc-btn-secondary"
                  onClick={onClose}
                  style={{ minHeight: "44px" }}
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  className="bc-btn bc-btn-primary"
                  onClick={handleSaveDraft}
                  disabled={createRunMutation.isPending}
                  style={{ minHeight: "44px", minWidth: "180px" }}
                >
                  {createRunMutation.isPending ? "កំពុងរក្សាទុក..." : "រក្សាទុកជាព្រាង (Save Draft)"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
