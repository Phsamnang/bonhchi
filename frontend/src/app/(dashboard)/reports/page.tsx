"use client";

import React, { useMemo, useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import { formatUsd, formatKhr, formatDate } from "@/lib/utils";
import { usePurchasedItems } from "@/hooks/useReports";
import { useDashboardContext } from "../DashboardContext";

const PERIOD_LABEL: Record<string, string> = {
  today: "ថ្ងៃនេះ",
  yesterday: "ម្សិលមិញ",
  "7days": "7 ថ្ងៃចុងក្រោយ",
  month: "ខែនេះ",
};

export default function ReportsPage() {
  const { dashboard, oweUsd, oweKhr, showToast } = useDashboardContext();
  const [reportPeriod, setReportPeriod] = useState<string>("today");
  const [view, setView] = useState<"lines" | "products">("lines");
  const [search, setSearch] = useState("");

  const { data: itemsData, isLoading } = usePurchasedItems(reportPeriod);

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

  // Same product + unit + currency rolled up into one row
  const byProduct = useMemo(() => {
    const map = new Map<
      string,
      { key: string; name: string; unit: string; qty: number; count: number; usd: number; khr: number; suppliers: Set<string> }
    >();
    items.forEach((it) => {
      const key = `${it.item_name.trim()}|${it.unit}|${it.currency}`;
      const row =
        map.get(key) ||
        { key, name: it.item_name.trim(), unit: it.unit, qty: 0, count: 0, usd: 0, khr: 0, suppliers: new Set<string>() };
      row.qty += Number(it.quantity) || 0;
      row.count += 1;
      if (it.currency === "USD") row.usd += Number(it.line_total);
      else row.khr += Number(it.line_total);
      if (it.supplier_name) row.suppliers.add(it.supplier_name);
      map.set(key, row);
    });
    return [...map.values()].sort((a, b) => b.usd - a.usd || b.khr - a.khr);
  }, [items]);

  return (
    <>
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
        <span className="p-grow" />
        <button
          type="button"
          className="bc-btn bc-btn-secondary"
          onClick={() => showToast("កំពុងទាញយកឯកសារ Excel...")}
          style={{ minHeight: "40px" }}
        >
          ទាញយក Excel
        </button>
        <button
          type="button"
          className="bc-btn bc-btn-primary"
          onClick={() => showToast("កំពុងបង្កើតរូបភាព / PDF...")}
          style={{ minHeight: "40px" }}
        >
          នាំចេញរូបភាព / PDF
        </button>
      </div>

      {/* KPIs Summary */}
      <div className="w-kpis">
        <div className="w-kpi">
          <span className="w-kpi-l">ចំណាយសរុប · Total spend</span>
          <span className="w-kpi-a">{formatUsd(dashboard?.expense_today.usd ?? 96)}</span>
          <span className="w-kpi-b">{formatKhr(dashboard?.expense_today.khr ?? 63000)}</span>
        </div>
        <div className="w-kpi">
          <span className="w-kpi-l">ចំណូលសរុប · Total income</span>
          <span className="w-kpi-a" style={{ color: "var(--income)" }}>
            {formatUsd(dashboard?.income_today.usd ?? 63.2)}
          </span>
          <span className="w-kpi-b" style={{ color: "var(--income)" }}>
            {formatKhr(dashboard?.income_today.khr ?? 0)}
          </span>
        </div>
        <div className="w-kpi w-kpi-warn">
          <span className="w-kpi-l" style={{ color: "var(--ink)", fontWeight: 600 }}>
            ត្រូវបង់បន្ថែម · Still to pay
          </span>
          <span className="w-kpi-a" style={{ color: "var(--warning)" }}>
            {formatUsd(oweUsd)}
          </span>
          <span className="w-kpi-b" style={{ color: "var(--warning)" }}>
            {formatKhr(oweKhr)}
          </span>
        </div>
        <div className="w-kpi">
          <span className="w-kpi-l">បង់តាម · Paid by</span>
          <span style={{ font: "600 15px/26px var(--font-sans)" }}>
            <span className="w-pill w-pill-qr">QR</span> {formatUsd(63.2)}
          </span>
          <span style={{ font: "600 15px/26px var(--font-sans)" }}>
            <span className="w-pill w-pill-cash">Cash</span> {formatKhr(63000)}
          </span>
        </div>
      </div>

      {/* Purchased Items Report */}
      <section className="w-panel">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>
            មុខទំនិញដែលបានទិញ · Items bought{" "}
            <small>
              {PERIOD_LABEL[reportPeriod]} · {items.length} មុខ · {invoiceCount} វិក្កយបត្រ
            </small>
          </h2>
          <span className="p-grow" />
          <label className="w-search" style={{ maxWidth: "220px", padding: "4px 8px" }}>
            <BonchiIcon name="search" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ស្វែងរកទំនិញ ឬ ហាង..."
              style={{ fontSize: "13px" }}
            />
          </label>
          {(["lines", "products"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={`p-chip ${view === v ? "p-chip-on" : ""}`}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {v === "lines" ? "តាមវិក្កយបត្រ" : "សរុបតាមទំនិញ"}
            </button>
          ))}
        </div>

        <div className="w-tablewrap">
          {view === "lines" ? (
            <table className="w-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>កាលបរិច្ឆេទ</th>
                  <th>មុខទំនិញ</th>
                  <th>ហាង / អ្នកផ្គត់ផ្គង់</th>
                  <th className="num">ចំនួន</th>
                  <th className="num">តម្លៃរាយ</th>
                  <th>បង់តាម</th>
                  <th>ស្ថានភាព</th>
                  <th className="num">សរុប $</th>
                  <th className="num">សរុប ៛</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="p-muted">{idx + 1}</td>
                      <td className="p-muted" style={{ whiteSpace: "nowrap" }}>
                        {formatDate(it.invoice_date)}
                        <div style={{ fontSize: "11px" }}>{it.invoice_no}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{it.item_name}</td>
                      <td className="p-muted">{it.supplier_name}</td>
                      <td className="num">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="num">
                        {it.currency === "USD" ? formatUsd(it.unit_price) : formatKhr(it.unit_price)}
                      </td>
                      <td>
                        <span
                          className={`w-pill ${
                            it.wallet_code === "aba" || it.wallet_code === "bakong" ? "w-pill-qr" : "w-pill-cash"
                          }`}
                        >
                          {(it.wallet_code || "").toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "6px",
                            background: it.is_paid ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.2)",
                            color: it.is_paid ? "#059669" : "#d97706",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {it.is_paid ? "✓ បង់រួច" : "⏳ ជំពាក់"}
                        </span>
                      </td>
                      <td className="num">{it.currency === "USD" ? formatUsd(it.line_total) : "—"}</td>
                      <td className="num">{it.currency === "KHR" ? formatKhr(it.line_total) : "—"}</td>
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
                <tr>
                  <td></td>
                  <td colSpan={7}>
                    សរុប · Total
                    {(totals.unpaidUsd > 0 || totals.unpaidKhr > 0) && (
                      <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--warning)" }}>
                        (ជំពាក់: {totals.unpaidUsd > 0 && formatUsd(totals.unpaidUsd)}
                        {totals.unpaidUsd > 0 && totals.unpaidKhr > 0 && " + "}
                        {totals.unpaidKhr > 0 && formatKhr(totals.unpaidKhr)})
                      </span>
                    )}
                  </td>
                  <td className="num">{formatUsd(totals.usd)}</td>
                  <td className="num">{formatKhr(totals.khr)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="w-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>មុខទំនិញ</th>
                  <th>ហាង / អ្នកផ្គត់ផ្គង់</th>
                  <th className="num">ចំនួនសរុប</th>
                  <th className="num">ទិញ (ដង)</th>
                  <th className="num">សរុប $</th>
                  <th className="num">សរុប ៛</th>
                </tr>
              </thead>
              <tbody>
                {byProduct.length > 0 ? (
                  byProduct.map((p, idx) => (
                    <tr key={p.key}>
                      <td className="p-muted">{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td className="p-muted">{[...p.suppliers].join(", ")}</td>
                      <td className="num">
                        {Number(p.qty.toFixed(2))} {p.unit}
                      </td>
                      <td className="num">{p.count}</td>
                      <td className="num">{p.usd > 0 ? formatUsd(p.usd) : "—"}</td>
                      <td className="num">{p.khr > 0 ? formatKhr(p.khr) : "—"}</td>
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
                <tr>
                  <td></td>
                  <td colSpan={4}>សរុប · Total</td>
                  <td className="num">{formatUsd(totals.usd)}</td>
                  <td className="num">{formatKhr(totals.khr)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
