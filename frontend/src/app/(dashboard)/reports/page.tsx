"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import { formatUsd, formatKhr, formatDate } from "@/lib/utils";
import { usePurchasedItems, useDailyCashflow } from "@/hooks/useReports";
import { useDashboardContext } from "../DashboardContext";
import { ReportPrintTemplate, REPORT_WIDTH } from "@/components/ReportPrintTemplate";
import { downloadReportImage, downloadReportPdf } from "@/lib/exportReport";

const PERIOD_LABEL: Record<string, string> = {
  today: "ថ្ងៃនេះ",
  yesterday: "ម្សិលមិញ",
  "7days": "7 ថ្ងៃចុងក្រោយ",
  month: "ខែនេះ",
};

/** "-$12.00" / "-5,000 ៛" for balances; a dash when zero */
function formatSigned(value: number, currency: "USD" | "KHR") {
  if (Math.abs(value) < 0.005) return "—";
  const text = currency === "USD" ? formatUsd(Math.abs(value)) : formatKhr(Math.abs(value));
  return value < 0 ? `-${text}` : text;
}

const netColor = (value: number) =>
  Math.abs(value) < 0.005 ? {} : { color: value < 0 ? "var(--danger, #B91C1C)" : "var(--success)" };

export default function ReportsPage() {
  const { session, dashboard, showToast } = useDashboardContext();
  const [mounted, setMounted] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<string>("today");
  const [view, setView] = useState<"lines" | "products">("lines");
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState<"image" | "pdf" | false>(false);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: itemsData, isLoading } = usePurchasedItems(reportPeriod);
  const { data: cashflow, isLoading: cashflowLoading } = useDailyCashflow(reportPeriod);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = itemsData?.items ?? [];
    if (!q) return all;
    return all.filter(
      (it) =>
        it.item_name.toLowerCase().includes(q) || (it.supplier_name || "").toLowerCase().includes(q)
    );
  }, [itemsData, search]);

  const invoiceCount = new Set(items.map((it) => it.invoice_id)).size;

  const totals = items.reduce(
    (t, it) => {
      const usd = it.currency === "USD" ? Number(it.line_total) : 0;
      const khr = it.currency === "KHR" ? Number(it.line_total) : 0;
      t.usd += usd;
      t.khr += khr;
      if (!it.is_paid) {
        t.unpaidUsd += usd;
        t.unpaidKhr += khr;
      }
      return t;
    },
    { usd: 0, khr: 0, unpaidUsd: 0, unpaidKhr: 0 }
  );

  const paidUsd = Math.max(0, totals.usd - totals.unpaidUsd);
  const paidKhr = Math.max(0, totals.khr - totals.unpaidKhr);

  // Group unpaid items by shop
  const owedToShops = useMemo(() => {
    const map = new Map<string, { usd: number; khr: number }>();
    items.forEach((it) => {
      if (it.is_paid) return;
      const name = it.supplier_name || "ទូទៅ";
      const cur = map.get(name) || { usd: 0, khr: 0 };
      if (it.currency === "USD") cur.usd += Number(it.line_total);
      else cur.khr += Number(it.line_total);
      map.set(name, cur);
    });
    return [...map.entries()].map(([name, ams]) => ({ name, ...ams }));
  }, [items]);

  // Roll up by product
  const byProduct = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        unit: string;
        qty: number;
        count: number;
        usd: number;
        khr: number;
        suppliers: Set<string>;
      }
    >();
    items.forEach((it) => {
      const key = `${it.item_name.trim()}|${it.unit}|${it.currency}`;
      const row =
        map.get(key) || {
          key,
          name: it.item_name.trim(),
          unit: it.unit,
          qty: 0,
          count: 0,
          usd: 0,
          khr: 0,
          suppliers: new Set<string>(),
        };
      row.qty += Number(it.quantity) || 0;
      row.count += 1;
      if (it.currency === "USD") row.usd += Number(it.line_total);
      else row.khr += Number(it.line_total);
      if (it.supplier_name) row.suppliers.add(it.supplier_name);
      map.set(key, row);
    });
    return [...map.values()].sort((a, b) => b.usd - a.usd || b.khr - a.khr);
  }, [items]);

  const paidBy = useMemo(() => {
    let qrUsd = 0;
    let qrKhr = 0;
    let cashUsd = 0;
    let cashKhr = 0;
    items.forEach((it) => {
      if (!it.is_paid) return;
      const amt = Number(it.line_total) || 0;
      const isQr = it.wallet_code === "aba" || it.wallet_code === "bakong";
      if (isQr) {
        if (it.currency === "USD") qrUsd += amt;
        else qrKhr += amt;
      } else {
        if (it.currency === "USD") cashUsd += amt;
        else cashKhr += amt;
      }
    });
    return { qrUsd, qrKhr, cashUsd, cashKhr };
  }, [items]);

  // Download Image from dedicated HTML print template (id="dc-root")
  const handleDownloadImage = async () => {
    const el = document.getElementById("dc-root") || reportRef.current;
    if (!el) {
      showToast("ទម្រង់របាយការណ៍មិនទាន់រួចរាល់ សូមរង់ចាំបន្តិច (Report template not ready)");
      return;
    }
    setIsExporting("image");
    try {
      showToast("កំពុងបង្កើតរូបភាពរបាយការណ៍ (Generating Image)...");
      const dateStr = new Date().toISOString().slice(0, 10);
      await downloadReportImage(el, `bonchi-report-${reportPeriod}-${dateStr}.png`);
      showToast("បានទាញយករូបភាពដោយជោគជ័យ!");
    } catch (err: any) {
      console.error("Export image error:", err);
      showToast("មានបញ្ហាក្នុងការបង្កើតរូបភាព: " + (err.message || "Error"));
    } finally {
      setIsExporting(false);
    }
  };

  // Download PDF from dedicated HTML print template (id="dc-root")
  const handleDownloadPdf = async () => {
    const el = document.getElementById("dc-root") || reportRef.current;
    if (!el) {
      showToast("ទម្រង់របាយការណ៍មិនទាន់រួចរាល់ សូមរង់ចាំបន្តិច (Report template not ready)");
      return;
    }
    setIsExporting("pdf");
    try {
      showToast("កំពុងបង្កើត PDF របាយការណ៍ (Generating PDF)...");
      const dateStr = new Date().toISOString().slice(0, 10);
      await downloadReportPdf(
        el,
        `bonchi-report-${reportPeriod}-${dateStr}.pdf`,
        `ភោជនីយដ្ឋាន Bonchi · ${PERIOD_LABEL[reportPeriod] || reportPeriod}`
      );
      showToast("បានទាញយក PDF ដោយជោគជ័យ!");
    } catch (err: any) {
      console.error("Export PDF error:", err);
      showToast("មានបញ្ហាក្នុងការបង្កើត PDF: " + (err.message || "Error"));
    } finally {
      setIsExporting(false);
    }
  };

  // Download CSV / Excel
  const handleDownloadCsv = () => {
    if (items.length === 0) {
      showToast("គ្មានទិន្នន័យសម្រាប់ទាញយកទេ");
      return;
    }
    let csv = "\uFEFF";
    csv +=
      "ល.រ,កាលបរិច្ឆេទ,លេខវិក្កយបត្រ,មុខទំនិញ,ហាង/អ្នកផ្គត់ផ្គង់,ចំនួន,ឯកតា,តម្លៃរាយ,រូបិយប័ណ្ណ,បង់តាម,ស្ថានភាព,សរុប USD,សរុប KHR\n";
    items.forEach((it, idx) => {
      const row = [
        idx + 1,
        `"${formatDate(it.invoice_date)}"`,
        `"${it.invoice_no}"`,
        `"${it.item_name.replace(/"/g, '""')}"`,
        `"${(it.supplier_name || "").replace(/"/g, '""')}"`,
        it.quantity,
        `"${it.unit}"`,
        it.unit_price,
        it.currency,
        `"${it.wallet_code || ""}"`,
        it.is_paid ? "Paid" : "Unpaid",
        it.currency === "USD" ? it.line_total : 0,
        it.currency === "KHR" ? it.line_total : 0,
      ];
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `bonchi-report-${reportPeriod}-${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("បានទាញយក CSV/Excel ដោយជោគជ័យ!");
  };

  return (
    <>
      {/* ─── Top Filter Bar & Actions (Dashboard Layout) ────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          {(["today", "yesterday", "7days", "month"] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={`p-chip ${reportPeriod === p ? "p-chip-on" : ""}`}
              aria-pressed={reportPeriod === p}
              onClick={() => setReportPeriod(p)}
            >
              {p === "today"
                ? "ថ្ងៃនេះ"
                : p === "yesterday"
                ? "ម្សិលមិញ"
                : p === "7days"
                ? "7 ថ្ងៃ"
                : "ខែនេះ"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            className="bc-btn bc-btn-secondary"
            onClick={handleDownloadCsv}
            style={{ minHeight: "38px", height: "38px", fontSize: "13.5px" }}
          >
            <BonchiIcon name="download" size={15} />
            ទាញយក Excel
          </button>
          <button
            type="button"
            className="bc-btn bc-btn-secondary"
            disabled={isExporting !== false}
            onClick={handleDownloadImage}
            style={{ minHeight: "38px", height: "38px", fontSize: "13.5px" }}
          >
            <BonchiIcon name="camera" size={15} />
            {isExporting === "image" ? "កំពុងបង្កើត..." : "ទាញយករូបភាព"}
          </button>
          <button
            type="button"
            className="bc-btn bc-btn-primary"
            disabled={isExporting !== false}
            onClick={handleDownloadPdf}
            style={{ minHeight: "38px", height: "38px", fontSize: "13.5px" }}
          >
            <BonchiIcon name="pdf" size={15} />
            {isExporting === "pdf" ? "កំពុងបង្កើត..." : "ទាញយក PDF"}
          </button>
        </div>
      </div>

      {/* ─── KPIs Summary (Dashboard Style) ────────────────────── */}
      <div className="w-kpis">
        <div className="w-kpi">
          <span className="w-kpi-l">ចំណាយសរុប · Total spend</span>
          <span className="w-kpi-a">{formatUsd(totals.usd)}</span>
          <span className="w-kpi-b">{formatKhr(totals.khr)}</span>
        </div>

        <div className="w-kpi">
          <span className="w-kpi-l">បានទូទាត់ · Paid</span>
          <span className="w-kpi-a" style={{ color: "var(--success)" }}>
            {formatUsd(paidUsd)}
          </span>
          <span className="w-kpi-b" style={{ color: "var(--success)" }}>
            {formatKhr(paidKhr)}
          </span>
        </div>

        <div
          className={`w-kpi ${
            totals.unpaidUsd > 0 || totals.unpaidKhr > 0 ? "w-kpi-warn" : ""
          }`}
        >
          <span className="w-kpi-l" style={{ color: "var(--ink)", fontWeight: 600 }}>
            ត្រូវបង់បន្ថែម · Still to pay
          </span>
          <span className="w-kpi-a" style={{ color: "var(--warning)" }}>
            {formatUsd(totals.unpaidUsd)}
          </span>
          <span className="w-kpi-b" style={{ color: "var(--warning)" }}>
            {formatKhr(totals.unpaidKhr)}
          </span>
        </div>

        <div className="w-kpi">
          <span className="w-kpi-l">បង់តាម · Paid by</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
            <span style={{ fontSize: "13.5px", lineHeight: "20px", fontVariantNumeric: "tabular-nums" }}>
              <span className="w-pill w-pill-qr" style={{ padding: "1px 7px", fontSize: "11px" }}>
                QR
              </span>{" "}
              <b>{formatUsd(paidBy.qrUsd)}</b>
              {paidBy.qrKhr > 0 ? ` · ${formatKhr(paidBy.qrKhr)}` : ""}
            </span>
            <span style={{ fontSize: "13.5px", lineHeight: "20px", fontVariantNumeric: "tabular-nums" }}>
              <span className="w-pill w-pill-cash" style={{ padding: "1px 7px", fontSize: "11px" }}>
                Cash
              </span>{" "}
              <b>{formatUsd(paidBy.cashUsd)}</b>
              {paidBy.cashKhr > 0 ? ` · ${formatKhr(paidBy.cashKhr)}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Daily income vs expense ─────────────────────────────── */}
      <section className="w-panel">
        <h2 style={{ margin: 0, fontSize: "18px" }}>
          ចំណូល-ចំណាយប្រចាំថ្ងៃ · Daily income & expense{" "}
          <small style={{ fontSize: "13px", color: "var(--ink-muted)", fontWeight: 400 }}>
            {PERIOD_LABEL[reportPeriod]}
          </small>
        </h2>
        <div className="w-tablewrap">
          <table className="w-table" style={{ fontSize: "12.5px", lineHeight: "18px", minWidth: "720px" }}>
            <thead>
              <tr style={{ height: "28px" }}>
                <th style={{ width: "110px", padding: "4px 8px" }}>កាលបរិច្ឆេទ</th>
                <th className="num" style={{ padding: "4px 8px" }}>ចំណូល $</th>
                <th className="num" style={{ padding: "4px 8px" }}>ចំណូល ៛</th>
                <th className="num" style={{ padding: "4px 8px" }}>ចំណាយ $</th>
                <th className="num" style={{ padding: "4px 8px" }}>ចំណាយ ៛</th>
                <th className="num" style={{ padding: "4px 8px" }}>សមតុល្យ $</th>
                <th className="num" style={{ padding: "4px 8px" }}>សមតុល្យ ៛</th>
              </tr>
            </thead>
            <tbody>
              {cashflow && cashflow.days.length > 0 ? (
                cashflow.days.map((d) => (
                  <tr
                    key={d.date}
                    style={{
                      height: "28px",
                      color: d.income_count + d.expense_count === 0 ? "var(--ink-muted)" : undefined,
                    }}
                  >
                    <td style={{ padding: "3px 8px", whiteSpace: "nowrap" }}>{formatDate(d.date)}</td>
                    <td className="num" style={{ padding: "3px 8px" }}>{d.income_usd ? formatUsd(d.income_usd) : "—"}</td>
                    <td className="num" style={{ padding: "3px 8px" }}>{d.income_khr ? formatKhr(d.income_khr) : "—"}</td>
                    <td className="num" style={{ padding: "3px 8px" }}>{d.expense_usd ? formatUsd(d.expense_usd) : "—"}</td>
                    <td className="num" style={{ padding: "3px 8px" }}>{d.expense_khr ? formatKhr(d.expense_khr) : "—"}</td>
                    <td className="num" style={{ padding: "3px 8px", fontWeight: 700, ...netColor(d.net_usd) }}>
                      {formatSigned(d.net_usd, "USD")}
                    </td>
                    <td className="num" style={{ padding: "3px 8px", fontWeight: 700, ...netColor(d.net_khr) }}>
                      {formatSigned(d.net_khr, "KHR")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-4 p-muted">
                    {cashflowLoading ? "កំពុងទាញទិន្នន័យ..." : "គ្មានទិន្នន័យ"}
                  </td>
                </tr>
              )}
            </tbody>
            {cashflow && cashflow.days.length > 1 && (
              <tfoot>
                <tr style={{ height: "30px" }}>
                  <td style={{ padding: "5px 8px" }}>សរុប · Total</td>
                  <td className="num" style={{ padding: "5px 8px" }}>{formatUsd(cashflow.totals.income_usd)}</td>
                  <td className="num" style={{ padding: "5px 8px" }}>{formatKhr(cashflow.totals.income_khr)}</td>
                  <td className="num" style={{ padding: "5px 8px" }}>{formatUsd(cashflow.totals.expense_usd)}</td>
                  <td className="num" style={{ padding: "5px 8px" }}>{formatKhr(cashflow.totals.expense_khr)}</td>
                  <td className="num" style={{ padding: "5px 8px", ...netColor(cashflow.totals.net_usd) }}>
                    {formatSigned(cashflow.totals.net_usd, "USD")}
                  </td>
                  <td className="num" style={{ padding: "5px 8px", ...netColor(cashflow.totals.net_khr) }}>
                    {formatSigned(cashflow.totals.net_khr, "KHR")}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {cashflow && (cashflow.totals.other_usd > 0 || cashflow.totals.other_khr > 0) && (
          <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-muted)" }}>
            * ចំណាយរួមបញ្ចូលចំណាយតូចតាច{" "}
            {[
              cashflow.totals.other_usd > 0 ? formatUsd(cashflow.totals.other_usd) : "",
              cashflow.totals.other_khr > 0 ? formatKhr(cashflow.totals.other_khr) : "",
            ]
              .filter(Boolean)
              .join(" + ")}{" "}
            ដែលមិនមានក្នុងបញ្ជីមុខទំនិញខាងក្រោម
          </p>
        )}
      </section>

      {/* ─── Main Panel: Items Bought (Dashboard Style with Compact Rows) */}
      <section className="w-panel">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "18px" }}>
              មុខទំនិញដែលបានទិញ · Items bought{" "}
              <small style={{ fontSize: "13px", color: "var(--ink-muted)", fontWeight: 400 }}>
                {PERIOD_LABEL[reportPeriod]} · {items.length} មុខ · {invoiceCount} វិក្កយបត្រ
              </small>
            </h2>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <label className="w-search" style={{ width: "220px", height: "36px", padding: "2px 10px" }}>
              <BonchiIcon name="search" size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ស្វែងរកទំនិញ ឬ ហាង..."
                style={{ fontSize: "12.5px" }}
              />
            </label>

            {(["lines", "products"] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={`p-chip ${view === v ? "p-chip-on" : ""}`}
                aria-pressed={view === v}
                onClick={() => setView(v)}
                style={{ height: "36px", padding: "0 12px" }}
              >
                {v === "lines" ? "តាមវិក្កយបត្រ" : "សរុបតាមទំនិញ"}
              </button>
            ))}
          </div>
        </div>

        {/* Compact Table (Small Height Rows, High Density) */}
        <div className="w-tablewrap">
          {view === "lines" ? (
            <table
              className="w-table"
              style={{ fontSize: "12px", lineHeight: "16px", minWidth: "850px" }}
            >
              <thead>
                <tr style={{ height: "28px" }}>
                  <th style={{ width: "32px", padding: "4px 8px", textAlign: "center" }}>#</th>
                  <th style={{ width: "120px", padding: "4px 8px" }}>កាលបរិច្ឆេទ</th>
                  <th style={{ padding: "4px 8px" }}>មុខទំនិញ</th>
                  <th style={{ width: "130px", padding: "4px 8px" }}>ហាង / អ្នកផ្គត់ផ្គង់</th>
                  <th className="num" style={{ width: "70px", padding: "4px 8px" }}>
                    ចំនួន
                  </th>
                  <th className="num" style={{ width: "80px", padding: "4px 8px" }}>
                    តម្លៃរាយ
                  </th>
                  <th style={{ width: "65px", padding: "4px 8px", textAlign: "center" }}>
                    បង់តាម
                  </th>
                  <th style={{ width: "75px", padding: "4px 8px", textAlign: "center" }}>
                    ស្ថានភាព
                  </th>
                  <th className="num" style={{ width: "85px", padding: "4px 8px" }}>
                    សរុប $
                  </th>
                  <th className="num" style={{ width: "85px", padding: "4px 8px" }}>
                    សរុប ៛
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((it, idx) => (
                    <tr
                      key={it.id}
                      style={{
                        height: "26px",
                        background: idx % 2 === 0 ? "transparent" : "var(--surface)",
                      }}
                    >
                      <td
                        style={{
                          textAlign: "center",
                          padding: "3px 8px",
                          color: "var(--ink-muted)",
                          fontSize: "11px",
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          padding: "3px 8px",
                          color: "var(--ink-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(it.invoice_date)}{" "}
                        <span style={{ fontSize: "10.5px", color: "var(--line-strong)" }}>
                          ({it.invoice_no})
                        </span>
                      </td>
                      <td style={{ padding: "3px 8px", fontWeight: 600 }}>{it.item_name}</td>
                      <td style={{ padding: "3px 8px", color: "var(--ink-muted)" }}>
                        {it.supplier_name || "ទូទៅ"}
                      </td>
                      <td
                        className="num"
                        style={{
                          padding: "3px 8px",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {it.quantity} {it.unit}
                      </td>
                      <td className="num" style={{ padding: "3px 8px", whiteSpace: "nowrap" }}>
                        {it.currency === "USD"
                          ? formatUsd(it.unit_price)
                          : formatKhr(it.unit_price)}
                      </td>
                      <td style={{ textAlign: "center", padding: "3px 8px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "1px 5px",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            lineHeight: "13px",
                            borderRadius: "3px",
                            letterSpacing: "0.2px",
                            background:
                              it.wallet_code === "aba"
                                ? "#E8F0FE"
                                : it.wallet_code === "bakong"
                                ? "#FCE8F3"
                                : "#F1F3F4",
                            color:
                              it.wallet_code === "aba"
                                ? "#1967D2"
                                : it.wallet_code === "bakong"
                                ? "#C2185B"
                                : "#3C4043",
                            border: `1px solid ${
                              it.wallet_code === "aba"
                                ? "#D2E3FC"
                                : it.wallet_code === "bakong"
                                ? "#F8BBD0"
                                : "#DADCE0"
                            }`,
                          }}
                        >
                          {it.wallet_code ? it.wallet_code.toUpperCase() : "—"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", padding: "3px 8px" }}>
                        {it.is_paid ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "1px 5px",
                              fontSize: "9.5px",
                              fontWeight: 700,
                              lineHeight: "13px",
                              borderRadius: "3px",
                              background: "#E6F4EA",
                              color: "#137333",
                              border: "1px solid #CEEAD6",
                            }}
                          >
                            ✓ បង់រួច
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "1px 5px",
                              fontSize: "9.5px",
                              fontWeight: 700,
                              lineHeight: "13px",
                              borderRadius: "3px",
                              background: "#FEF7E0",
                              color: "#B06000",
                              border: "1px solid #FEEFC3",
                            }}
                          >
                            ! ជំពាក់
                          </span>
                        )}
                      </td>
                      <td
                        className="num"
                        style={{ padding: "3px 8px", whiteSpace: "nowrap" }}
                      >
                        {it.currency === "USD" ? (
                          <b style={{ color: "var(--ink)" }}>{formatUsd(it.line_total)}</b>
                        ) : (
                          <span style={{ color: "var(--line-strong)" }}>—</span>
                        )}
                      </td>
                      <td
                        className="num"
                        style={{ padding: "3px 8px", whiteSpace: "nowrap" }}
                      >
                        {it.currency === "KHR" ? (
                          <b style={{ color: "var(--ink)" }}>{formatKhr(it.line_total)}</b>
                        ) : (
                          <span style={{ color: "var(--line-strong)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center p-4 p-muted">
                      {isLoading ? "កំពុងទាញទិន្នន័យ..." : "គ្មានទិន្នន័យ"}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ height: "30px" }}>
                  <td style={{ padding: "5px 8px" }}></td>
                  <td colSpan={7} style={{ padding: "5px 8px" }}>
                    សរុប · Total
                    {(totals.unpaidUsd > 0 || totals.unpaidKhr > 0) && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "11.5px",
                          color: "var(--warning)",
                        }}
                      >
                        (ជំពាក់: {totals.unpaidUsd > 0 && formatUsd(totals.unpaidUsd)}
                        {totals.unpaidUsd > 0 && totals.unpaidKhr > 0 && " + "}
                        {totals.unpaidKhr > 0 && formatKhr(totals.unpaidKhr)})
                      </span>
                    )}
                  </td>
                  <td className="num" style={{ padding: "5px 8px" }}>
                    {formatUsd(totals.usd)}
                  </td>
                  <td className="num" style={{ padding: "5px 8px" }}>
                    {formatKhr(totals.khr)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table
              className="w-table"
              style={{ fontSize: "12px", lineHeight: "16px", minWidth: "750px" }}
            >
              <thead>
                <tr style={{ height: "28px" }}>
                  <th style={{ width: "32px", padding: "4px 8px", textAlign: "center" }}>#</th>
                  <th style={{ padding: "4px 8px" }}>មុខទំនិញ</th>
                  <th style={{ padding: "4px 8px" }}>ហាង / អ្នកផ្គត់ផ្គង់</th>
                  <th className="num" style={{ padding: "4px 8px" }}>
                    ចំនួនសរុប
                  </th>
                  <th className="num" style={{ width: "80px", padding: "4px 8px" }}>
                    ទិញ (ដង)
                  </th>
                  <th className="num" style={{ width: "100px", padding: "4px 8px" }}>
                    សរុប $
                  </th>
                  <th className="num" style={{ width: "100px", padding: "4px 8px" }}>
                    សរុប ៛
                  </th>
                </tr>
              </thead>
              <tbody>
                {byProduct.length > 0 ? (
                  byProduct.map((p, idx) => (
                    <tr
                      key={p.key}
                      style={{
                        height: "26px",
                        background: idx % 2 === 0 ? "transparent" : "var(--surface)",
                      }}
                    >
                      <td
                        style={{
                          textAlign: "center",
                          padding: "3px 8px",
                          color: "var(--ink-muted)",
                          fontSize: "11px",
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td style={{ padding: "3px 8px", fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: "3px 8px", color: "var(--ink-muted)" }}>
                        {[...p.suppliers].join(", ")}
                      </td>
                      <td className="num" style={{ padding: "3px 8px", fontWeight: 600 }}>
                        {Number(p.qty.toFixed(2))} {p.unit}
                      </td>
                      <td className="num" style={{ padding: "3px 8px" }}>
                        {p.count}
                      </td>
                      <td className="num" style={{ padding: "3px 8px", fontWeight: 700 }}>
                        {p.usd > 0 ? formatUsd(p.usd) : "—"}
                      </td>
                      <td
                        className="num"
                        style={{ padding: "3px 8px", color: "var(--ink-muted)" }}
                      >
                        {p.khr > 0 ? formatKhr(p.khr) : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center p-4 p-muted">
                      {isLoading ? "កំពុងទាញទិន្នន័យ..." : "គ្មានទិន្នន័យ"}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ height: "30px" }}>
                  <td style={{ padding: "5px 8px" }}></td>
                  <td colSpan={4} style={{ padding: "5px 8px" }}>
                    សរុប · Total
                  </td>
                  <td className="num" style={{ padding: "5px 8px" }}>
                    {formatUsd(totals.usd)}
                  </td>
                  <td className="num" style={{ padding: "5px 8px" }}>
                    {formatKhr(totals.khr)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </section>

      {/* ─── DEDICATED HTML EXPORT TEMPLATE (Rendered off-screen for PNG/PDF) ─── */}
      {mounted && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: `${REPORT_WIDTH}px`,
            zIndex: -99999,
            pointerEvents: "none",
          }}
        >
          <ReportPrintTemplate
            ref={reportRef}
            reportPeriod={reportPeriod}
            view={view}
            items={items}
            byProduct={byProduct}
            totals={totals}
            paidUsd={paidUsd}
            paidKhr={paidKhr}
            paidBy={paidBy}
            owedToShops={owedToShops}
            userName={session?.user?.name || "អ្នកគ្រប់គ្រង"}
            cashflow={cashflow}
          />
        </div>
      )}
    </>
  );
}
