"use client";

import React, { useEffect, useRef, useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import { useMonthlyReport } from "@/hooks/useReports";
import { KH_MONTHS, pad } from "@/lib/khmerDate";
import { downloadReportImage, downloadReportPdf, loadReportFonts } from "@/lib/exportReport";
import { useDashboardContext } from "@/app/(dashboard)/DashboardContext";
import { MonthlySheet, MONTHLY_SHEET_WIDTH, type DisplayCurrency } from "./MonthlySheet";

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** Monthly brief report: pick a month, read it on screen, export it as PDF or image. */
export default function MonthlyReport() {
  const { session, showToast } = useDashboardContext();
  const [month, setMonth] = useState(thisMonth);
  const [currency, setCurrency] = useState<DisplayCurrency>("USD");
  const [exporting, setExporting] = useState<"pdf" | "image" | null>(null);
  const { data: report, isLoading, isError } = useMonthlyReport(month);

  const exportRef = useRef<HTMLDivElement>(null);
  const previewBox = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Same fonts as the export, so the preview looks like the PDF
  useEffect(() => {
    loadReportFonts().catch(() => undefined);
  }, []);

  // Fit the A4-width sheet into the panel on screen (the export copy stays full size)
  useEffect(() => {
    const el = previewBox.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / MONTHLY_SHEET_WIDTH));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [report]);

  const [y, m] = month.split("-").map(Number);
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const preparedBy = session?.user?.name || "អ្នកគ្រប់គ្រង";

  const handleExport = async (kind: "pdf" | "image") => {
    const el = exportRef.current;
    if (!el || !report) return;
    setExporting(kind);
    try {
      const name = `bonchi-monthly-report-${month}`;
      if (kind === "pdf") {
        await downloadReportPdf(el, `${name}.pdf`, `ភោជនីយដ្ឋាន Bonchi · របាយការណ៍ខែ${KH_MONTHS[m - 1]} ${y}`);
      } else {
        await downloadReportImage(el, `${name}.png`);
      }
      showToast(kind === "pdf" ? "បានទាញយក PDF" : "បានទាញយករូបភាព", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "មានបញ្ហាក្នុងការទាញយក", "error");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button type="button" className="bc-iconbtn" aria-label="ខែមុន" onClick={() => shift(-1)} style={{ fontSize: 22, fontWeight: 700 }}>
            ‹
          </button>
          <b style={{ minWidth: "130px", textAlign: "center", fontSize: "16px" }}>
            ខែ{KH_MONTHS[m - 1]} {y}
          </b>
          <button
            type="button"
            className="bc-iconbtn"
            aria-label="ខែបន្ទាប់"
            onClick={() => shift(1)}
            disabled={month >= thisMonth()}
            style={{ fontSize: 22, fontWeight: 700 }}
          >
            ›
          </button>
          {month !== thisMonth() && (
            <button type="button" className="p-chip" onClick={() => setMonth(thisMonth())}>
              ខែនេះ
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          <div className="bc-seg" title="រូបិយប័ណ្ណសម្រាប់តារាងប្រចាំថ្ងៃ">
            <button type="button" aria-pressed={currency === "USD"} onClick={() => setCurrency("USD")} style={{ minWidth: 56, minHeight: 34 }}>
              $
            </button>
            <button type="button" aria-pressed={currency === "KHR"} onClick={() => setCurrency("KHR")} style={{ minWidth: 56, minHeight: 34 }}>
              ៛
            </button>
          </div>
          <button
            type="button"
            className="bc-btn bc-btn-secondary"
            disabled={!report || exporting !== null}
            onClick={() => handleExport("image")}
            style={{ minHeight: "38px", fontSize: "13.5px" }}
          >
            <BonchiIcon name="camera" size={15} />
            {exporting === "image" ? "កំពុងបង្កើត..." : "រូបភាព"}
          </button>
          <button
            type="button"
            className="bc-btn bc-btn-primary"
            disabled={!report || exporting !== null}
            onClick={() => handleExport("pdf")}
            style={{ minHeight: "38px", fontSize: "13.5px" }}
          >
            <BonchiIcon name="pdf" size={15} />
            {exporting === "pdf" ? "កំពុងបង្កើត..." : "ទាញយក PDF"}
          </button>
        </div>
      </div>

      {/* The report itself, scaled to fit */}
      <section className="w-panel" style={{ padding: "12px", overflow: "hidden" }}>
        {isLoading && <p className="p-muted" style={{ padding: "40px", textAlign: "center" }}>កំពុងផ្ទុករបាយការណ៍...</p>}
        {isError && <p className="p-muted" style={{ padding: "40px", textAlign: "center" }}>មិនអាចផ្ទុករបាយការណ៍បានទេ</p>}
        <div ref={previewBox} style={{ width: "100%" }}>
          {report && (
            <div style={{ zoom: scale, width: `${MONTHLY_SHEET_WIDTH}px`, margin: "0 auto", boxShadow: "0 1px 6px rgba(0,0,0,.08)" }}>
              <MonthlySheet report={report} currency={currency} preparedBy={preparedBy} />
            </div>
          )}
        </div>
      </section>

      {/* Full-size copy used for PDF/image export (measured by the page splitter) */}
      {report && (
        <div style={{ position: "fixed", left: 0, top: 0, width: `${MONTHLY_SHEET_WIDTH}px`, zIndex: -99999, pointerEvents: "none" }}>
          <MonthlySheet ref={exportRef} report={report} currency={currency} preparedBy={preparedBy} />
        </div>
      )}
    </div>
  );
}
