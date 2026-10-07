import React, { forwardRef, type CSSProperties } from "react";
import { formatUsd, formatKhr } from "@/lib/utils";
import { khDate, dmy, parseYmd, pad } from "@/lib/khmerDate";
import type { PayrollRun, PayrollRunItem } from "@/hooks/usePayroll";

/** Width of the export sheet in CSS px; the PDF scales it onto A4 portrait. */
export const PAYROLL_SHEET_WIDTH = 880;

const FONT = '"Kantumruy Pro", "Noto Sans Khmer", "Khmer OS Siemreap", system-ui, sans-serif';
const MOUL = '"Moul", "Khmer OS Muol Light", "Kantumruy Pro", serif';
const INK = "#0F172A";
const BODY = "#1E293B";
const MUTED = "#475569";
const OUTER = "#334155";
const INNER = "#CBD5E1";
const HEAD_BG = "#E7F0ED";
const BRAND = "#0B5D4B";
const PLUS = "#15803D";
const MINUS = "#B91C1C";
const WARN = "#B45309";

type Cur = "USD" | "KHR";
const money = (v: number, cur: Cur) => (cur === "USD" ? formatUsd(v) : formatKhr(v));
const n = (v: unknown) => Number(v) || 0;

// Each cell draws only its right + bottom edge (first column also left), so every row is a
// self-contained box and the PDF can break pages between rows.
const cell = (extra?: CSSProperties): CSSProperties => ({
  borderRight: `1px solid ${INNER}`,
  borderBottom: `1px solid ${INNER}`,
  padding: "7px 8px",
  verticalAlign: "middle",
  ...extra,
});
const FIRST: CSSProperties = { borderLeft: `1px solid ${OUTER}` };
const LAST: CSSProperties = { borderRight: `1px solid ${OUTER}` };
const NUM: CSSProperties = { textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const DASH = <span style={{ color: "#CBD5E1" }}>—</span>;

/** "មេចុងភៅ (Head Chef)" → "មេចុងភៅ" so each row stays on one line */
const shortPosition = (p: string) => (p || "").replace(/\s*\([^)]*\)\s*$/, "").trim() || p;

/** Per-line amounts the sheet shows */
function lineMoney(it: PayrollRunItem) {
  const extra = n(it.bonus) + n(it.allowance);
  const deductions: { label: string; amount: number }[] = [
    { label: "បុរេប្រទាន", amount: n(it.advances) },
    { label: "សងប្រាក់កម្ចី", amount: n(it.loan_deduction) },
    { label: "ពិន័យ", amount: n(it.penalty) },
    { label: "បំណុលចាស់", amount: n(it.carry_in) },
  ].filter((d) => d.amount > 0);
  return { gross: n(it.gross), extra, deductions, deducted: deductions.reduce((s, d) => s + d.amount, 0), net: n(it.net) };
}

function Th({ children, align = "center", first, last }: { children: React.ReactNode; align?: "left" | "center" | "right"; first?: boolean; last?: boolean }) {
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
interface PayrollPrintTemplateProps {
  run: PayrollRun | null;
  preparedBy?: string;
}

export const PayrollPrintTemplate = forwardRef<HTMLDivElement, PayrollPrintTemplateProps>(
  function PayrollPrintTemplate({ run, preparedBy = "អ្នកគ្រប់គ្រង" }, ref) {
    if (!run) return null;

    const items = run.items || [];
    const now = new Date();
    const rate = n(run.exchange_rate) || 4000;

    // Totals per currency — never add dollars and riel together
    const currencies = (["USD", "KHR"] as Cur[]).filter((c) => items.some((it) => it.currency === c));
    const totals = Object.fromEntries(
      currencies.map((c) => {
        const rows = items.filter((it) => it.currency === c).map(lineMoney);
        return [c, {
          count: rows.length,
          gross: rows.reduce((s, r) => s + r.gross, 0),
          extra: rows.reduce((s, r) => s + r.extra, 0),
          deducted: rows.reduce((s, r) => s + r.deducted, 0),
          net: rows.reduce((s, r) => s + r.net, 0),
        }];
      })
    ) as Record<Cur, { count: number; gross: number; extra: number; deducted: number; net: number }>;
    const totalInRiel = (totals.USD?.net ?? 0) * rate + (totals.KHR?.net ?? 0);
    // Rows grouped by currency (USD first); ល.រ runs through the whole sheet
    let counter = 0;
    const sections = currencies.map((cur) => ({
      cur,
      rows: items.filter((it) => it.currency === cur).map((it) => ({ it, no: ++counter })),
    }));
    // "សុខា: បុរេប្រទាន $5.00" — details behind the single "កាត់" column
    const deductionNotes = items.flatMap((it) =>
      lineMoney(it).deductions.map((d) => `${it.staff_name}: ${d.label} ${money(d.amount, it.currency as Cur)}`)
    );
    const anyOverride = items.some((it) => it.days_override !== null && it.days_override !== undefined);
    const anyUnrecorded = run.status === "draft" && items.some((it) => n(it.unrecorded_days) > 0);

    const status =
      run.status === "paid"
        ? { text: "បានបើករួច · PAID", fg: "#166534", bg: "#DCFCE7", bd: "#86EFAC" }
        : run.status === "void"
        ? { text: "បានលុបចោល · VOID", fg: "#991B1B", bg: "#FEE2E2", bd: "#FCA5A5" }
        : { text: "សេចក្តីព្រាង · DRAFT", fg: "#92400E", bg: "#FEF3C7", bd: "#FCD34D" };

    const card = (label: string, value: React.ReactNode, tone?: { fg: string; bg: string; bd: string }) => (
      <div
        style={{
          border: `1px solid ${tone?.bd ?? INNER}`,
          background: tone?.bg ?? "#F8FAFC",
          borderRadius: "10px",
          padding: "10px 12px",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: 600, color: tone?.fg ?? MUTED }}>{label}</div>
        <div style={{ fontSize: "16px", fontWeight: 700, color: tone?.fg ?? INK, marginTop: "2px", lineHeight: "22px" }}>{value}</div>
      </div>
    );
    const byCur = (pick: (t: (typeof totals)[Cur]) => number, sign = "") =>
      currencies.length === 0
        ? "—"
        : currencies.map((c) => (
            <div key={c}>
              {pick(totals[c]) > 0 ? sign : ""}
              {money(pick(totals[c]), c)}
            </div>
          ));

    return (
      <div
        id="payroll-print-root"
        ref={ref}
        style={{
          width: `${PAYROLL_SHEET_WIDTH}px`,
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
        {/* ─── 1. Letterhead ─── */}
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", borderBottom: `3px double ${BRAND}` }}>
          <tbody>
            <tr>
              <td style={{ padding: "0 0 10px", verticalAlign: "bottom" }}>
                <div style={{ fontFamily: MOUL, fontSize: "17px", lineHeight: "32px", color: BRAND }}>
                  ភោជនីយដ្ឋាន Bonchi
                </div>
                <div style={{ fontSize: "12px", color: MUTED, letterSpacing: "0.5px" }}>
                  BONCHI RESTAURANT · តារាងប្រាក់ខែ
                </div>
              </td>
              <td style={{ width: "300px", padding: "0 0 10px", verticalAlign: "bottom", textAlign: "right", fontSize: "12.5px", lineHeight: "20px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: "6px",
                    fontWeight: 700,
                    color: status.fg,
                    background: status.bg,
                    border: `1px solid ${status.bd}`,
                  }}
                >
                  {status.text}
                </span>
                <div style={{ color: MUTED, marginTop: "4px" }}>
                  ថ្ងៃបោះពុម្ព: <b style={{ color: INK }}>{`${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`}</b>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ─── 2. Title ─── */}
        <div style={{ textAlign: "center", margin: "16px 0 14px" }}>
          <div style={{ fontFamily: MOUL, fontSize: "21px", lineHeight: "40px", color: INK }}>តារាងបើកប្រាក់ខែបុគ្គលិក</div>
          <div style={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "2.5px", color: MUTED }}>STAFF PAYROLL SHEET</div>
          <div style={{ fontSize: "14.5px", marginTop: "4px", color: BODY }}>
            ពី{khDate(parseYmd(run.period_start))} ដល់{khDate(parseYmd(run.period_end))}
          </div>
          <div style={{ fontSize: "12.5px", color: MUTED }}>
            ថ្ងៃបើកប្រាក់: {dmy(run.payout_date)} · អត្រាប្តូរប្រាក់: 1$ = {rate.toLocaleString("en-US")}៛
            {run.title ? ` · ${run.title}` : ""}
          </div>
        </div>

        {/* ─── 3. Summary ─── */}
        <div data-pdf-unit="block" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1.2fr 1.4fr", gap: "10px", marginBottom: "16px" }}>
          {card("បុគ្គលិក", `${items.length} នាក់`)}
          {card("ប្រាក់ខែ + បន្ថែម", byCur((t) => t.gross + t.extra))}
          {card("កាត់ចេញ", byCur((t) => t.deducted, "-"), { fg: WARN, bg: "#FFFBEB", bd: "#FCD34D" })}
          {card("ត្រូវបើកសរុប", byCur((t) => t.net), { fg: "#166534", bg: "#F0FDF4", bd: "#86EFAC" })}
        </div>

        {/* ─── 4. The list: one section per currency, one line per staff ─── */}
        <table data-pdf-repeat-head="" style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "9%" }} />
          </colgroup>
          <thead>
            <tr>
              <Th first>ល.រ</Th>
              <Th align="left">ឈ្មោះ / តួនាទី</Th>
              <Th align="right">ប្រាក់ខែ</Th>
              <Th align="right">ប្រាក់/ថ្ងៃ</Th>
              <Th>ថ្ងៃ</Th>
              <Th align="right">ទទួលបាន</Th>
              <Th align="right">បន្ថែម</Th>
              <Th align="right">កាត់</Th>
              <Th align="right">ត្រូវបើក</Th>
              <Th last>ហត្ថលេខា</Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr data-pdf-unit="row">
                <td colSpan={10} style={cell({ ...FIRST, ...LAST, textAlign: "center", padding: "18px", color: MUTED })}>
                  គ្មានបុគ្គលិកក្នុងតារាងនេះ
                </td>
              </tr>
            )}
            {sections.map((sec, si) => {
              const t = totals[sec.cur];
              return (
                <React.Fragment key={sec.cur}>
                  {/* Section heading */}
                  <tr data-pdf-unit="row" data-pdf-keep-next="">
                    <td
                      colSpan={10}
                      style={cell({
                        ...FIRST,
                        ...LAST,
                        background: "#F1F5F9",
                        fontWeight: 700,
                        color: INK,
                        padding: "6px 10px",
                        borderTop: si > 0 ? `1px solid ${OUTER}` : undefined,
                      })}
                    >
                      {sec.cur === "USD" ? "ក. បើកជាប្រាក់ដុល្លារ ($)" : `${sections.length > 1 ? "ខ" : "ក"}. បើកជាប្រាក់រៀល (៛)`}
                      <span style={{ fontWeight: 500, color: MUTED }}> · {sec.rows.length} នាក់</span>
                    </td>
                  </tr>

                  {sec.rows.map(({ it, no }, idx) => {
                    const cur = sec.cur;
                    const m = lineMoney(it);
                    const overridden = it.days_override !== null && it.days_override !== undefined;
                    const days = overridden ? n(it.days_override) : n(it.days_counted);
                    const monthly = it.salary_type === "monthly";
                    const unrecorded = run.status === "draft" && n(it.unrecorded_days) > 0;
                    const zebra = idx % 2 === 1 ? "#FAFBFC" : undefined;
                    return (
                      <tr key={it.id ?? `${it.staff_id}-${idx}`} data-pdf-unit="row" style={{ background: zebra }}>
                        <td style={cell({ ...FIRST, textAlign: "center", color: MUTED, fontVariantNumeric: "tabular-nums" })}>{no}</td>
                        <td style={cell({ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" })}>
                          <b style={{ color: INK }}>{it.staff_name}</b>
                          <span style={{ color: MUTED, fontSize: "12px" }}> · {shortPosition(it.position)}</span>
                        </td>
                        <td style={cell(NUM)}>
                          {money(n(it.contract_base_rate), cur)}
                          <span style={{ color: MUTED, fontSize: "11px" }}>{monthly ? " /ខែ" : " /ថ្ងៃ"}</span>
                        </td>
                        <td style={cell({ ...NUM, color: MUTED })}>{money(n(it.daily_rate), cur)}</td>
                        <td style={cell({ textAlign: "center", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" })}>
                          <b>{days}</b>
                          {overridden && <b style={{ color: WARN }}>*</b>}
                          {monthly && <span style={{ color: MUTED, fontSize: "11px" }}>/{it.standard_days}</span>}
                          {unrecorded && <span style={{ color: WARN, fontSize: "11px" }}> ⚠</span>}
                        </td>
                        <td style={cell(NUM)}>{money(m.gross, cur)}</td>
                        <td style={cell({ ...NUM, color: m.extra > 0 ? PLUS : undefined })}>
                          {m.extra > 0 ? `+${money(m.extra, cur)}` : DASH}
                        </td>
                        <td style={cell({ ...NUM, color: m.deducted > 0 ? MINUS : undefined })}>
                          {m.deducted > 0 ? `−${money(m.deducted, cur)}` : DASH}
                        </td>
                        <td style={cell({ ...NUM, fontWeight: 800, fontSize: "14.5px", color: "#166534", background: "#F0FDF4" })}>
                          {money(m.net, cur)}
                        </td>
                        <td style={cell(LAST)} />
                      </tr>
                    );
                  })}

                  {/* Section subtotal — sits directly under its own columns */}
                  <tr data-pdf-unit="row" style={{ background: HEAD_BG, fontWeight: 700 }}>
                    <td colSpan={5} style={cell({ ...FIRST, textAlign: "right", borderTop: `1px solid ${OUTER}` })}>
                      សរុប{sec.cur === "USD" ? "ដុល្លារ" : "រៀល"}
                    </td>
                    <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}` })}>{money(t.gross, sec.cur)}</td>
                    <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}`, color: t.extra > 0 ? PLUS : undefined })}>
                      {t.extra > 0 ? `+${money(t.extra, sec.cur)}` : DASH}
                    </td>
                    <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}`, color: t.deducted > 0 ? MINUS : undefined })}>
                      {t.deducted > 0 ? `−${money(t.deducted, sec.cur)}` : DASH}
                    </td>
                    <td style={cell({ ...NUM, borderTop: `1px solid ${OUTER}`, fontSize: "15px", color: "#166534" })}>
                      {money(t.net, sec.cur)}
                    </td>
                    <td style={cell({ ...LAST, borderTop: `1px solid ${OUTER}` })} />
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            {sections.length > 1 && (
              <tr data-pdf-unit="row" style={{ fontWeight: 700 }}>
                <td colSpan={8} style={cell({ ...FIRST, textAlign: "right", borderTop: `1px solid ${OUTER}`, borderBottom: `1px solid ${OUTER}` })}>
                  សរុបត្រូវបើកទាំងអស់ គិតជាប្រាក់រៀល
                  <span style={{ fontWeight: 500, color: MUTED, fontSize: "12px" }}> (1$ = {rate.toLocaleString("en-US")}៛)</span>
                </td>
                <td
                  colSpan={2}
                  style={cell({
                    ...NUM,
                    ...LAST,
                    textAlign: "center",
                    fontSize: "15px",
                    color: BRAND,
                    borderTop: `1px solid ${OUTER}`,
                    borderBottom: `1px solid ${OUTER}`,
                  })}
                >
                  ≈ {formatKhr(totalInRiel)}
                </td>
              </tr>
            )}
            {sections.length === 1 && (
              <tr>
                <td colSpan={10} style={{ borderTop: `1px solid ${OUTER}`, height: 0, padding: 0 }} />
              </tr>
            )}
          </tfoot>
        </table>

        {/* ─── 5. Notes: how it is calculated + what was deducted ─── */}
        <div data-pdf-unit="block" style={{ fontSize: "12px", lineHeight: "19px", color: MUTED, paddingTop: "8px" }}>
          <div>
            <b style={{ color: BODY }}>ទទួលបាន</b> = ថ្ងៃធ្វើការ × ប្រាក់/ថ្ងៃ (ប្រាក់ខែ ÷ ថ្ងៃស្តង់ដារ) ·{" "}
            <b style={{ color: BODY }}>ត្រូវបើក</b> = ទទួលបាន + បន្ថែម − កាត់
          </div>
          {deductionNotes.length > 0 && (
            <div>
              <b style={{ color: BODY }}>កាត់៖</b>{" "}
              {deductionNotes.map((d, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  {d}
                </span>
              ))}
            </div>
          )}
          {anyOverride && (
            <div>
              <b style={{ color: WARN }}>*</b> ថ្ងៃធ្វើការដែលបានកែដោយដៃ
            </div>
          )}
          {anyUnrecorded && (
            <div style={{ color: WARN }}>⚠ នៅមានថ្ងៃមិនទាន់កត់វត្តមាន — សូមពិនិត្យមុនពេលបើកប្រាក់</div>
          )}
        </div>

        {/* ─── 6. Signatures ─── */}
        <div
          data-pdf-unit="block"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", paddingTop: "22px", textAlign: "center" }}
        >
          {[
            { title: "អ្នករៀបចំ", sub: "Prepared by", name: preparedBy },
            { title: "អ្នកត្រួតពិនិត្យ", sub: "Checked by", name: "" },
            { title: "បានឃើញ និងឯកភាព", sub: "ម្ចាស់ភោជនីយដ្ឋាន · Approved by", name: "" },
          ].map((s, i) => (
            <div key={s.title}>
              <div style={{ height: "22px", color: MUTED }}>{i === 2 ? khDate(now) : ""}</div>
              <div style={{ fontFamily: MOUL, fontSize: "13.5px", lineHeight: "28px", color: i === 2 ? BRAND : INK }}>{s.title}</div>
              <div style={{ fontSize: "11.5px", color: MUTED }}>{s.sub}</div>
              <div style={{ height: "56px" }} />
              {s.name ? (
                <div style={{ fontWeight: 700 }}>{s.name}</div>
              ) : (
                <div style={{ color: "#94A3B8", letterSpacing: "2px" }}>..............................</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
);
