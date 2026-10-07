import React, { forwardRef, type CSSProperties } from "react";
import { formatUsd, formatKhr } from "@/lib/utils";
import { khDate, dmy, pad } from "@/lib/khmerDate";
import type { PurchasedItem, DailyCashflowResponse } from "@/hooks/useReports";

/** Width of the export sheet in CSS px; the PDF scales it onto A4 portrait. */
export const REPORT_WIDTH = 880;

const KHR_PER_USD = 4000;

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Title + date line for the period, matching the backend's date filters */
function periodHeading(period: string, now: Date) {
  if (period === "yesterday") {
    return { kh: "បញ្ជីចំណាយប្រចាំថ្ងៃ", en: "DAILY EXPENSE LIST", range: khDate(addDays(now, -1)) };
  }
  if (period === "7days") {
    return {
      kh: "បញ្ជីចំណាយប្រចាំសប្តាហ៍",
      en: "WEEKLY EXPENSE LIST",
      range: `ពី${khDate(addDays(now, -6))} ដល់${khDate(now)}`,
    };
  }
  if (period === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      kh: "បញ្ជីចំណាយប្រចាំខែ",
      en: "MONTHLY EXPENSE LIST",
      range:
        first.getDate() === now.getDate()
          ? khDate(now)
          : `ពី${khDate(first)} ដល់${khDate(now)}`,
    };
  }
  return { kh: "បញ្ជីចំណាយប្រចាំថ្ងៃ", en: "DAILY EXPENSE LIST", range: khDate(now) };
}

const FONT = '"Kantumruy Pro", "Noto Sans Khmer", "Khmer OS Siemreap", system-ui, sans-serif';
const MOUL = '"Moul", "Khmer OS Muol Light", "Kantumruy Pro", serif';
const INK = "#0F172A";
const BODY = "#1E293B";
const MUTED = "#475569";
const OUTER = "#334155"; // table frame, header and total rules
const INNER = "#CBD5E1"; // grid lines between cells
const HEAD_BG = "#E7F0ED";
const GROUP_BG = "#F4F7F6";
const BRAND = "#0B5D4B";
const PAID = "#15803D";
const DEBT = "#B45309";

// Every cell draws only its own right + bottom edge (first column also left, header also top),
// so each row is a self-contained box and the PDF can cut pages between rows cleanly.
const cell = (extra?: CSSProperties): CSSProperties => ({
  borderRight: `1px solid ${INNER}`,
  borderBottom: `1px solid ${INNER}`,
  padding: "6px 8px",
  verticalAlign: "middle",
  ...extra,
});
const FIRST: CSSProperties = { borderLeft: `1px solid ${OUTER}` };
const LAST: CSSProperties = { borderRight: `1px solid ${OUTER}` };
const NUM: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};
const TABLE: CSSProperties = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};
const DASH = <span style={{ color: "#CBD5E1" }}>—</span>;
const LOSS = "#B91C1C";

/** Balance amount: "-$12.00" / "-5,000 ៛" in red when negative, a dash when zero */
function signed(value: number, currency: "USD" | "KHR") {
  if (Math.abs(value) < 0.005) return DASH;
  const text = currency === "USD" ? formatUsd(Math.abs(value)) : formatKhr(Math.abs(value));
  return <span style={{ color: value < 0 ? LOSS : PAID }}>{value < 0 ? `-${text}` : text}</span>;
}

/** Amount, or a dash when zero */
const amt = (value: number, currency: "USD" | "KHR") =>
  Math.abs(value) < 0.005 ? DASH : currency === "USD" ? formatUsd(value) : formatKhr(value);

/** "$12.00 + 5,000 ៛", or a dash when both are zero */
const amountPair = (usd: number, khr: number) =>
  usd === 0 && khr === 0 ? (
    DASH
  ) : (
    <>
      {usd > 0 && formatUsd(usd)}
      {usd > 0 && khr > 0 && " + "}
      {khr > 0 && formatKhr(khr)}
    </>
  );

function SectionTitle({ no, kh, en }: { no: string; kh: string; en: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "8px",
        margin: "0 0 8px",
        paddingLeft: "10px",
        borderLeft: `4px solid ${BRAND}`,
      }}
    >
      <span style={{ fontSize: "15.5px", fontWeight: 700, color: INK }}>
        {no}. {kh}
      </span>
      <span style={{ fontSize: "12.5px", fontWeight: 600, color: MUTED }}>{en}</span>
    </div>
  );
}

function Th({
  kh,
  en,
  width,
  first,
  last,
  align = "center",
  colSpan,
  rowSpan,
  noTop,
}: {
  kh: string;
  en: string;
  width?: string;
  first?: boolean;
  last?: boolean;
  align?: "left" | "center" | "right";
  colSpan?: number;
  rowSpan?: number;
  /** Second header row: the first row already drew the top rule */
  noTop?: boolean;
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={cell({
        ...(first ? FIRST : {}),
        ...(last ? LAST : {}),
        width,
        borderTop: noTop ? undefined : `1px solid ${OUTER}`,
        borderBottom: `1px solid ${OUTER}`,
        background: HEAD_BG,
        textAlign: align,
        fontWeight: 700,
        fontSize: "13px",
        lineHeight: "19px",
        color: INK,
        padding: "6px 8px",
      })}
    >
      {kh}
      <div style={{ fontSize: "10.5px", fontWeight: 600, color: MUTED, lineHeight: "14px" }}>{en}</div>
    </th>
  );
}

/** "បង់រួច" / "ជំពាក់" / "ជំពាក់ខ្លះ" for a set of lines */
function payStatus(lines: PurchasedItem[]) {
  const unpaid = lines.filter((it) => !it.is_paid).length;
  if (unpaid === 0) return <span style={{ color: PAID, fontWeight: 600 }}>បង់រួច</span>;
  if (unpaid === lines.length) return <span style={{ color: DEBT, fontWeight: 700 }}>ជំពាក់</span>;
  return <span style={{ color: DEBT, fontWeight: 700 }}>ជំពាក់ខ្លះ</span>;
}

/** Last cashflow row: income, expense and balance for the whole period, converted to riel */
function CashflowRielRow({ cashflow }: { cashflow: DailyCashflowResponse }) {
  const t = cashflow.totals;
  // With a single day there is no Total row above, so this row draws the top rule itself
  const rule: CSSProperties = {
    borderBottom: `1px solid ${OUTER}`,
    ...(cashflow.days.length > 1 ? {} : { borderTop: `1px solid ${OUTER}` }),
  };
  const income = t.income_usd * KHR_PER_USD + t.income_khr;
  const expense = t.expense_usd * KHR_PER_USD + t.expense_khr;
  const net = t.net_usd * KHR_PER_USD + t.net_khr;
  const riel = (v: number) => (Math.abs(v) < 0.5 ? DASH : `≈ ${formatKhr(v)}`);

  return (
    <tr data-pdf-unit="row" style={{ fontWeight: 700 }}>
      <td style={cell({ ...FIRST, ...rule, textAlign: "center", fontSize: "12.5px", lineHeight: "18px" })}>
        សរុបជាប្រាក់រៀល
        <div style={{ fontSize: "11px", fontWeight: 500, color: MUTED }}>
          1$ = {KHR_PER_USD.toLocaleString("en-US")}៛
        </div>
      </td>
      <td colSpan={2} style={cell({ ...NUM, ...rule, textAlign: "center", fontSize: "14.5px" })}>
        {riel(income)}
      </td>
      <td colSpan={2} style={cell({ ...NUM, ...rule, textAlign: "center", fontSize: "14.5px" })}>
        {riel(expense)}
      </td>
      <td colSpan={2} style={cell({ ...NUM, ...LAST, ...rule, textAlign: "center", fontSize: "15px" })}>
        {Math.abs(net) < 0.5 ? (
          DASH
        ) : (
          <span style={{ color: net < 0 ? LOSS : PAID }}>
            ≈ {net < 0 ? "-" : ""}
            {formatKhr(Math.abs(net))}
          </span>
        )}
      </td>
    </tr>
  );
}

type InvoiceGroup = {
  key: string;
  supplier: string;
  invoiceNo: string;
  date: string;
  wallet: string;
  /** ល.រ of the group's first line (numbering runs through the whole list) */
  firstNo: number;
  usd: number;
  khr: number;
  lines: PurchasedItem[];
};

/** Fold lines into their invoices, keeping the order in which invoices first appear. */
function groupByInvoice(items: PurchasedItem[]): InvoiceGroup[] {
  const byKey = new Map<string, InvoiceGroup>();
  for (const it of items) {
    const key = String(it.invoice_id);
    let g = byKey.get(key);
    if (!g) {
      g = {
        key,
        supplier: it.supplier_name || "ទូទៅ",
        invoiceNo: (it.invoice_no || "").replace(/^#+/, ""),
        date: it.invoice_date,
        wallet: it.wallet_code ? it.wallet_code.toUpperCase() : "",
        firstNo: 0,
        usd: 0,
        khr: 0,
        lines: [],
      };
      byKey.set(key, g);
    }
    g.lines.push(it);
    if (it.currency === "USD") g.usd += Number(it.line_total);
    else g.khr += Number(it.line_total);
  }
  // ល.រ runs through the whole list in display order
  let no = 1;
  const groups = [...byKey.values()];
  for (const g of groups) {
    g.firstNo = no;
    no += g.lines.length;
  }
  return groups;
}

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
  /** Income vs expense per day for the same period */
  cashflow?: DailyCashflowResponse;
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
      cashflow,
    },
    ref
  ) {
    const now = new Date();
    const heading = periodHeading(reportPeriod, now);
    const shopCount = new Set(items.map((it) => it.supplier_name || "ទូទៅ")).size;
    const invoiceCount = new Set(items.map((it) => it.invoice_id)).size;
    const totalInKhr = Math.round(totals.usd * KHR_PER_USD + totals.khr);
    const hasDebt = totals.unpaidUsd > 0 || totals.unpaidKhr > 0;

    const isLines = view === "lines";
    const multiDay = reportPeriod === "7days" || reportPeriod === "month";
    const groups = isLines ? groupByInvoice(items) : [];
    // Both views have 7 columns; "lines" ends with a status column after the two currency columns.
    const colCount = 7;
    const trailing = isLines ? 1 : 0;
    const labelSpan = colCount - 2 - trailing;

    const totalRow = (
      label: React.ReactNode,
      usd: React.ReactNode,
      khr: React.ReactNode,
      style: CSSProperties = {},
      cellStyle: CSSProperties = {}
    ) => (
      <tr data-pdf-unit="row" style={{ fontWeight: 700, ...style }}>
        <td colSpan={labelSpan} style={cell({ ...FIRST, textAlign: "right", fontSize: "13.5px", ...cellStyle })}>
          {label}
        </td>
        <td style={cell({ ...NUM, ...(trailing ? {} : LAST), ...cellStyle })}>{usd}</td>
        <td style={cell({ ...NUM, ...(trailing ? {} : LAST), ...cellStyle })}>{khr}</td>
        {trailing > 0 && <td style={cell({ ...LAST, ...cellStyle })}></td>}
      </tr>
    );

    return (
      <div
        id="dc-root"
        ref={ref}
        style={{
          width: `${REPORT_WIDTH}px`,
          minWidth: `${REPORT_WIDTH}px`,
          maxWidth: `${REPORT_WIDTH}px`,
          boxSizing: "border-box",
          padding: "26px 26px 30px",
          background: "#FFFFFF",
          color: INK,
          fontFamily: FONT,
          fontSize: "14px",
          lineHeight: "22px",
          fontWeight: 500,
        }}
      >
        {/* ─── 1. LETTERHEAD ─────────────────────────────────────── */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            borderBottom: `3px double ${BRAND}`,
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "0 0 10px", verticalAlign: "bottom" }}>
                <div style={{ fontFamily: MOUL, fontSize: "17px", lineHeight: "32px", color: BRAND }}>
                  ភោជនីយដ្ឋាន Bonchi
                </div>
                <div style={{ fontSize: "12.5px", color: MUTED, letterSpacing: "0.5px" }}>
                  BONCHI RESTAURANT · កំណត់ត្រាចំណាយ
                </div>
              </td>
              <td
                style={{
                  width: "300px",
                  padding: "0 0 10px",
                  verticalAlign: "bottom",
                  textAlign: "right",
                  fontSize: "13px",
                  lineHeight: "21px",
                  color: BODY,
                }}
              >
                <div>
                  រៀបចំដោយ: <b style={{ color: INK }}>{userName}</b>
                </div>
                <div>
                  ថ្ងៃបោះពុម្ព:{" "}
                  <b style={{ color: INK, fontVariantNumeric: "tabular-nums" }}>
                    {`${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`}
                  </b>
                </div>
                <div>
                  <b style={{ color: INK }}>{items.length}</b> មុខ ·{" "}
                  <b style={{ color: INK }}>{invoiceCount}</b> វិក្កយបត្រ ·{" "}
                  <b style={{ color: INK }}>{shopCount}</b> ហាង
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ─── 2. TITLE ──────────────────────────────────────────── */}
        <div style={{ textAlign: "center", margin: "16px 0 14px" }}>
          <div style={{ fontFamily: MOUL, fontSize: "22px", lineHeight: "42px", color: INK }}>
            {heading.kh}
          </div>
          <div style={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "2.5px", color: MUTED }}>
            {heading.en}
            {!isLines && " · BY PRODUCT"}
          </div>
          <div style={{ fontSize: "15px", marginTop: "4px", color: BODY }}>
            {heading.range}
            {!isLines && " (សង្ខេបតាមមុខទំនិញ)"}
          </div>
        </div>

        {/* ─── 3. INCOME VS EXPENSE PER DAY ─────────────────────── */}
        {cashflow && cashflow.days.length > 0 && (
          <>
            <SectionTitle no="១" kh="សង្ខេបចំណូល-ចំណាយប្រចាំថ្ងៃ" en="Daily income & expense" />
            <table style={TABLE} data-pdf-repeat-head="">
              <thead>
                <tr>
                  <Th first rowSpan={2} kh="កាលបរិច្ឆេទ" en="Date" width="16%" />
                  <Th colSpan={2} kh="ចំណូល" en="Income" />
                  <Th colSpan={2} kh="ចំណាយ" en="Expense" />
                  <Th last colSpan={2} kh="សមតុល្យ (ចំណូល − ចំណាយ)" en="Balance" />
                </tr>
                <tr>
                  <Th noTop kh="ដុល្លារ" en="USD" width="12%" align="right" />
                  <Th noTop kh="រៀល" en="KHR" width="14%" align="right" />
                  <Th noTop kh="ដុល្លារ" en="USD" width="12%" align="right" />
                  <Th noTop kh="រៀល" en="KHR" width="14%" align="right" />
                  <Th noTop kh="ដុល្លារ" en="USD" width="15%" align="right" />
                  <Th noTop last kh="រៀល" en="KHR" width="17%" align="right" />
                </tr>
              </thead>
              <tbody>
                {cashflow.days.map((d) => {
                  const quiet = d.income_count + d.expense_count === 0;
                  return (
                    <tr data-pdf-unit="row" key={d.date} style={quiet ? { color: MUTED } : undefined}>
                      <td style={cell({ ...FIRST, textAlign: "center", fontVariantNumeric: "tabular-nums" })}>
                        {dmy(d.date)}
                      </td>
                      <td style={cell(NUM)}>{amt(d.income_usd, "USD")}</td>
                      <td style={cell(NUM)}>{amt(d.income_khr, "KHR")}</td>
                      <td style={cell(NUM)}>{amt(d.expense_usd, "USD")}</td>
                      <td style={cell(NUM)}>{amt(d.expense_khr, "KHR")}</td>
                      <td style={cell({ ...NUM, fontWeight: 700 })}>{signed(d.net_usd, "USD")}</td>
                      <td style={cell({ ...NUM, ...LAST, fontWeight: 700 })}>{signed(d.net_khr, "KHR")}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {cashflow.days.length > 1 && (
                  <tr data-pdf-unit="row" style={{ background: HEAD_BG, fontWeight: 700 }}>
                    <td style={cell({ ...FIRST, textAlign: "center", borderTop: `1px solid ${OUTER}` })}>
                      សរុប · Total
                    </td>
                    <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}` })}>
                      {amt(cashflow.totals.income_usd, "USD")}
                    </td>
                    <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}` })}>
                      {amt(cashflow.totals.income_khr, "KHR")}
                    </td>
                    <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}` })}>
                      {amt(cashflow.totals.expense_usd, "USD")}
                    </td>
                    <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}` })}>
                      {amt(cashflow.totals.expense_khr, "KHR")}
                    </td>
                    <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}` })}>
                      {signed(cashflow.totals.net_usd, "USD")}
                    </td>
                    <td style={cell({ ...NUM, ...LAST, borderTop: `1px solid ${OUTER}` })}>
                      {signed(cashflow.totals.net_khr, "KHR")}
                    </td>
                  </tr>
                )}
                {/* Everything converted to riel, so income, expense and balance each read as one number */}
                <CashflowRielRow cashflow={cashflow} />
              </tfoot>
            </table>
            {/* How expense relates to the purchase list below (small expenses have no item lines) */}
            <div
              data-pdf-unit="block"
              style={{ fontSize: "12px", lineHeight: "19px", color: MUTED, padding: "6px 2px 0" }}
            >
              * ចំណាយ = ទិញទំនិញ{" "}
              <b style={{ color: BODY }}>
                {amountPair(cashflow.totals.purchase_usd, cashflow.totals.purchase_khr)}
              </b>{" "}
              (បញ្ជីខាងក្រោម)
              {([
                ["ទឹកភ្លើង & សេវា", cashflow.totals.utility_usd, cashflow.totals.utility_khr],
                ["ប្រាក់ខែបុគ្គលិក", cashflow.totals.payroll_usd, cashflow.totals.payroll_khr],
                ["ចំណាយតូចតាច", cashflow.totals.other_usd, cashflow.totals.other_khr],
              ] as const)
                .filter(([, usd, khr]) => usd > 0 || khr > 0)
                .map(([label, usd, khr]) => (
                  <React.Fragment key={label}>
                    {" "}+ {label} <b style={{ color: BODY }}>{amountPair(usd, khr)}</b>
                  </React.Fragment>
                ))}
              {" "}· តួលេខតាមវិក្កយបត្រ មិនរាប់វិក្កយបត្រដែលបានលុបចោល
            </div>
            <div style={{ height: "18px" }}></div>
            <SectionTitle no="២" kh="បញ្ជីទិញទំនិញ" en="Purchase list" />
          </>
        )}

        {/* ─── 4. THE LIST ───────────────────────────────────────── */}
        <table style={TABLE} data-pdf-repeat-head="">
          <thead>
            {isLines ? (
              <tr>
                <Th first kh="ល.រ" en="No." width="6%" />
                <Th kh="បរិយាយ" en="Description" width="36%" align="left" />
                <Th kh="បរិមាណ" en="Qty" width="11%" align="right" />
                <Th kh="តម្លៃរាយ" en="Unit price" width="11%" align="right" />
                <Th kh="ដុល្លារ ($)" en="USD" width="12%" align="right" />
                <Th kh="រៀល (៛)" en="KHR" width="13%" align="right" />
                <Th last kh="ស្ថានភាព" en="Status" width="11%" />
              </tr>
            ) : (
              <tr>
                <Th first kh="ល.រ" en="No." width="6%" />
                <Th kh="មុខទំនិញ" en="Product" width="28%" align="left" />
                <Th kh="ហាង / អ្នកលក់" en="Shop" width="21%" align="left" />
                <Th kh="បរិមាណសរុប" en="Total qty" width="12%" align="right" />
                <Th kh="ទិញ (ដង)" en="Times" width="9%" />
                <Th kh="ដុល្លារ ($)" en="USD" width="11%" align="right" />
                <Th last kh="រៀល (៛)" en="KHR" width="13%" align="right" />
              </tr>
            )}
          </thead>

          <tbody>
            {groups.map((g) => (
              <React.Fragment key={g.key}>
                {/* Invoice heading: shop, invoice no, wallet, subtotal, status — said once, not on every line */}
                <tr data-pdf-unit="row" data-pdf-keep-next="" style={{ background: GROUP_BG }}>
                  <td colSpan={4} style={cell({ ...FIRST, padding: "7px 8px" })}>
                    <span style={{ fontWeight: 700, color: INK }}>{g.supplier}</span>
                    <span style={{ fontSize: "12.5px", color: MUTED }}>
                      {g.invoiceNo && <>{"  ·  "}វិក្កយបត្រ #{g.invoiceNo}</>}
                      {g.wallet && <>{"  ·  "}{g.wallet}</>}
                      {multiDay && <>{"  ·  "}{dmy(g.date)}</>}
                    </span>
                  </td>
                  <td style={cell({ ...NUM, fontWeight: 700, color: BODY })}>
                    {g.usd > 0 ? formatUsd(g.usd) : DASH}
                  </td>
                  <td style={cell({ ...NUM, fontWeight: 700, color: BODY })}>
                    {g.khr > 0 ? formatKhr(g.khr) : DASH}
                  </td>
                  <td style={cell({ ...LAST, textAlign: "center", fontSize: "13px" })}>
                    {payStatus(g.lines)}
                  </td>
                </tr>
                {g.lines.map((it, idx) => (
                    <tr data-pdf-unit="row" key={it.id}>
                      <td style={cell({ ...FIRST, textAlign: "center", fontVariantNumeric: "tabular-nums", color: MUTED })}>
                        {g.firstNo + idx}
                      </td>
                      <td style={cell({ color: INK, wordBreak: "break-word", paddingLeft: "18px" })}>
                        {it.item_name}
                      </td>
                      <td style={cell({ ...NUM, color: BODY })}>
                        {Number(it.quantity)} {it.unit}
                      </td>
                      <td style={cell({ ...NUM, color: MUTED })}>
                        {it.currency === "USD" ? formatUsd(it.unit_price) : formatKhr(it.unit_price)}
                      </td>
                      <td style={cell({ ...NUM, fontWeight: 600 })}>
                        {it.currency === "USD" ? formatUsd(it.line_total) : DASH}
                      </td>
                      <td style={cell({ ...NUM, fontWeight: 600 })}>
                        {it.currency === "KHR" ? formatKhr(it.line_total) : DASH}
                      </td>
                      <td style={cell({ ...LAST, textAlign: "center", fontSize: "13px" })}>
                        {it.is_paid ? (
                          <span style={{ color: PAID }}>បង់រួច</span>
                        ) : (
                          <span style={{ color: DEBT, fontWeight: 700 }}>ជំពាក់</span>
                        )}
                      </td>
                    </tr>
                ))}
              </React.Fragment>
            ))}

            {!isLines &&
              byProduct.map((p, idx) => (
                <tr data-pdf-unit="row" key={p.key}>
                  <td style={cell({ ...FIRST, textAlign: "center", fontVariantNumeric: "tabular-nums", color: MUTED })}>
                    {idx + 1}
                  </td>
                  <td style={cell({ fontWeight: 600, wordBreak: "break-word" })}>{p.name}</td>
                  <td style={cell({ color: BODY, wordBreak: "break-word" })}>
                    {[...p.suppliers].join(", ") || "ទូទៅ"}
                  </td>
                  <td style={cell(NUM)}>
                    {Number(p.qty.toFixed(2))} {p.unit}
                  </td>
                  <td style={cell({ textAlign: "center", fontVariantNumeric: "tabular-nums" })}>{p.count}</td>
                  <td style={cell({ ...NUM, fontWeight: 600 })}>{p.usd > 0 ? formatUsd(p.usd) : DASH}</td>
                  <td style={cell({ ...NUM, ...LAST, fontWeight: 600 })}>{p.khr > 0 ? formatKhr(p.khr) : DASH}</td>
                </tr>
              ))}

            {(isLines ? items.length : byProduct.length) === 0 && (
              <tr data-pdf-unit="row">
                <td colSpan={colCount} style={cell({ ...FIRST, ...LAST, textAlign: "center", padding: "18px", color: MUTED })}>
                  គ្មានទិន្នន័យ
                </td>
              </tr>
            )}
          </tbody>

          <tfoot>
            {totalRow(
              "សរុបរួម · Grand total",
              formatUsd(totals.usd),
              formatKhr(totals.khr),
              { background: HEAD_BG, fontSize: "14.5px" },
              { borderTop: `1px solid ${OUTER}`, padding: "7px 8px" }
            )}
            {totalRow(
              <span style={{ color: PAID }}>បានទូទាត់ · Paid</span>,
              <span style={{ color: PAID }}>{formatUsd(paidUsd)}</span>,
              <span style={{ color: PAID }}>{formatKhr(paidKhr)}</span>
            )}
            {totalRow(
              <span style={{ color: hasDebt ? DEBT : MUTED }}>នៅជំពាក់ · Still to pay</span>,
              <span style={{ color: totals.unpaidUsd > 0 ? DEBT : MUTED }}>{formatUsd(totals.unpaidUsd)}</span>,
              <span style={{ color: totals.unpaidKhr > 0 ? DEBT : MUTED }}>{formatKhr(totals.unpaidKhr)}</span>
            )}
            <tr data-pdf-unit="row" style={{ fontWeight: 700 }}>
              <td
                colSpan={labelSpan}
                style={cell({ ...FIRST, textAlign: "right", fontSize: "13.5px", borderBottom: `1px solid ${OUTER}` })}
              >
                សរុបជាប្រាក់រៀល · Total in riel
                <span style={{ fontWeight: 500, color: MUTED, fontSize: "12px" }}>
                  {" "}(1$ = {KHR_PER_USD.toLocaleString("en-US")}៛)
                </span>
              </td>
              <td
                colSpan={2}
                style={cell({
                  ...NUM,
                  ...(trailing ? {} : LAST),
                  textAlign: "center",
                  fontSize: "15px",
                  color: BRAND,
                  borderBottom: `1px solid ${OUTER}`,
                })}
              >
                ≈ {formatKhr(totalInKhr)}
              </td>
              {trailing > 0 && <td style={cell({ ...LAST, borderBottom: `1px solid ${OUTER}` })}></td>}
            </tr>
          </tfoot>
        </table>

        {/* ─── 5. PAYMENT SUMMARY ────────────────────────────────── */}
        <div
          data-pdf-unit="block"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", paddingTop: "16px", alignItems: "start" }}
        >
          <table style={TABLE}>
            <colgroup>
              <col style={{ width: "44%" }} />
              <col style={{ width: "28%" }} />
              <col style={{ width: "28%" }} />
            </colgroup>
            <thead>
              <tr>
                <th
                  colSpan={3}
                  style={cell({
                    ...FIRST,
                    ...LAST,
                    borderTop: `1px solid ${OUTER}`,
                    borderBottom: `1px solid ${OUTER}`,
                    background: HEAD_BG,
                    textAlign: "left",
                    fontSize: "13.5px",
                  })}
                >
                  បង់តាម · Paid by
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={cell({ ...FIRST, whiteSpace: "nowrap" })}>QR (ABA / Bakong)</td>
                <td style={cell(NUM)}>{paidBy.qrUsd > 0 ? formatUsd(paidBy.qrUsd) : DASH}</td>
                <td style={cell({ ...NUM, ...LAST })}>{paidBy.qrKhr > 0 ? formatKhr(paidBy.qrKhr) : DASH}</td>
              </tr>
              <tr>
                <td style={cell({ ...FIRST, borderBottom: `1px solid ${OUTER}` })}>សាច់ប្រាក់ · Cash</td>
                <td style={cell({ ...NUM, borderBottom: `1px solid ${OUTER}` })}>
                  {paidBy.cashUsd > 0 ? formatUsd(paidBy.cashUsd) : DASH}
                </td>
                <td style={cell({ ...NUM, ...LAST, borderBottom: `1px solid ${OUTER}` })}>
                  {paidBy.cashKhr > 0 ? formatKhr(paidBy.cashKhr) : DASH}
                </td>
              </tr>
            </tbody>
          </table>

          <table style={TABLE}>
            <colgroup>
              <col style={{ width: "50%" }} />
              <col style={{ width: "50%" }} />
            </colgroup>
            <thead>
              <tr>
                <th
                  colSpan={2}
                  style={cell({
                    ...FIRST,
                    ...LAST,
                    borderTop: `1px solid ${OUTER}`,
                    borderBottom: `1px solid ${OUTER}`,
                    background: HEAD_BG,
                    textAlign: "left",
                    fontSize: "13.5px",
                  })}
                >
                  នៅជំពាក់ហាង · Owed to shops
                </th>
              </tr>
            </thead>
            <tbody>
              {owedToShops.length > 0 ? (
                owedToShops.map((shop, i) => {
                  const edge = i === owedToShops.length - 1 ? { borderBottom: `1px solid ${OUTER}` } : {};
                  return (
                    <tr key={shop.name}>
                      <td style={cell({ ...FIRST, ...edge, wordBreak: "break-word" })}>{shop.name}</td>
                      <td style={cell({ ...NUM, ...LAST, ...edge, fontWeight: 700, color: DEBT })}>
                        {amountPair(shop.usd, shop.khr)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    style={cell({ ...FIRST, ...LAST, borderBottom: `1px solid ${OUTER}`, color: PAID, fontWeight: 600 })}
                  >
                    ✓ បានទូទាត់រួចរាល់គ្រប់ហាង
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── 6. SIGNATURES (approver left, preparer right) ─────── */}
        <div
          data-pdf-unit="block"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", paddingTop: "22px", textAlign: "center" }}
        >
          <div>
            <div style={{ height: "24px" }}></div>
            <div style={{ fontFamily: MOUL, fontSize: "14px", lineHeight: "30px" }}>បានឃើញ និងឯកភាព</div>
            <div style={{ fontWeight: 600 }}>ម្ចាស់ភោជនីយដ្ឋាន</div>
            <div style={{ height: "64px" }}></div>
            <div style={{ color: "#94A3B8", letterSpacing: "2px" }}>..................................</div>
          </div>
          <div>
            <div style={{ height: "24px", color: BODY }}>{khDate(now)}</div>
            <div style={{ fontFamily: MOUL, fontSize: "14px", lineHeight: "30px" }}>អ្នករៀបចំ</div>
            <div style={{ fontWeight: 600, color: "transparent" }}>.</div>
            <div style={{ height: "64px" }}></div>
            <div style={{ fontWeight: 700 }}>{userName}</div>
          </div>
        </div>
      </div>
    );
  }
);
