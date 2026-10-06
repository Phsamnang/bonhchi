import React, { forwardRef } from "react";
import { formatUsd, formatKhr, formatDate } from "@/lib/utils";
import type { PurchasedItem } from "@/hooks/useReports";

const PERIOD_LABEL: Record<string, string> = {
  today: "ថ្ងៃនេះ",
  yesterday: "ម្សិលមិញ",
  "7days": "7 ថ្ងៃចុងក្រោយ",
  month: "ខែនេះ",
};

export interface ReportPrintTemplateProps {
  reportPeriod: string;
  view: "lines" | "products";
  items: PurchasedItem[];
  byProduct: Array<{
    key: string;
    name: string;
    unit: string;
    qty: number;
    count: number;
    usd: number;
    khr: number;
    suppliers: Set<string>;
  }>;
  totals: {
    usd: number;
    khr: number;
    unpaidUsd: number;
    unpaidKhr: number;
  };
  paidUsd: number;
  paidKhr: number;
  paidBy: {
    qrUsd: number;
    qrKhr: number;
    cashUsd: number;
    cashKhr: number;
  };
  owedToShops: Array<{
    name: string;
    usd: number;
    khr: number;
  }>;
  userName?: string;
}

export const ReportPrintTemplate = forwardRef<HTMLDivElement, ReportPrintTemplateProps>(
  function ReportPrintTemplate(
    {
      reportPeriod,
      view,
      items,
      byProduct,
      totals,
      paidUsd,
      paidKhr,
      paidBy,
      owedToShops,
      userName = "អ្នកគ្រប់គ្រង",
    },
    ref
  ) {
    const shopCount = new Set(items.map((it) => it.supplier_name)).size;
    const unpaidItemsCount = items.filter((it) => !it.is_paid).length;
    const approxConvertedKhr = Math.round(totals.usd * 4000 + totals.khr);

    const renderSplitPayment = (usd: number, khr: number) => {
      if (usd > 0 && khr > 0) {
        return (
          <span style={{ fontWeight: 700, color: "#0F172A" }}>
            {formatUsd(usd)}
            <span style={{ color: "#64748B", fontSize: "11px", marginLeft: "4px" }}>
              + {formatKhr(khr)}
            </span>
          </span>
        );
      }
      if (usd > 0) {
        return <span style={{ fontWeight: 700, color: "#0F172A" }}>{formatUsd(usd)}</span>;
      }
      if (khr > 0) {
        return <span style={{ fontWeight: 700, color: "#0F172A" }}>{formatKhr(khr)}</span>;
      }
      return <span style={{ fontWeight: 600, color: "#94A3B8" }}>$0.00</span>;
    };

    return (
      <div
        id="dc-root"
        ref={ref}
        style={{
          width: "1020px",
          minWidth: "1020px",
          maxWidth: "1020px",
          boxSizing: "border-box",
          padding: "28px 32px",
          background: "#FFFFFF",
          color: "#0F172A",
          fontFamily:
            '"Kantumruy Pro", "Noto Sans Khmer", "Khmer OS Siemreap", system-ui, sans-serif',
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          margin: "0 auto",
        }}
      >
        {/* ─── 1. HEADER (STABLE TABLE-BASED LAYOUT) ────────────── */}
        <header style={{ paddingBottom: "14px", borderBottom: "3px solid #0B5D4B" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td style={{ verticalAlign: "bottom", textAlign: "left", padding: 0 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: "20px",
                      color: "#0B5D4B",
                      fontWeight: 700,
                      marginBottom: "2px",
                    }}
                  >
                    <span>ភោជនីយដ្ឋាន Bonchi</span>
                  </div>
                  <h1
                    style={{
                      margin: "2px 0",
                      fontSize: "24px",
                      lineHeight: "32px",
                      fontWeight: 700,
                      color: "#0F172A",
                    }}
                  >
                    របាយការណ៍ចំណាយប្រចាំថ្ងៃ
                  </h1>
                  <div
                    style={{ fontSize: "13px", lineHeight: "20px", color: "#64748B" }}
                    suppressHydrationWarning
                  >
                    Daily expense report ·{" "}
                    <b style={{ color: "#334155" }}>{PERIOD_LABEL[reportPeriod] || reportPeriod}</b> ·{" "}
                    {new Date().toLocaleDateString("km-KH", {
                      weekday: "long",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </td>
                <td
                  style={{ verticalAlign: "bottom", textAlign: "right", width: "360px", padding: 0 }}
                  suppressHydrationWarning
                >
                  <div style={{ fontSize: "13px", lineHeight: "22px", color: "#475569" }}>
                    រៀបចំដោយ <b style={{ color: "#0F172A" }}>{userName}</b>
                  </div>
                  <div style={{ fontSize: "12.5px", lineHeight: "22px", color: "#64748B", marginTop: "2px" }}>
                    <b style={{ color: "#0F172A" }}>{items.length} មុខ</b> ·{" "}
                    <b style={{ color: "#0F172A" }}>{shopCount} ហាង</b> ·{" "}
                    {unpaidItemsCount > 0 ? (
                      <b style={{ color: "#D97706" }}>{unpaidItemsCount} មិនទាន់ទូទាត់</b>
                    ) : (
                      <b style={{ color: "#15803D" }}>✓ ទូទាត់រួចទាំងអស់</b>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </header>

        {/* ─── 2. 4 KPIS METRIC CARDS ───────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          {/* Card 1: Total Spend */}
          <div
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "12px 14px",
              background: "#F8FAFC",
            }}
          >
            <div style={{ fontSize: "12px", lineHeight: "16px", color: "#64748B", fontWeight: 600 }}>
              ចំណាយសរុប · Total spend
            </div>
            <div
              style={{
                fontSize: "21px",
                lineHeight: "28px",
                fontWeight: 700,
                color: "#0F172A",
                fontVariantNumeric: "tabular-nums",
                marginTop: "2px",
              }}
            >
              {formatUsd(totals.usd)}
            </div>
            <div
              style={{
                fontSize: "12.5px",
                lineHeight: "18px",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: "#64748B",
              }}
            >
              {formatKhr(totals.khr)}
            </div>
          </div>

          {/* Card 2: Paid */}
          <div
            style={{
              border: "1px solid #BBF7D0",
              borderRadius: "10px",
              padding: "12px 14px",
              background: "#F0FDF4",
            }}
          >
            <div style={{ fontSize: "12px", lineHeight: "16px", color: "#166534", fontWeight: 600 }}>
              បានទូទាត់ · Paid
            </div>
            <div
              style={{
                fontSize: "21px",
                lineHeight: "28px",
                fontWeight: 700,
                color: "#15803D",
                fontVariantNumeric: "tabular-nums",
                marginTop: "2px",
              }}
            >
              {formatUsd(paidUsd)}
            </div>
            <div
              style={{
                fontSize: "12.5px",
                lineHeight: "18px",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: "#166534",
              }}
            >
              {formatKhr(paidKhr)}
            </div>
          </div>

          {/* Card 3: Still to Pay */}
          <div
            style={{
              border:
                totals.unpaidUsd > 0 || totals.unpaidKhr > 0
                  ? "1.5px solid #F59E0B"
                  : "1px solid #E2E8F0",
              background:
                totals.unpaidUsd > 0 || totals.unpaidKhr > 0 ? "#FFFBEB" : "#F8FAFC",
              borderRadius: "10px",
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                lineHeight: "16px",
                color: totals.unpaidUsd > 0 || totals.unpaidKhr > 0 ? "#B45309" : "#64748B",
                fontWeight: 600,
              }}
            >
              ត្រូវបង់បន្ថែម · Still to pay
            </div>
            <div
              style={{
                fontSize: "21px",
                lineHeight: "28px",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: totals.unpaidUsd > 0 ? "#D97706" : "#0F172A",
                marginTop: "2px",
              }}
            >
              {formatUsd(totals.unpaidUsd)}
            </div>
            <div
              style={{
                fontSize: "12.5px",
                lineHeight: "18px",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: totals.unpaidKhr > 0 ? "#D97706" : "#64748B",
              }}
            >
              {formatKhr(totals.unpaidKhr)}
            </div>
          </div>

          {/* Card 4: Paid By (Clean Two-Line Breakdown, Zero Bugs) */}
          <div
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "12px 14px",
              background: "#F8FAFC",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "6px",
            }}
          >
            <div style={{ fontSize: "12px", lineHeight: "16px", color: "#64748B", fontWeight: 600 }}>
              បង់តាម · Paid by
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  lineHeight: "16px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span style={{ color: "#1D4ED8", fontWeight: 700 }}>
                  ● QR (ABA/Bakong)
                </span>
                {renderSplitPayment(paidBy.qrUsd, paidBy.qrKhr)}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  lineHeight: "16px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span style={{ color: "#475569", fontWeight: 700 }}>
                  ● Cash (សាច់ប្រាក់)
                </span>
                {renderSplitPayment(paidBy.cashUsd, paidBy.cashKhr)}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. ITEMS TABLE (EXACT 100% COLUMN WIDTHS, ZERO GHOST BOXES) ─── */}
        <div
          style={{
            border: "1px solid #CBD5E1",
            borderRadius: "10px",
            overflow: "hidden",
            background: "#FFFFFF",
          }}
        >
          {view === "products" ? (
            /* Rolled up by product view */
            <table
              style={{
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
                fontSize: "12.5px",
                lineHeight: "22px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#F8FAFC",
                    borderBottom: "2px solid #CBD5E1",
                  }}
                >
                  <th style={{ width: "5%", padding: "8px 6px", textAlign: "center", color: "#475569", fontWeight: 700, verticalAlign: "middle" }}>#</th>
                  <th style={{ width: "25%", padding: "8px 6px", textAlign: "left", color: "#475569", fontWeight: 700, verticalAlign: "middle" }}>មុខទំនិញ</th>
                  <th style={{ width: "22%", padding: "8px 6px", textAlign: "left", color: "#475569", fontWeight: 700, verticalAlign: "middle" }}>ហាង / អ្នកផ្គត់ផ្គង់</th>
                  <th style={{ width: "12%", textAlign: "right", padding: "8px 6px", color: "#475569", fontWeight: 700, verticalAlign: "middle" }}>ចំនួនសរុប</th>
                  <th style={{ width: "10%", textAlign: "center", padding: "8px 6px", color: "#475569", fontWeight: 700, verticalAlign: "middle" }}>ទិញ (ដង)</th>
                  <th style={{ width: "13%", textAlign: "right", padding: "8px 8px", color: "#475569", fontWeight: 700, verticalAlign: "middle" }}>សរុប $</th>
                  <th style={{ width: "13%", textAlign: "right", padding: "8px 10px", color: "#475569", fontWeight: 700, verticalAlign: "middle" }}>សរុប ៛</th>
                </tr>
              </thead>
              <tbody>
                {byProduct.length > 0 ? (
                  byProduct.map((p, idx) => (
                    <tr
                      key={p.key}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                      }}
                    >
                      <td style={{ textAlign: "center", padding: "8px 6px", color: "#64748B", fontVariantNumeric: "tabular-nums", verticalAlign: "middle", fontSize: "11.5px" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "8px 6px", fontWeight: 600, color: "#0F172A", verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </td>
                      <td style={{ padding: "8px 6px", color: "#475569", verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {[...p.suppliers].join(", ")}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 6px", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#0F172A", verticalAlign: "middle" }}>
                        {Number(p.qty.toFixed(2))} {p.unit}
                      </td>
                      <td style={{ textAlign: "center", padding: "8px 6px", fontVariantNumeric: "tabular-nums", color: "#475569", verticalAlign: "middle" }}>
                        {p.count}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 8px", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "#0F172A", verticalAlign: "middle" }}>
                        {p.usd > 0 ? formatUsd(p.usd) : <span style={{ color: "#CBD5E1" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 10px", fontVariantNumeric: "tabular-nums", color: "#475569", verticalAlign: "middle" }}>
                        {p.khr > 0 ? formatKhr(p.khr) : <span style={{ color: "#CBD5E1" }}>—</span>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "#64748B" }}>
                      គ្មានទិន្នន័យ
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    background: "#F8FAFC",
                    fontWeight: 700,
                    borderTop: "2px solid #CBD5E1",
                  }}
                >
                  <td style={{ padding: "8px 6px", verticalAlign: "middle" }}></td>
                  <td colSpan={4} style={{ padding: "8px 6px", verticalAlign: "middle", color: "#0F172A", fontWeight: 700, fontSize: "13px" }}>
                    សរុប · Total
                  </td>
                  <td style={{ textAlign: "right", padding: "8px 8px", fontVariantNumeric: "tabular-nums", verticalAlign: "middle", color: "#0F172A", fontWeight: 700, fontSize: "13px" }}>
                    {formatUsd(totals.usd)}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px 10px", fontVariantNumeric: "tabular-nums", verticalAlign: "middle", color: "#0F172A", fontWeight: 700, fontSize: "13px" }}>
                    {formatKhr(totals.khr)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            /* Detailed line items table (Columns sum to EXACTLY 100%) */
            <table
              style={{
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
                fontSize: "12.5px",
                lineHeight: "22px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#F8FAFC",
                    borderBottom: "2px solid #CBD5E1",
                  }}
                >
                  <th style={{ width: "4%", padding: "8px 4px", textAlign: "center", color: "#475569", fontWeight: 700, verticalAlign: "middle", fontSize: "11.5px" }}>#</th>
                  <th style={{ width: "13%", padding: "8px 4px", textAlign: "left", color: "#475569", fontWeight: 700, verticalAlign: "middle", fontSize: "11.5px" }}>កាលបរិច្ឆេទ</th>
                  <th style={{ width: "22%", padding: "8px 4px", textAlign: "left", color: "#475569", fontWeight: 700, verticalAlign: "middle", fontSize: "11.5px" }}>មុខទំនិញ</th>
                  <th style={{ width: "14%", padding: "8px 4px", textAlign: "left", color: "#475569", fontWeight: 700, verticalAlign: "middle", fontSize: "11.5px" }}>ហាង / អ្នកផ្គត់ផ្គង់</th>
                  <th style={{ width: "8%", textAlign: "right", padding: "8px 4px", color: "#475569", fontWeight: 700, verticalAlign: "middle", fontSize: "11.5px" }}>ចំនួន</th>
                  <th style={{ width: "9%", textAlign: "right", padding: "8px 4px", color: "#475569", fontWeight: 700, verticalAlign: "middle", fontSize: "11.5px" }}>តម្លៃរាយ</th>
                  <th style={{ width: "7%", textAlign: "center", padding: "8px 4px", color: "#475569", fontWeight: 700, verticalAlign: "middle", fontSize: "11.5px" }}>បង់តាម</th>
                  <th style={{ width: "7%", textAlign: "center", padding: "8px 4px", color: "#475569", fontWeight: 700, verticalAlign: "middle", fontSize: "11.5px" }}>ស្ថានភាព</th>
                  <th style={{ width: "8%", textAlign: "right", padding: "8px 6px", color: "#475569", fontWeight: 700, verticalAlign: "middle", fontSize: "11.5px" }}>សរុប $</th>
                  <th style={{ width: "8%", textAlign: "right", padding: "8px 10px", color: "#475569", fontWeight: 700, verticalAlign: "middle", fontSize: "11.5px" }}>សរុប ៛</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((it, idx) => (
                    <tr
                      key={it.id}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                      }}
                    >
                      <td style={{ textAlign: "center", padding: "8px 4px", color: "#64748B", fontVariantNumeric: "tabular-nums", verticalAlign: "middle", fontSize: "11px" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "8px 4px", color: "#334155", whiteSpace: "nowrap", verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {formatDate(it.invoice_date)}{" "}
                        <span style={{ fontSize: "10.5px", color: "#94A3B8" }}>
                          ({it.invoice_no})
                        </span>
                      </td>
                      <td style={{ padding: "8px 4px", fontWeight: 600, color: "#0F172A", verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {it.item_name}
                      </td>
                      <td style={{ padding: "8px 4px", color: "#475569", verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {it.supplier_name || "ទូទៅ"}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 4px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", verticalAlign: "middle", fontWeight: 600, color: "#0F172A" }}>
                        {it.quantity} {it.unit}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 4px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", verticalAlign: "middle", color: "#475569" }}>
                        {it.currency === "USD" ? formatUsd(it.unit_price) : formatKhr(it.unit_price)}
                      </td>
                      {/* Zero Ghost Box: Pure colored typography */}
                      <td style={{ textAlign: "center", padding: "8px 4px", verticalAlign: "middle" }}>
                        <b
                          style={{
                            fontWeight: 700,
                            fontSize: "11.5px",
                            color:
                              it.wallet_code === "aba"
                                ? "#1D4ED8"
                                : it.wallet_code === "bakong"
                                ? "#BE185D"
                                : "#475569",
                          }}
                        >
                          {it.wallet_code ? it.wallet_code.toUpperCase() : "—"}
                        </b>
                      </td>
                      {/* Zero Ghost Box: Pure colored typography */}
                      <td style={{ textAlign: "center", padding: "8px 4px", verticalAlign: "middle" }}>
                        <b
                          style={{
                            fontWeight: 700,
                            fontSize: "11.5px",
                            color: it.is_paid ? "#15803D" : "#D97706",
                          }}
                        >
                          {it.is_paid ? "✓ បង់រួច" : "! ជំពាក់"}
                        </b>
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 6px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        {it.currency === "USD" ? (
                          <b style={{ color: "#0F172A", fontWeight: 700 }}>
                            {formatUsd(it.line_total)}
                          </b>
                        ) : (
                          <span style={{ color: "#CBD5E1" }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 10px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        {it.currency === "KHR" ? (
                          <b style={{ color: "#0F172A", fontWeight: 700 }}>
                            {formatKhr(it.line_total)}
                          </b>
                        ) : (
                          <span style={{ color: "#CBD5E1" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: "20px", color: "#64748B" }}>
                      គ្មានទិន្នន័យ
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    background: "#F8FAFC",
                    fontWeight: 700,
                    borderTop: "2px solid #CBD5E1",
                  }}
                >
                  <td style={{ padding: "8px 4px", verticalAlign: "middle" }}></td>
                  <td
                    colSpan={7}
                    style={{
                      padding: "8px 4px",
                      verticalAlign: "middle",
                      color: "#0F172A",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    សរុប · Total
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "8px 6px",
                      fontVariantNumeric: "tabular-nums",
                      verticalAlign: "middle",
                      color: "#0F172A",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    {formatUsd(totals.usd)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "8px 10px",
                      fontVariantNumeric: "tabular-nums",
                      verticalAlign: "middle",
                      color: "#0F172A",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    {formatKhr(totals.khr)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* ─── 4. BOTTOM BREAKDOWN & SIGNATURES ─────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1.2fr 1.1fr",
            gap: "12px",
            marginTop: "2px",
          }}
        >
          {/* Card 1: By Currency */}
          <div
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "10px 14px",
              background: "#F8FAFC",
            }}
          >
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#0F172A",
                marginBottom: "6px",
              }}
            >
              សង្ខេបតាមរូបិយប័ណ្ណ · By Currency
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
                lineHeight: "20px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <thead>
                <tr
                  style={{
                    color: "#64748B",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  <th style={{ width: "28%", textAlign: "left", padding: "3px 0", verticalAlign: "middle", fontSize: "11px" }}>
                    រូបិយប័ណ្ណ
                  </th>
                  <th style={{ width: "24%", textAlign: "right", padding: "3px 4px", verticalAlign: "middle", fontSize: "11px" }}>
                    មិនទាន់បង់
                  </th>
                  <th style={{ width: "24%", textAlign: "right", padding: "3px 4px", verticalAlign: "middle", fontSize: "11px" }}>
                    បានបង់
                  </th>
                  <th style={{ width: "24%", textAlign: "right", padding: "3px 0", verticalAlign: "middle", fontWeight: 700, fontSize: "11px" }}>
                    សរុប
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "3px 0", fontWeight: 700, verticalAlign: "middle", color: "#0F172A" }}>
                    ដុល្លារ $
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "3px 4px",
                      color: totals.unpaidUsd > 0 ? "#D97706" : "#64748B",
                      fontWeight: totals.unpaidUsd > 0 ? 700 : 400,
                      verticalAlign: "middle",
                    }}
                  >
                    {formatUsd(totals.unpaidUsd)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "3px 4px",
                      color: "#15803D",
                      verticalAlign: "middle",
                    }}
                  >
                    {formatUsd(paidUsd)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "3px 0",
                      fontWeight: 700,
                      verticalAlign: "middle",
                      color: "#0F172A",
                    }}
                  >
                    {formatUsd(totals.usd)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "3px 0", fontWeight: 700, verticalAlign: "middle", color: "#0F172A" }}>
                    រៀល ៛
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "3px 4px",
                      color: totals.unpaidKhr > 0 ? "#D97706" : "#64748B",
                      fontWeight: totals.unpaidKhr > 0 ? 700 : 400,
                      verticalAlign: "middle",
                    }}
                  >
                    {formatKhr(totals.unpaidKhr)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "3px 4px",
                      color: "#15803D",
                      verticalAlign: "middle",
                    }}
                  >
                    {formatKhr(paidKhr)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "3px 0",
                      fontWeight: 700,
                      verticalAlign: "middle",
                      color: "#0F172A",
                    }}
                  >
                    {formatKhr(totals.khr)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Card 2: Owed to Shops */}
          <div
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "10px 14px",
              background: "#F8FAFC",
            }}
          >
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#0F172A",
                marginBottom: "6px",
              }}
            >
              នៅជំពាក់ហាង · Owed to shops
            </div>
            {owedToShops.length > 0 ? (
              owedToShops.map((shop) => (
                <div
                  key={shop.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    lineHeight: "20px",
                    borderBottom: "1px solid #E2E8F0",
                    padding: "2px 0",
                  }}
                >
                  <span style={{ color: "#334155" }}>{shop.name}</span>
                  <b style={{ fontVariantNumeric: "tabular-nums", color: "#D97706" }}>
                    {shop.usd > 0 && formatUsd(shop.usd)}
                    {shop.usd > 0 && shop.khr > 0 && " + "}
                    {shop.khr > 0 && formatKhr(shop.khr)}
                  </b>
                </div>
              ))
            ) : (
              <div
                style={{
                  fontSize: "12px",
                  color: "#15803D",
                  padding: "8px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 600,
                }}
              >
                <span>✓</span>
                <span>បានទូទាត់រួចរាល់គ្រប់ហាងទាំងអស់</span>
              </div>
            )}
          </div>

          {/* Card 3: Estimation & Signatures (Clean Minimalist Line, Zero Ghost Boxes) */}
          <div
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "10px 14px",
              background: "#F8FAFC",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div
              style={{
                borderBottom: "1px solid #E2E8F0",
                paddingBottom: "8px",
                fontSize: "11.5px",
                lineHeight: "18px",
                color: "#1E40AF",
              }}
            >
              បម្លែងសរុប (4,000 ៛ = $1) ≈{" "}
              <b style={{ color: "#1D4ED8", fontSize: "13px" }}>
                {formatKhr(approxConvertedKhr)}
              </b>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                fontSize: "11px",
                color: "#475569",
                textAlign: "center",
              }}
            >
              <div>
                <div
                  style={{
                    height: "36px",
                    borderBottom: "1.5px dashed #94A3B8",
                    marginBottom: "4px",
                  }}
                ></div>
                <div style={{ fontWeight: 600 }}>អ្នករៀបចំ</div>
                <div style={{ fontSize: "10px", color: "#94A3B8" }}>Prepared By</div>
              </div>
              <div>
                <div
                  style={{
                    height: "36px",
                    borderBottom: "1.5px dashed #94A3B8",
                    marginBottom: "4px",
                  }}
                ></div>
                <div style={{ fontWeight: 600 }}>ម្ចាស់ហាង</div>
                <div style={{ fontSize: "10px", color: "#94A3B8" }}>Approved By</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
