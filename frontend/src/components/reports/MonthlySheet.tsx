import React, { forwardRef, type CSSProperties } from "react";
import { formatUsd, formatKhr } from "@/lib/utils";
import { KH_MONTHS, dmy, khDate, pad, parseYmd } from "@/lib/khmerDate";
import type { MonthlyReportResponse } from "@/hooks/useReports";

/** Width of the export sheet in CSS px; the PDF scales it onto A4 portrait. */
export const MONTHLY_SHEET_WIDTH = 880;
export type DisplayCurrency = "USD" | "KHR";

const FONT = '"Kantumruy Pro", "Noto Sans Khmer", "Khmer OS Siemreap", system-ui, sans-serif';
const MOUL = '"Moul", "Khmer OS Muol Light", "Kantumruy Pro", serif';
const INK = "#0F172A";
const BODY = "#1E293B";
const MUTED = "#475569";
const OUTER = "#334155";
const INNER = "#CBD5E1";
const HEAD_BG = "#E7F0ED";
const BRAND = "#0B5D4B";
const GAIN = "#15803D";
const LOSS = "#B91C1C";

const KH_DAYS_SHORT = ["អា", "ច", "អ", "ពុ", "ព្រ", "សុ", "ស"];

/** Expense buckets, in the order the report shows them */
export const GROUPS = [
  { key: "purchase", label: "ទិញទំនិញ", en: "Purchases", color: "#0B5D4B" },
  { key: "utility", label: "ទឹកភ្លើង & សេវា", en: "Utilities", color: "#2563EB" },
  { key: "payroll", label: "ប្រាក់ខែ", en: "Payroll", color: "#B45309" },
  { key: "other", label: "ផ្សេងៗ", en: "Other", color: "#64748B" },
] as const;
type GroupKey = (typeof GROUPS)[number]["key"];
/**
 * Utilities (rent, electricity, water, internet… paid about once a month) and payroll (salary for
 * the month) are monthly costs: the daily table leaves them out and lists them under the days.
 */
const DAY_GROUPS = GROUPS.filter((g) => g.key !== "payroll" && g.key !== "utility");
const groupColor = (k: GroupKey) => GROUPS.find((g) => g.key === k)!.color;
const swatch = (color: string) => (
  <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: color, marginRight: 6 }} />
);
/** "07/10" from "2026-10-07" */
const dm = (ymd: string) => dmy(ymd).slice(0, 5);

const cell = (extra?: CSSProperties): CSSProperties => ({
  borderRight: `1px solid ${INNER}`,
  borderBottom: `1px solid ${INNER}`,
  padding: "5px 8px",
  verticalAlign: "middle",
  ...extra,
});
const FIRST: CSSProperties = { borderLeft: `1px solid ${OUTER}` };
const LAST: CSSProperties = { borderRight: `1px solid ${OUTER}` };
const NUM: CSSProperties = { textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const TABLE: CSSProperties = { width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 };
const DASH = <span style={{ color: "#CBD5E1" }}>—</span>;

function Th({ children, align = "right", first, last }: { children: React.ReactNode; align?: "left" | "center" | "right"; first?: boolean; last?: boolean }) {
  return (
    <th
      style={cell({
        ...(first ? FIRST : {}),
        ...(last ? LAST : {}),
        borderTop: `1px solid ${OUTER}`,
        borderBottom: `1px solid ${OUTER}`,
        background: HEAD_BG,
        textAlign: align,
        fontWeight: 700,
        fontSize: "12.5px",
        lineHeight: "17px",
        color: INK,
        padding: "7px 8px",
      })}
    >
      {children}
    </th>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: "18px 0 8px", paddingLeft: "10px", borderLeft: `4px solid ${BRAND}`, fontSize: "15px", fontWeight: 700, color: INK }}>
      {children}
    </div>
  );
}

interface Props {
  report: MonthlyReportResponse;
  currency: DisplayCurrency;
  preparedBy?: string;
}

/**
 * Monthly profit & loss: headline result (profit or loss), the P&L statement by bucket and
 * category (exact USD and KHR), then one line per day (income, purchases, other), followed by the
 * monthly costs (each utility with the day it was paid, and the salary for the month).
 * Daily figures are converted to one display currency so each cell is a single number;
 * the "by category" table keeps exact USD and KHR amounts.
 */
export const MonthlySheet = forwardRef<HTMLDivElement, Props>(function MonthlySheet(
  { report, currency, preparedBy = "អ្នកគ្រប់គ្រង" },
  ref
) {
  const rate = report.exchange_rate || 4000;
  const conv = (usd: number, khr: number) => (currency === "USD" ? usd + khr / rate : usd * rate + khr);
  const fmt = (v: number) => (currency === "USD" ? formatUsd(v) : formatKhr(v));
  const signed = (v: number) =>
    Math.abs(v) < 0.005 ? DASH : <span style={{ color: v < 0 ? LOSS : GAIN }}>{v < 0 ? "-" : ""}{fmt(Math.abs(v))}</span>;
  const amt = (v: number) => (Math.abs(v) < 0.005 ? DASH : fmt(v));

  const t = report.totals;
  const income = conv(t.income_usd, t.income_khr);
  const groupTotal = (g: GroupKey) => conv(t[`${g}_usd`], t[`${g}_khr`]);
  const expense = conv(t.expense_usd, t.expense_khr);
  const net = income - expense;
  const margin = income > 0 ? (net / income) * 100 : null;

  const [y, m] = report.month.split("-").map(Number);
  const monthLabel = `ខែ${KH_MONTHS[m - 1]} ឆ្នាំ ${y}`;
  const daysWithSales = report.days.filter((d) => d.income_count > 0).length;
  const payroll = groupTotal("payroll");
  const staffCount = report.payroll_runs.reduce((s, r) => s + r.staff_count, 0);
  const utilityRows = report.categories.filter((c) => c.grp === "utility");
  /** Day rows hold purchases + other only; utilities and payroll are monthly costs */
  const dayExpense = report.days.reduce((s, d) => s + conv(d.expense_usd, d.expense_khr), 0);
  const isLoss = net < -0.005;
  const resultLabel = isLoss ? "ខាតសុទ្ធ" : "ចំណេញសុទ្ធ";
  const resultEn = isLoss ? "Net loss" : "Net profit";
  const noPayroll = report.payroll_runs.length === 0;
  const noUtility = !report.categories.some((c) => c.grp === "utility");
  const draftPayroll = report.payroll_runs.some((r) => r.status !== "paid");
  const now = new Date();
  const partial = report.end < `${report.month}-${pad(new Date(y, m, 0).getDate())}`;

  const unit = currency === "USD" ? "ដុល្លារ ($)" : "រៀល (៛)";
  const card = (label: string, value: React.ReactNode, sub?: React.ReactNode, tone?: { fg: string; bg: string; bd: string }) => (
    <div style={{ border: `1px solid ${tone?.bd ?? INNER}`, background: tone?.bg ?? "#F8FAFC", borderRadius: "10px", padding: "10px 12px" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: tone?.fg ?? MUTED }}>{label}</div>
      <div style={{ fontSize: "19px", fontWeight: 800, color: tone?.fg ?? INK, lineHeight: "26px" }}>{value}</div>
      {sub && <div style={{ fontSize: "11.5px", color: MUTED }}>{sub}</div>}
    </div>
  );

  return (
    <div
      ref={ref}
      style={{
        width: `${MONTHLY_SHEET_WIDTH}px`,
        boxSizing: "border-box",
        padding: "26px 26px 30px",
        background: "#FFFFFF",
        color: BODY,
        fontFamily: FONT,
        fontSize: "13.5px",
        lineHeight: "20px",
        fontWeight: 500,
      }}
    >
      {/* ─── Letterhead ─── */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", borderBottom: `3px double ${BRAND}` }}>
        <tbody>
          <tr>
            <td style={{ padding: "0 0 10px", verticalAlign: "bottom" }}>
              <div style={{ fontFamily: MOUL, fontSize: "17px", lineHeight: "32px", color: BRAND }}>ភោជនីយដ្ឋាន Bonchi</div>
              <div style={{ fontSize: "12px", color: MUTED, letterSpacing: "0.5px" }}>BONCHI RESTAURANT · របាយការណ៍ប្រចាំខែ</div>
            </td>
            <td style={{ width: "300px", padding: "0 0 10px", verticalAlign: "bottom", textAlign: "right", fontSize: "12.5px", lineHeight: "20px", color: MUTED }}>
              <div>
                ថ្ងៃបោះពុម្ព: <b style={{ color: INK }}>{`${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`}</b>
              </div>
              <div>
                តួលេខគិតជា <b style={{ color: INK }}>{unit}</b> · 1$ = {rate.toLocaleString("en-US")}៛
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ─── Title ─── */}
      <div style={{ textAlign: "center", margin: "16px 0 14px" }}>
        <div style={{ fontFamily: MOUL, fontSize: "21px", lineHeight: "40px", color: INK }}>របាយការណ៍ចំណេញ-ខាតប្រចាំខែ</div>
        <div style={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "2.5px", color: MUTED }}>MONTHLY PROFIT & LOSS REPORT</div>
        <div style={{ fontSize: "15px", marginTop: "4px" }}>
          {monthLabel}
          {partial && <span style={{ color: MUTED }}> (ដល់{khDate(parseYmd(report.end))})</span>}
        </div>
      </div>

      {/* ─── Summary ─── */}
      <div data-pdf-unit="block" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        {card("ចំណូលសរុប", fmt(income), `${daysWithSales} ថ្ងៃមានចំណូល`, { fg: "#166534", bg: "#F0FDF4", bd: "#86EFAC" })}
        {card("ចំណាយសរុប", fmt(expense), undefined, { fg: "#9A3412", bg: "#FFF7ED", bd: "#FDBA74" })}
        {card(
          `${resultLabel} (${resultEn})`,
          `${isLoss ? "-" : ""}${fmt(Math.abs(net))}`,
          margin !== null ? `${margin.toFixed(1)}% នៃចំណូល` : undefined,
          isLoss ? { fg: LOSS, bg: "#FEF2F2", bd: "#FCA5A5" } : { fg: GAIN, bg: "#F0FDF4", bd: "#4ADE80" }
        )}
        {card("មធ្យមចំណូល / ថ្ងៃ", fmt(report.days.length ? income / report.days.length : 0), `${report.days.length} ថ្ងៃ`)}
      </div>

      {/* What the result does not include yet */}
      {(noPayroll || draftPayroll || noUtility || partial) && (
        <div
          data-pdf-unit="block"
          style={{ marginTop: "10px", padding: "7px 12px", border: "1px solid #FCD34D", background: "#FFFBEB", borderRadius: "8px", fontSize: "12.5px", color: "#92400E" }}
        >
          {noPayroll && <div>⚠ មិនទាន់កាត់ប្រាក់ខែបុគ្គលិក (មិនទាន់មានតារាងប្រាក់ខែសម្រាប់ខែនេះ) — ចំណេញពិតនឹងតិចជាងនេះ។</div>}
          {noUtility && <div>⚠ មិនទាន់មានចំណាយទឹកភ្លើង & សេវា (ភ្លើង ទឹក ជួលផ្ទះ…) ក្នុងខែនេះ — ចំណេញពិតនឹងតិចជាងនេះ។</div>}
          {!noPayroll && draftPayroll && <div>⚠ ប្រាក់ខែជាតួលេខព្រាង (មិនទាន់បើក) — អាចប្រែប្រួល។</div>}
          {partial && <div>⚠ ខែមិនទាន់ចប់ — តួលេខគិតត្រឹម{khDate(parseYmd(report.end))}។</div>}
        </div>
      )}

      {/* Where the money went */}
      {expense > 0 && (
        <div data-pdf-unit="block" style={{ marginTop: "12px" }}>
          <div style={{ display: "flex", height: "12px", borderRadius: "99px", overflow: "hidden", background: "#F1F5F9" }}>
            {GROUPS.map((g) => {
              const v = groupTotal(g.key);
              return v > 0 ? <div key={g.key} style={{ width: `${(v / expense) * 100}%`, background: g.color }} /> : null;
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: "6px", fontSize: "12px", color: MUTED }}>
            {GROUPS.map((g) => {
              const v = groupTotal(g.key);
              return (
                <span key={g.key}>
                  <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: g.color, marginRight: 5 }} />
                  {g.label} <b style={{ color: INK }}>{fmt(v)}</b> ({expense ? ((v / expense) * 100).toFixed(0) : 0}%)
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 1. Profit & loss statement (exact amounts) ─── */}
      <div data-pdf-unit="block">
        <SectionTitle>១. តារាងចំណេញ-ខាត <span style={{ fontSize: "12.5px", color: MUTED, fontWeight: 600 }}>Profit & loss · ចំនួនពិតតាមរូបិយប័ណ្ណ</span></SectionTitle>
        <table style={TABLE}>
          <colgroup>
            <col style={{ width: "40%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "18%" }} />
          </colgroup>
          <thead>
            <tr>
              <Th first align="left">ប្រភេទ</Th>
              <Th align="center">ចំនួន</Th>
              <Th>ដុល្លារ ($)</Th>
              <Th>រៀល (៛)</Th>
              <Th last>សរុប ≈ {currency === "USD" ? "$" : "៛"}</Th>
            </tr>
          </thead>
          <tbody>
            {([{ key: "income", label: "ចំណូល", en: "Income", color: GAIN }, ...GROUPS] as const).map((g, gi) => {
              const rows = report.categories.filter((c) => c.grp === g.key);
              const usd = rows.reduce((s, r) => s + r.usd, 0);
              const khr = rows.reduce((s, r) => s + r.khr, 0);
              const count = rows.reduce((s, r) => s + r.count, 0);
              const isIncome = g.key === "income";
              return (
                <React.Fragment key={g.key}>
                  {gi === 1 && (
                    <tr>
                      <td colSpan={5} style={cell({ ...FIRST, ...LAST, fontSize: "12px", fontWeight: 700, color: MUTED, paddingTop: "8px" })}>
                        ដក ចំណាយ <span style={{ fontWeight: 500 }}>Less: expenses</span>
                      </td>
                    </tr>
                  )}
                  <tr style={{ background: "#F8FAFC", fontWeight: 700 }}>
                    <td style={cell(FIRST)}>
                      <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: g.color, marginRight: 6 }} />
                      {g.label} <span style={{ color: MUTED, fontWeight: 500, fontSize: "11.5px" }}>{g.en}</span>
                    </td>
                    <td style={cell({ textAlign: "center" })}>{g.key === "payroll" ? DASH : count || DASH}</td>
                    <td style={cell(NUM)}>{usd ? formatUsd(usd) : DASH}</td>
                    <td style={cell(NUM)}>{khr ? formatKhr(khr) : DASH}</td>
                    <td style={cell({ ...NUM, ...LAST, color: isIncome ? GAIN : INK })}>{amt(conv(usd, khr))}</td>
                  </tr>
                  {/* Sub-rows only where they add information (payroll: always, for the run and its payment) */}
                  {(rows.length > 1 || g.key === "payroll") &&
                    rows.map((r) => (
                      <tr key={r.run_id ?? r.category} style={{ color: MUTED, fontSize: "12.5px" }}>
                        <td style={cell({ ...FIRST, paddingLeft: "28px" })}>
                          {r.category === "Other" ? "ផ្សេងៗ" : r.category}
                          {r.run_id != null && (
                            <span style={{ fontSize: "11.5px" }}>
                              {r.status === "paid" && r.paid_on ? ` · បានបើក ${dmy(r.paid_on)}` : " · មិនទាន់បើក"}
                            </span>
                          )}
                        </td>
                        <td style={cell({ textAlign: "center" })}>{r.run_id != null ? `${r.count} នាក់` : r.count}</td>
                        <td style={cell(NUM)}>{r.usd ? formatUsd(r.usd) : DASH}</td>
                        <td style={cell(NUM)}>{r.khr ? formatKhr(r.khr) : DASH}</td>
                        <td style={cell({ ...NUM, ...LAST })}>{amt(conv(r.usd, r.khr))}</td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
            <tr style={{ fontWeight: 700 }}>
              <td colSpan={2} style={cell({ ...FIRST, borderTop: `1px solid ${OUTER}` })}>
                ចំណាយសរុប <span style={{ color: MUTED, fontWeight: 500, fontSize: "11.5px" }}>Total expenses</span>
              </td>
              <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}` })}>{t.expense_usd ? formatUsd(t.expense_usd) : DASH}</td>
              <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}` })}>{t.expense_khr ? formatKhr(t.expense_khr) : DASH}</td>
              <td style={cell({ ...NUM, ...LAST, borderTop: `1px solid ${OUTER}` })}>{amt(expense)}</td>
            </tr>
            <tr style={{ background: isLoss ? "#FEF2F2" : "#F0FDF4", fontWeight: 800 }}>
              <td colSpan={2} style={cell({ ...FIRST, borderTop: `1px solid ${OUTER}`, borderBottom: `1px solid ${OUTER}`, fontSize: "15px", padding: "9px 8px" })}>
                <span style={{ color: isLoss ? LOSS : GAIN }}>{resultLabel}</span>{" "}
                <span style={{ color: MUTED, fontWeight: 600, fontSize: "12px" }}>
                  {resultEn}
                  {margin !== null && ` · ${margin.toFixed(1)}% នៃចំណូល`}
                </span>
              </td>
              <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}`, borderBottom: `1px solid ${OUTER}` })}>
                {signedExact(t.net_usd, "USD")}
              </td>
              <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}`, borderBottom: `1px solid ${OUTER}` })}>
                {signedExact(t.net_khr, "KHR")}
              </td>
              <td style={cell({ ...NUM, ...LAST, borderTop: `1px solid ${OUTER}`, borderBottom: `1px solid ${OUTER}`, fontSize: "16px" })}>{signed(net)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: "12px", color: MUTED, marginTop: "6px" }}>
          * «ប្រាក់ខែ» = ប្រាក់ខែដែលបុគ្គលិករកបានសម្រាប់ខែនេះ (តាមតារាងប្រាក់ខែ) ទោះបីបើកនៅខែបន្ទាប់ក៏ដោយ។
          <br />* ចំណាយរួមទាំងវិក្កយបត្រដែលមិនទាន់បង់ (ជំពាក់)។ ចំណេញ-ខាតដុល្លារ និងរៀល ត្រូវមើលរួមគ្នា (សរុប ≈ តាមអត្រា 1$ = {rate.toLocaleString("en-US")}៛)។
        </div>
      </div>


      {/* ─── 2. Day by day ─── */}
      <SectionTitle>
        ២. សង្ខេបប្រចាំថ្ងៃ <span style={{ fontSize: "12.5px", color: MUTED, fontWeight: 600 }}>Daily summary · {unit}</span>
      </SectionTitle>
      <table data-pdf-repeat-head="" style={TABLE}>
        <colgroup>
          <col style={{ width: "12%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "19%" }} />
          <col style={{ width: "22%" }} />
        </colgroup>
        <thead>
          <tr>
            <Th first align="left">ថ្ងៃ</Th>
            <Th>ចំណូល</Th>
            <Th>ទិញទំនិញ</Th>
            <Th>ផ្សេងៗ</Th>
            <Th>ចំណាយ</Th>
            <Th last>សមតុល្យ</Th>
          </tr>
        </thead>
        <tbody>
          {report.days.map((d, idx) => {
            const date = parseYmd(d.date);
            const inc = conv(d.income_usd, d.income_khr);
            const exp = conv(d.expense_usd, d.expense_khr);
            const quiet = inc === 0 && exp === 0;
            const sunday = date.getDay() === 0;
            return (
              <tr key={d.date} data-pdf-unit="row" style={{ background: idx % 2 ? "#FAFBFC" : undefined, color: quiet ? MUTED : undefined }}>
                <td style={cell({ ...FIRST, whiteSpace: "nowrap" })}>
                  <b style={{ color: quiet ? MUTED : INK }}>{pad(date.getDate())}</b>
                  <span style={{ fontSize: "11.5px", color: sunday ? LOSS : MUTED }}> {KH_DAYS_SHORT[date.getDay()]}</span>
                </td>
                <td style={cell({ ...NUM, fontWeight: 600 })}>{amt(inc)}</td>
                <td style={cell(NUM)}>{amt(conv(d.purchase_usd, d.purchase_khr))}</td>
                <td style={cell(NUM)}>{amt(conv(d.other_usd, d.other_khr))}</td>
                <td style={cell({ ...NUM, fontWeight: 600 })}>{amt(exp)}</td>
                <td style={cell({ ...NUM, ...LAST, fontWeight: 700 })}>{signed(inc - exp)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          {/* Sum of the days, before the monthly costs */}
          <tr data-pdf-unit="row" data-pdf-keep-next="" style={{ background: "#F1F5F9", fontWeight: 700 }}>
            <td style={cell({ ...FIRST, borderTop: `1px solid ${OUTER}`, whiteSpace: "nowrap" })}>សរុបប្រចាំថ្ងៃ</td>
            <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}` })}>{amt(income)}</td>
            {DAY_GROUPS.map((g) => (
              <td key={g.key} style={cell({ ...NUM, borderTop: `1px solid ${OUTER}` })}>
                {amt(groupTotal(g.key))}
              </td>
            ))}
            <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}` })}>{amt(dayExpense)}</td>
            <td style={cell({ ...NUM, ...LAST, borderTop: `1px solid ${OUTER}` })}>{signed(income - dayExpense)}</td>
          </tr>

          {/* Monthly costs: paid about once a month, so not spread over the days */}
          <tr data-pdf-unit="row" data-pdf-keep-next="" style={{ background: "#FFFBEB" }}>
            <td colSpan={6} style={cell({ ...FIRST, ...LAST, borderTop: `1px solid ${OUTER}`, fontSize: "12.5px", fontWeight: 700, color: "#92400E" })}>
              ដក ចំណាយប្រចាំខែ{" "}
              <span style={{ fontWeight: 500, color: MUTED }}>Monthly costs · បង់ម្តងក្នុងមួយខែ មិនបែងចែកតាមថ្ងៃ</span>
            </td>
          </tr>
          {utilityRows.length === 0 ? (
            <tr data-pdf-unit="row" data-pdf-keep-next="" style={{ background: "#FFFDF5" }}>
              <td colSpan={4} style={cell({ ...FIRST, paddingLeft: "18px" })}>
                {swatch(groupColor("utility"))}
                <b style={{ color: INK }}>ទឹកភ្លើង & សេវា</b>
                <span style={{ color: MUTED, fontSize: "12px" }}> · មិនទាន់មានកត់ត្រាក្នុងខែនេះ</span>
              </td>
              <td style={cell(NUM)}>{DASH}</td>
              <td style={cell({ ...NUM, ...LAST })}>{DASH}</td>
            </tr>
          ) : (
            utilityRows.map((r) => {
              const v = conv(r.usd, r.khr);
              return (
                <tr key={r.category} data-pdf-unit="row" data-pdf-keep-next="" style={{ background: "#FFFDF5" }}>
                  <td colSpan={4} style={cell({ ...FIRST, paddingLeft: "18px" })}>
                    {swatch(groupColor("utility"))}
                    <b style={{ color: INK }}>{r.category}</b>
                    <span style={{ color: MUTED, fontSize: "12px" }}>
                      {r.first_date &&
                        (r.count > 1
                          ? ` · ${r.count} ដង (${dm(r.first_date)} – ${dm(r.last_date ?? r.first_date)})`
                          : ` · បង់ថ្ងៃ ${dm(r.first_date)}`)}
                    </span>
                  </td>
                  <td style={cell({ ...NUM, fontWeight: 600 })}>{amt(v)}</td>
                  <td style={cell({ ...NUM, ...LAST, fontWeight: 700 })}>{signed(-v)}</td>
                </tr>
              );
            })
          )}
          <tr data-pdf-unit="row" data-pdf-keep-next="" style={{ background: "#FFFDF5" }}>
            <td colSpan={4} style={cell({ ...FIRST, paddingLeft: "18px" })}>
              {swatch(groupColor("payroll"))}
              <b style={{ color: INK }}>ប្រាក់ខែបុគ្គលិក</b>
              <span style={{ color: MUTED, fontSize: "12px" }}>
                {report.payroll_runs.length > 0
                  ? ` · ${staffCount} នាក់${report.payroll_runs.every((r) => r.paid_on) ? ` · បើកថ្ងៃ ${report.payroll_runs.map((r) => dm(r.paid_on!)).join(", ")}` : " · មិនទាន់បើក"}`
                  : " · មិនទាន់មានតារាងប្រាក់ខែ"}
              </span>
            </td>
            <td style={cell({ ...NUM, fontWeight: 600 })}>{amt(payroll)}</td>
            <td style={cell({ ...NUM, ...LAST, fontWeight: 700 })}>{signed(-payroll)}</td>
          </tr>

          {/* Month result */}
          <tr data-pdf-unit="row" style={{ background: HEAD_BG, fontWeight: 800 }}>
            <td colSpan={4} style={cell({ ...FIRST, borderTop: `1px solid ${OUTER}`, borderBottom: `1px solid ${OUTER}` })}>
              សរុបខែ · <span style={{ color: isLoss ? LOSS : GAIN }}>{resultLabel}</span>
            </td>
            <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}`, borderBottom: `1px solid ${OUTER}` })}>{fmt(expense)}</td>
            <td style={cell({ ...NUM, ...LAST, borderTop: `1px solid ${OUTER}`, borderBottom: `1px solid ${OUTER}`, fontSize: "14.5px" })}>
              {signed(net)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ─── Signatures ─── */}
      <div data-pdf-unit="block" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", paddingTop: "24px", textAlign: "center" }}>
        <div>
          <div style={{ height: "22px" }} />
          <div style={{ fontFamily: MOUL, fontSize: "13.5px", lineHeight: "28px", color: BRAND }}>បានឃើញ និងឯកភាព</div>
          <div style={{ fontSize: "12px", color: MUTED }}>ម្ចាស់ភោជនីយដ្ឋាន</div>
          <div style={{ height: "56px" }} />
          <div style={{ color: "#94A3B8", letterSpacing: "2px" }}>..............................</div>
        </div>
        <div>
          <div style={{ height: "22px", color: MUTED }}>{khDate(now)}</div>
          <div style={{ fontFamily: MOUL, fontSize: "13.5px", lineHeight: "28px" }}>អ្នករៀបចំ</div>
          <div style={{ fontSize: "12px", color: MUTED }}>Prepared by</div>
          <div style={{ height: "56px" }} />
          <div style={{ fontWeight: 700 }}>{preparedBy}</div>
        </div>
      </div>
    </div>
  );
});

/** Exact per-currency balance with sign and colour */
function signedExact(v: number, cur: "USD" | "KHR") {
  if (Math.abs(v) < 0.005) return DASH;
  const text = cur === "USD" ? formatUsd(Math.abs(v)) : formatKhr(Math.abs(v));
  return <span style={{ color: v < 0 ? LOSS : GAIN }}>{v < 0 ? "-" : ""}{text}</span>;
}
