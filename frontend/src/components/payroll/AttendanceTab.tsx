"use client";

import React, { useMemo, useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import {
  useDailyAttendance,
  useAttendanceRange,
  useSaveAttendanceBatch,
  type AttendanceStatus,
} from "@/hooks/usePayroll";
import { useDashboardContext } from "@/app/(dashboard)/DashboardContext";

/* ─── Status vocabulary ─────────────────────────────────────────────── */

type StatusDef = { label: string; short: string; units: number; color: string; soft: string };

const STATUS: Record<AttendanceStatus, StatusDef> = {
  present: { label: "មកពេញ", short: "✓", units: 1, color: "var(--success)", soft: "var(--success-soft)" },
  half_day: { label: "កន្លះថ្ងៃ", short: "½", units: 0.5, color: "var(--warning)", soft: "var(--warning-soft)" },
  absent: { label: "អវត្តមាន", short: "✕", units: 0, color: "var(--danger)", soft: "var(--danger-soft)" },
  leave_paid: { label: "ច្បាប់", short: "ច", units: 1, color: "var(--brand)", soft: "var(--brand-soft)" },
  leave_unpaid: { label: "ច្បាប់គ្មានប្រាក់", short: "គ", units: 0, color: "var(--ink-muted)", soft: "var(--surface-sunken)" },
  holiday_work: { label: "ធ្វើថ្ងៃបុណ្យ ×2", short: "២", units: 2, color: "var(--income)", soft: "var(--income-soft)" },
};
/** One tap each — the everyday cases */
const QUICK: AttendanceStatus[] = ["present", "half_day", "absent", "leave_paid"];
/** Behind "⋯" — rare cases */
const MORE: AttendanceStatus[] = ["leave_unpaid", "holiday_work"];

/* ─── Dates (local time — toISOString() would shift to UTC and show yesterday before 7am) ─── */

const KH_DAYS = ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
const KH_DAYS_SHORT = ["អា", "ច", "អ", "ពុ", "ព្រ", "សុ", "ស"];
const KH_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
const todayStr = () => ymd(new Date());

/* ═══════════════════════════════════════════════════════════════════ */

/** Count Day tab: fast daily entry + a month grid to spot gaps */
export default function AttendanceTab() {
  const [view, setView] = useState<"day" | "month">("day");
  const [date, setDate] = useState(todayStr);
  const [month, setMonth] = useState(() => todayStr().slice(0, 7));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div className="bc-seg" style={{ alignSelf: "flex-start" }}>
        <button type="button" aria-pressed={view === "day"} onClick={() => setView("day")}>
          កត់ប្រចាំថ្ងៃ
        </button>
        <button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}>
          តារាងខែ
        </button>
      </div>

      {view === "day" ? (
        <DayView date={date} setDate={setDate} />
      ) : (
        <MonthView
          month={month}
          setMonth={setMonth}
          onOpenDay={(d) => {
            setDate(d);
            setView("day");
          }}
        />
      )}
    </div>
  );
}

/* ─── Day view: fast entry ─────────────────────────────────────────── */

type Draft = Record<number, { status: AttendanceStatus; note: string | null }>;

function DayView({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const { showToast } = useDashboardContext();
  const { data: rows = [], isLoading } = useDailyAttendance(date);
  const save = useSaveAttendanceBatch();
  // Only rows the user touched; everything else shows what the server has
  const [draft, setDraft] = useState<Draft>({});
  const [openMore, setOpenMore] = useState<number | null>(null);

  const today = todayStr();
  const d = parse(date);
  const dirtyIds = Object.keys(draft).map(Number);
  const isFuture = date > today;

  const current = (id: number) => {
    const r = rows.find((x) => x.staff_id === id);
    return draft[id] ?? (r?.status ? { status: r.status, note: r.note } : null);
  };

  const setStatus = (id: number, status: AttendanceStatus) =>
    setDraft((p) => ({ ...p, [id]: { status, note: current(id)?.note ?? null } }));
  const setNote = (id: number, note: string) =>
    setDraft((p) => {
      const base = current(id);
      return { ...p, [id]: { status: base?.status ?? "present", note: note || null } };
    });

  const unrecorded = rows.filter((r) => !current(r.staff_id));
  const counts = QUICK.concat(MORE).map((s) => ({
    s,
    n: rows.filter((r) => current(r.staff_id)?.status === s).length,
  }));
  const paidDays = rows.reduce((sum, r) => {
    const c = current(r.staff_id);
    return sum + (c ? STATUS[c.status].units : 0);
  }, 0);
  const recorded = rows.length - unrecorded.length;

  const goTo = (next: string) => {
    if (dirtyIds.length && !confirm("មិនទាន់រក្សាទុកការកែប្រែទេ។ ចាកចេញ ហើយបោះបង់?")) return;
    setDraft({});
    setOpenMore(null);
    setDate(next);
  };

  const markRestPresent = () =>
    setDraft((p) => {
      const next = { ...p };
      unrecorded.forEach((r) => (next[r.staff_id] = { status: "present", note: null }));
      return next;
    });

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        date,
        records: dirtyIds.map((id) => ({ staff_id: id, status: draft[id].status, note: draft[id].note })),
      });
      showToast(`បានរក្សាទុក ${dirtyIds.length} នាក់`, "success");
      setDraft({});
      setOpenMore(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "បរាជ័យក្នុងការរក្សាទុក", "error");
    }
  };

  return (
    <>
      {/* Date + progress */}
      <section className="w-panel" style={{ gap: "10px", padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button type="button" className="bc-iconbtn" aria-label="ថ្ងៃមុន" onClick={() => goTo(addDays(date, -1))} style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1 }}>
            ‹
          </button>
          <div style={{ flex: 1, textAlign: "center", lineHeight: 1.3 }}>
            <b style={{ fontSize: "16px" }}>
              ថ្ងៃ{KH_DAYS[d.getDay()]} {pad(d.getDate())} {KH_MONTHS[d.getMonth()]} {d.getFullYear()}
            </b>
            <div className="p-muted" style={{ fontSize: "12px" }}>
              {date === today ? "ថ្ងៃនេះ" : date === addDays(today, -1) ? "ម្សិលមិញ" : isFuture ? "ថ្ងៃខាងមុខ" : ""}
            </div>
          </div>
          <button
            type="button"
            className="bc-iconbtn"
            aria-label="ថ្ងៃបន្ទាប់"
            onClick={() => goTo(addDays(date, 1))}
            disabled={isFuture}
            style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1 }}
          >
            ›
          </button>
          <label className="bc-iconbtn" style={{ position: "relative", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="ជ្រើសថ្ងៃ">
            <BonchiIcon name="calendar" size={18} />
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => e.target.value && goTo(e.target.value)}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
            />
          </label>
          {date !== today && (
            <button type="button" className="p-chip" onClick={() => goTo(today)}>
              ថ្ងៃនេះ
            </button>
          )}
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
            <span>
              បានកត់ <b>{recorded}</b> / {rows.length} នាក់
            </span>
            <span>
              សរុប <b>{paidDays}</b> ថ្ងៃគិតប្រាក់
            </span>
          </div>
          <div style={{ height: "6px", borderRadius: "99px", background: "var(--surface-sunken)", overflow: "hidden" }}>
            <div
              style={{
                width: rows.length ? `${(recorded / rows.length) * 100}%` : 0,
                height: "100%",
                background: unrecorded.length ? "var(--warning)" : "var(--success)",
                transition: "width .2s",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {counts
            .filter((c) => c.n > 0)
            .map((c) => (
              <span key={c.s} className="bc-badge" style={{ background: STATUS[c.s].soft, color: STATUS[c.s].color }}>
                {STATUS[c.s].short} {STATUS[c.s].label} {c.n}
              </span>
            ))}
          {unrecorded.length > 0 && (
            <span className="bc-badge bc-badge-warning" style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <BonchiIcon name="alert" size={12} />
              <span>មិនទាន់កត់ {unrecorded.length}</span>
            </span>
          )}
        </div>

        {unrecorded.length > 0 && !isFuture && (
          <button type="button" className="bc-btn bc-btn-secondary" onClick={markRestPresent} style={{ minHeight: "40px" }}>
            <BonchiIcon name="check" size={16} /> កត់អ្នកនៅសល់ ({unrecorded.length} នាក់) ថា «មកពេញ»
          </button>
        )}
      </section>

      {/* Staff rows */}
      <section className="w-panel" style={{ padding: "4px 0", gap: 0 }}>
        {isLoading && <p className="p-muted" style={{ padding: "24px", textAlign: "center" }}>កំពុងផ្ទុក...</p>}
        {!isLoading && rows.length === 0 && (
          <p className="p-muted" style={{ padding: "24px", textAlign: "center" }}>
            មិនមានបុគ្គលិកកំពុងធ្វើការនៅថ្ងៃនេះទេ
          </p>
        )}
        {rows.map((r, idx) => {
          const c = current(r.staff_id);
          const dirty = r.staff_id in draft;
          const extra = c && MORE.includes(c.status) ? c.status : null;
          const moreOpen = openMore === r.staff_id;
          return (
            <div
              key={r.staff_id}
              style={{
                padding: "10px 14px",
                borderTop: idx ? "1px solid var(--line)" : "none",
                background: dirty ? "var(--brand-soft)" : undefined,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px" }}>
                <div style={{ flex: "1 1 150px", minWidth: 0 }}>
                  <b style={{ fontSize: "14px" }}>{r.staff_name}</b>
                  {!c && <span className="bc-badge bc-badge-warning" style={{ marginLeft: 6, height: 20, fontSize: 11 }}>មិនទាន់កត់</span>}
                  {dirty && <span className="bc-badge bc-badge-neutral" style={{ marginLeft: 6, height: 20, fontSize: 11 }}>● មិនទាន់រក្សាទុក</span>}
                  <div className="p-muted" style={{ fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.position}
                    {c?.note && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", marginLeft: "4px" }}>
                        · <BonchiIcon name="note" size={11} /> {c.note}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "4px", flex: "1 1 300px", maxWidth: "460px" }}>
                  {QUICK.map((s) => {
                    const on = c?.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        disabled={isFuture}
                        onClick={() => setStatus(r.staff_id, s)}
                        style={{
                          flex: 1,
                          minHeight: "40px",
                          padding: "0 6px",
                          borderRadius: "10px",
                          border: `1.5px solid ${on ? STATUS[s].color : "var(--line)"}`,
                          background: on ? STATUS[s].soft : "var(--surface)",
                          color: on ? STATUS[s].color : "var(--ink-muted)",
                          fontWeight: on ? 700 : 500,
                          fontSize: "13px",
                          cursor: isFuture ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {STATUS[s].short} {STATUS[s].label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-label="ជម្រើសផ្សេងទៀត"
                    aria-expanded={moreOpen}
                    disabled={isFuture}
                    onClick={() => setOpenMore(moreOpen ? null : r.staff_id)}
                    style={{
                      minWidth: extra ? "auto" : "40px",
                      minHeight: "40px",
                      padding: "0 8px",
                      borderRadius: "10px",
                      border: `1.5px solid ${extra ? STATUS[extra].color : "var(--line)"}`,
                      background: extra ? STATUS[extra].soft : "var(--surface)",
                      color: extra ? STATUS[extra].color : "var(--ink-muted)",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {extra ? `${STATUS[extra].short} ${STATUS[extra].label}` : "⋯"}
                  </button>
                </div>
              </div>

              {moreOpen && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                  {MORE.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`p-chip ${c?.status === s ? "p-chip-on" : ""}`}
                      onClick={() => setStatus(r.staff_id, s)}
                    >
                      {STATUS[s].short} {STATUS[s].label} ({STATUS[s].units})
                    </button>
                  ))}
                  <input
                    className="bc-input"
                    placeholder="ចំណាំ (ឧ. មកយឺត, ឈឺ...)"
                    value={c?.note ?? ""}
                    onChange={(e) => setNote(r.staff_id, e.target.value)}
                    style={{ flex: "1 1 200px", minHeight: "36px", fontSize: "13px" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Save bar — only when something changed */}
      {dirtyIds.length > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: "12px",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            borderRadius: "14px",
            background: "var(--surface-raised)",
            border: "1px solid var(--line)",
            boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          }}
        >
          <span style={{ flex: 1, fontSize: "14px" }}>
            មានការកែប្រែ <b>{dirtyIds.length}</b> នាក់
          </span>
          <button type="button" className="bc-btn bc-btn-secondary" style={{ minHeight: "40px" }} onClick={() => setDraft({})}>
            បោះបង់
          </button>
          <button
            type="button"
            className="bc-btn bc-btn-primary"
            style={{ minHeight: "40px" }}
            onClick={handleSave}
            disabled={save.isPending}
          >
            <BonchiIcon name="check" size={16} />
            {save.isPending ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
          </button>
        </div>
      )}
    </>
  );
}

/* ─── Month view: the whole month at a glance ──────────────────────── */

function MonthView({
  month,
  setMonth,
  onOpenDay,
}: {
  month: string;
  setMonth: (m: string) => void;
  onOpenDay: (date: string) => void;
}) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const start = `${month}-01`;
  const end = `${month}-${pad(daysInMonth)}`;
  const today = todayStr();
  const { data, isLoading } = useAttendanceRange(start, end);

  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => `${month}-${pad(i + 1)}`), [month, daysInMonth]);
  const staff = useMemo(() => [...(data?.staff ?? [])].sort((p, q) => p.staff_id - q.staff_id), [data]);
  const byKey = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    data?.records.forEach((r) => map.set(`${r.staff_id}|${r.date}`, r.status));
    return map;
  }, [data]);

  const employed = (s: { joined_date: string; left_date: string | null }, day: string) =>
    day >= s.joined_date && (!s.left_date || day <= s.left_date);
  // Per staff: paid days and unrecorded past working days
  const totals = useMemo(() => {
    const out = new Map<number, { paid: number; missing: number }>();
    staff.forEach((s) => {
      let paid = 0;
      let missing = 0;
      days.forEach((day) => {
        const st = byKey.get(`${s.staff_id}|${day}`);
        if (st) paid += STATUS[st].units;
        else if (employed(s, day) && day <= today) missing += 1;
      });
      out.set(s.staff_id, { paid, missing });
    });
    return out;
  }, [staff, days, byKey, today]);

  const shiftMonth = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const cell: React.CSSProperties = { width: "26px", minWidth: "26px", height: "28px", textAlign: "center", padding: 0 };

  return (
    <section className="w-panel" style={{ gap: "10px", padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button type="button" className="bc-iconbtn" aria-label="ខែមុន" onClick={() => shiftMonth(-1)} style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1 }}>
          ‹
        </button>
        <b style={{ flex: 1, textAlign: "center", fontSize: "16px" }}>
          ខែ{KH_MONTHS[m - 1]} {y}
        </b>
        <button type="button" className="bc-iconbtn" aria-label="ខែបន្ទាប់" onClick={() => shiftMonth(1)} disabled={month >= today.slice(0, 7)} style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1 }}>
          ›
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "12px" }}>
        {(Object.keys(STATUS) as AttendanceStatus[]).map((s) => (
          <span key={s} className="bc-badge" style={{ background: STATUS[s].soft, color: STATUS[s].color, height: 22, fontSize: 12 }}>
            {STATUS[s].short} {STATUS[s].label}
          </span>
        ))}
        <span className="bc-badge bc-badge-warning" style={{ height: 22, fontSize: 12 }}>· មិនទាន់កត់</span>
        <span className="p-muted" style={{ alignSelf: "center" }}>ចុចលើថ្ងៃ ដើម្បីកែ</span>
      </div>

      {isLoading ? (
        <p className="p-muted" style={{ padding: "24px", textAlign: "center" }}>កំពុងផ្ទុក...</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "10px" }}>
          <table style={{ borderCollapse: "collapse", fontSize: "12px", width: "100%" }}>
            <thead>
              <tr style={{ background: "var(--surface-sunken)" }}>
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    background: "var(--surface-sunken)",
                    textAlign: "left",
                    padding: "6px 10px",
                    minWidth: "130px",
                  }}
                >
                  បុគ្គលិក
                </th>
                <th style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px" }}>ថ្ងៃគិតប្រាក់</th>
                <th style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px", borderRight: "1px solid var(--line)" }}>
                  មិនទាន់កត់
                </th>
                {days.map((day) => {
                  const wd = parse(day).getDay();
                  return (
                    <th
                      key={day}
                      onClick={() => day <= today && onOpenDay(day)}
                      style={{
                        ...cell,
                        cursor: day <= today ? "pointer" : "default",
                        color: day === today ? "var(--brand)" : wd === 0 ? "var(--danger)" : "var(--ink-muted)",
                        fontWeight: day === today ? 800 : 600,
                        lineHeight: 1.1,
                      }}
                    >
                      <div style={{ fontSize: "10px" }}>{KH_DAYS_SHORT[wd]}</div>
                      {Number(day.slice(8))}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const { paid, missing } = totals.get(s.staff_id) ?? { paid: 0, missing: 0 };
                return (
                  <tr key={s.staff_id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 1,
                        background: "var(--surface-raised)",
                        padding: "4px 10px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <b>{s.staff_name}</b>
                      <div className="p-muted" style={{ fontSize: "11px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.position}
                      </div>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 800, color: "var(--success)", fontSize: "13px" }}>{paid}</td>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: 700,
                        color: missing ? "var(--warning)" : "var(--ink-muted)",
                        borderRight: "1px solid var(--line)",
                      }}
                    >
                      {missing || "—"}
                    </td>
                    {days.map((day) => {
                      const st = byKey.get(`${s.staff_id}|${day}`);
                      const inJob = employed(s, day);
                      const past = day <= today;
                      return (
                        <td key={day} style={{ ...cell, padding: "2px" }}>
                          {inJob && past ? (
                            <button
                              type="button"
                              title={`${day} · ${st ? STATUS[st].label : "មិនទាន់កត់"}`}
                              onClick={() => onOpenDay(day)}
                              style={{
                                width: "22px",
                                height: "24px",
                                borderRadius: "6px",
                                border: st ? "none" : "1.5px dashed var(--warning)",
                                background: st ? STATUS[st].soft : "transparent",
                                color: st ? STATUS[st].color : "var(--warning)",
                                fontWeight: 800,
                                fontSize: "12px",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              {st ? STATUS[st].short : "·"}
                            </button>
                          ) : (
                            <span style={{ color: "var(--line-strong)" }}>{inJob ? "" : "–"}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
