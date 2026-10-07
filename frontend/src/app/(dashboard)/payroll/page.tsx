"use client";

import React, { useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useDashboardContext } from "../DashboardContext";
import {
  useStaff,
  useUpdateStaff,
  useStaffAdvances,
  usePayrollRuns,
  useVoidAdvance,
  useStaffLoans,
  useVoidLoan,
  Staff,
} from "@/hooks/usePayroll";
import StaffModal from "@/components/payroll/StaffModal";
import AdvanceModal from "@/components/payroll/AdvanceModal";
import LoanModal from "@/components/payroll/LoanModal";
import CreatePayrollRunModal from "@/components/payroll/CreatePayrollRunModal";
import PayrollRunDetailModal from "@/components/payroll/PayrollRunDetailModal";
import AttendanceTab from "@/components/payroll/AttendanceTab";

function getTenureText(joinedDateStr?: string) {
  if (!joinedDateStr) return "—";
  try {
    const joined = new Date(joinedDateStr);
    const now = new Date();
    const diffMonths = (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth());
    if (diffMonths < 1) return "ទើបចូលថ្មី (New)";
    if (diffMonths < 12) return `${diffMonths} ខែ`;
    const years = Math.floor(diffMonths / 12);
    const remMonths = diffMonths % 12;
    return remMonths > 0 ? `${years} ឆ្នាំ ${remMonths} ខែ` : `${years} ឆ្នាំ`;
  } catch {
    return joinedDateStr;
  }
}

const AVATAR_BG_COLORS = [
  { bg: "#E8F5E9", text: "#1B5E20" },
  { bg: "#E1F5FE", text: "#0277BD" },
  { bg: "#FFF8E1", text: "#B45309" },
  { bg: "#F3E5F5", text: "#7B1FA2" },
  { bg: "#FBE9E7", text: "#D84315" },
  { bg: "#E0F2F1", text: "#00695C" },
];

function getStaffColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return AVATAR_BG_COLORS[Math.abs(hash) % AVATAR_BG_COLORS.length];
}

type PayrollTab = "attendance" | "runs" | "advances" | "loans" | "staff";

export default function PayrollPage() {
  const { isOwner, showToast, wallets } = useDashboardContext();

  const [activeTab, setActiveTab] = useState<PayrollTab>("attendance");

  // --- Modals state ---
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<Staff | null>(null);

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [preselectedLoanStaffId, setPreselectedLoanStaffId] = useState<number | null>(null);
  const [isCreateRunOpen, setIsCreateRunOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  // --- Staff Data ---
  const { data: staffList = [], isLoading: isStaffLoading } = useStaff(true);
  const activeStaffList = React.useMemo(() => staffList.filter((s) => s.is_active), [staffList]);

  // --- Staff Tab Search, Filters, View Mode, Preselected Advance ---
  const [staffSearch, setStaffSearch] = useState("");
  const [staffStatusFilter, setStaffStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [staffPositionFilter, setStaffPositionFilter] = useState<string>("all");
  const [staffViewMode, setStaffViewMode] = useState<"table" | "cards">("table");
  const [preselectedAdvanceStaffId, setPreselectedAdvanceStaffId] = useState<number | null>(null);

  const updateStaffMutation = useUpdateStaff();

  const handleToggleStaffActive = async (s: Staff) => {
    if (!isOwner) return;
    const actionText = s.is_active ? "ផ្អាកដំណើរការ (Deactivate)" : "ដាក់ឱ្យដំណើរការឡើងវិញ (Activate)";
    if (!confirm(`តើអ្នកពិតជាចង់${actionText}បុគ្គលិក "${s.name}" មែនទេ?`)) return;
    try {
      await updateStaffMutation.mutateAsync({
        id: s.id,
        is_active: !s.is_active,
        left_date: s.is_active ? new Date().toISOString().slice(0, 10) : null,
      });
      showToast(
        s.is_active
          ? `បានផ្អាកបុគ្គលិក "${s.name}"`
          : `បានដាក់បុគ្គលិក "${s.name}" ឱ្យដំណើរការឡើងវិញ`,
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "បរាជ័យក្នុងការផ្លាស់ប្តូរស្ថានភាព", "error");
    }
  };

  const handleOpenAdvanceForStaff = (staffId: number) => {
    setPreselectedAdvanceStaffId(staffId);
    setIsAdvanceModalOpen(true);
  };

  const handleOpenLoanForStaff = (staffId: number) => {
    setPreselectedLoanStaffId(staffId);
    setIsLoanModalOpen(true);
  };

  const allPositions = React.useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.position) set.add(s.position.trim());
    });
    return Array.from(set);
  }, [staffList]);

  const filteredStaffList = React.useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    return staffList.filter((s) => {
      if (staffStatusFilter === "active" && !s.is_active) return false;
      if (staffStatusFilter === "inactive" && s.is_active) return false;
      if (staffPositionFilter !== "all" && s.position !== staffPositionFilter) return false;
      if (q) {
        const matchName = s.name.toLowerCase().includes(q);
        const matchPos = s.position.toLowerCase().includes(q);
        const matchPhone = (s.phone || "").toLowerCase().includes(q);
        if (!matchName && !matchPos && !matchPhone) return false;
      }
      return true;
    });
  }, [staffList, staffSearch, staffStatusFilter, staffPositionFilter]);

  const totalStaffCount = staffList.length;
  const activeStaffCount = staffList.filter((s) => s.is_active).length;
  const inactiveStaffCount = totalStaffCount - activeStaffCount;

  const { totalMonthlyUsd, totalMonthlyKhr } = React.useMemo(() => {
    let usd = 0;
    let khr = 0;
    staffList.filter((s) => s.is_active).forEach((s) => {
      if (s.base_rate) {
        const rate = Number(s.base_rate);
        if (s.salary_type === "monthly") {
          if (s.currency === "USD") usd += rate;
          else khr += rate;
        } else {
          const std = s.standard_days || 26;
          if (s.currency === "USD") usd += rate * std;
          else khr += rate * std;
        }
      }
    });
    return { totalMonthlyUsd: Math.round(usd * 100) / 100, totalMonthlyKhr: Math.round(khr) };
  }, [staffList]);

  // --- Advances State ---
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState<string>("all");
  const { data: advancesData = [], isLoading: isAdvancesLoading } = useStaffAdvances({
    status: advanceStatusFilter === "all" ? undefined : advanceStatusFilter,
  });
  const voidAdvanceMutation = useVoidAdvance();

  // --- Loans State ---
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>("open");
  const { data: loansData = [], isLoading: isLoansLoading } = useStaffLoans({
    status: loanStatusFilter === "all" ? undefined : loanStatusFilter,
  });
  const voidLoanMutation = useVoidLoan();
  const { openLoansUsd, openLoansKhr } = React.useMemo(() => {
    let usd = 0;
    let khr = 0;
    loansData.forEach((l) => {
      if (l.status !== "open") return;
      if (l.currency === "USD") usd += Number(l.outstanding);
      else khr += Number(l.outstanding);
    });
    return { openLoansUsd: usd, openLoansKhr: khr };
  }, [loansData]);

  // --- Payroll Runs State ---
  const [runStatusFilter, setRunStatusFilter] = useState<string>("all");
  const { data: payrollRunsData = [], isLoading: isRunsLoading } = usePayrollRuns();

  const filteredRuns = React.useMemo(() => {
    if (runStatusFilter === "all") return payrollRunsData;
    return payrollRunsData.filter((r) => r.status === runStatusFilter);
  }, [payrollRunsData, runStatusFilter]);

  // --- Handlers ---
  const handleVoidAdvance = async (id: number) => {
    if (!confirm("តើអ្នកពិតជាចង់មោឃភាពបុរេប្រទាននេះ ហើយសងប្រាក់ចូលកាបូបវិញមែនទេ?")) return;
    try {
      await voidAdvanceMutation.mutateAsync(id);
      showToast("បានមោឃភាពបុរេប្រទានរួចរាល់", "success");
    } catch (err: any) {
      showToast(err.message || "បរាជ័យក្នុងការមោឃភាព", "error");
    }
  };

  const handleVoidLoan = async (id: number) => {
    if (!confirm("តើអ្នកពិតជាចង់មោឃភាពប្រាក់កម្ចីនេះ ហើយសងប្រាក់ចូលកាបូបវិញមែនទេ?")) return;
    try {
      await voidLoanMutation.mutateAsync(id);
      showToast("បានមោឃភាពប្រាក់កម្ចីរួចរាល់", "success");
    } catch (err) {
      showToast((err instanceof Error && err.message) || "បរាជ័យក្នុងការមោឃភាព", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* ─── Top Tabs Bar ─── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        <button
          type="button"
          className={`p-chip ${activeTab === "attendance" ? "p-chip-on" : ""}`}
          onClick={() => setActiveTab("attendance")}
        >
          <BonchiIcon name="check" size={16} />
          វត្តមានប្រចាំថ្ងៃ (Count Day)
        </button>

        {isOwner && (
          <button
            type="button"
            className={`p-chip ${activeTab === "runs" ? "p-chip-on" : ""}`}
            onClick={() => setActiveTab("runs")}
          >
            <BonchiIcon name="payroll" size={16} />
            បើកប្រាក់ខែ (Payroll Runs)
          </button>
        )}

        <button
          type="button"
          className={`p-chip ${activeTab === "advances" ? "p-chip-on" : ""}`}
          onClick={() => setActiveTab("advances")}
        >
          <BonchiIcon name="wallet" size={16} />
          បុរេប្រទាន (Advances)
        </button>

        <button
          type="button"
          className={`p-chip ${activeTab === "loans" ? "p-chip-on" : ""}`}
          onClick={() => setActiveTab("loans")}
        >
          <BonchiIcon name="bank" size={16} />
          ប្រាក់កម្ចី (Loans)
        </button>

        <button
          type="button"
          className={`p-chip ${activeTab === "staff" ? "p-chip-on" : ""}`}
          onClick={() => setActiveTab("staff")}
        >
          <BonchiIcon name="user" size={16} />
          បុគ្គលិក & កិច្ចសន្យា
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 1: វត្តមានប្រចាំថ្ងៃ (DAILY ATTENDANCE SHEET)
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "attendance" && <AttendanceTab />}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2: បើកប្រាក់ខែ (PAYROLL RUNS - OWNER ONLY)
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "runs" && isOwner && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Top Bar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["all", "draft", "paid", "void"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`p-chip ${runStatusFilter === s ? "p-chip-on" : ""}`}
                  onClick={() => setRunStatusFilter(s)}
                >
                  {s === "all" ? "ទាំងអស់" : s.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="bc-btn bc-btn-primary"
              onClick={() => setIsCreateRunOpen(true)}
              style={{ minHeight: "40px" }}
            >
              <BonchiIcon name="plus" size={18} />
              បង្កើតការបើកប្រាក់ខែថ្មី
            </button>
          </div>

          {/* Runs List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {isRunsLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>កំពុងផ្ទុកទិន្នន័យការបើកប្រាក់ខែ...</div>
            ) : filteredRuns.length === 0 ? (
              <div className="w-panel" style={{ padding: "40px", textAlign: "center", color: "#888" }}>
                មិនទាន់មានទិន្នន័យការបើកប្រាក់ខែនៅឡើយទេ
              </div>
            ) : (
              filteredRuns.map((run) => (
                <div
                  key={run.id}
                  className="w-panel"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    gap: "12px",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedRunId(run.id)}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "15px", fontWeight: "700" }}>{run.title}</span>
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
                          ? "PAID"
                          : run.status === "void"
                          ? "VOID"
                          : "DRAFT"}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                      ចន្លោះថ្ងៃ: {run.period_start} ដល់ {run.period_end} · ថ្ងៃកំណត់បើក: {run.payout_date}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#2e7d32" }}>
                        {run.total_net_usd > 0 && formatUsd(run.total_net_usd)}
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#b34a1e" }}>
                        {run.total_net_khr > 0 && formatKhr(run.total_net_khr)}
                      </div>
                      <div style={{ fontSize: "11px", color: "#888" }}>
                        បុគ្គលិក {run.staff_count || 0} នាក់
                      </div>
                    </div>
                    <button
                      type="button"
                      className="bc-btn bc-btn-secondary"
                      style={{ padding: "6px 10px", fontSize: "12px", minHeight: "34px", gap: "4px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRunId(run.id);
                      }}
                      title="មើល & ទាញយក PDF"
                    >
                      <BonchiIcon name="pdf" size={15} />
                      PDF
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 3: បុរេប្រទាន (STAFF ADVANCES)
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "advances" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["all", "open", "deducted", "void"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`p-chip ${advanceStatusFilter === s ? "p-chip-on" : ""}`}
                  onClick={() => setAdvanceStatusFilter(s)}
                >
                  {s === "all"
                    ? "ទាំងអស់"
                    : s === "open"
                    ? "នៅសល់មិនទាន់កាត់"
                    : s === "deducted"
                    ? "បានកាត់រួច"
                    : "មោឃភាព"}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="bc-btn bc-btn-primary"
              onClick={() => setIsAdvanceModalOpen(true)}
              style={{ minHeight: "40px" }}
            >
              <BonchiIcon name="plus" size={18} />
              ផ្តល់បុរេប្រទានថ្មី
            </button>
          </div>

          {/* Advances Table / List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {isAdvancesLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>កំពុងផ្ទុកទិន្នន័យបុរេប្រទាន...</div>
            ) : advancesData.length === 0 ? (
              <div className="w-panel" style={{ padding: "40px", textAlign: "center", color: "#888" }}>
                មិនមានទិន្នន័យបុរេប្រទានឡើយ
              </div>
            ) : (
              advancesData.map((adv) => (
                <div
                  key={adv.id}
                  className="w-panel"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: "700" }}>{adv.staff_name}</span>
                      <span
                        className={`p-badge ${
                          adv.status === "open"
                            ? "p-badge-pending"
                            : adv.status === "deducted"
                            ? "p-badge-paid"
                            : "p-badge-void"
                        }`}
                      >
                        {adv.status === "open"
                          ? "នៅសល់ (OPEN)"
                          : adv.status === "deducted"
                          ? "បានកាត់រួច (DEDUCTED)"
                          : "មោឃភាព (VOID)"}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "3px" }}>
                      ថ្ងៃបើក: {adv.given_at} · កាបូប: {adv.wallet_name || adv.wallet_code || "សាច់ប្រាក់"}
                      {adv.note && ` · ចំណាំ: ${adv.note}`}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#b34a1e" }}>
                      {adv.currency === "USD" ? formatUsd(adv.amount) : formatKhr(adv.amount)}
                    </div>

                    {isOwner && adv.status === "open" && (
                      <button
                        type="button"
                        className="bc-btn bc-btn-secondary"
                        style={{ color: "#c0392b", fontSize: "12px", minHeight: "32px", padding: "4px 8px" }}
                        onClick={() => handleVoidAdvance(adv.id)}
                      >
                        មោឃភាព
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: ប្រាក់កម្ចី (STAFF SALARY LOANS — repaid by installments)
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "loans" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {(["open", "repaid", "void", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`p-chip ${loanStatusFilter === s ? "p-chip-on" : ""}`}
                  onClick={() => setLoanStatusFilter(s)}
                >
                  {s === "all"
                    ? "ទាំងអស់"
                    : s === "open"
                    ? "កំពុងសង"
                    : s === "repaid"
                    ? "សងរួច"
                    : "មោឃភាព"}
                </button>
              ))}
            </div>

            {isOwner && (
              <button
                type="button"
                className="bc-btn bc-btn-primary"
                onClick={() => setIsLoanModalOpen(true)}
                style={{ minHeight: "40px" }}
              >
                <BonchiIcon name="plus" size={18} />
                ផ្តល់ប្រាក់កម្ចីថ្មី
              </button>
            )}
          </div>

          {(openLoansUsd > 0 || openLoansKhr > 0) && (
            <div className="w-panel" style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "#666" }}>បុគ្គលិកនៅជំពាក់សរុប:</span>
              {openLoansUsd > 0 && <b style={{ fontSize: "15px", color: "#b34a1e" }}>{formatUsd(openLoansUsd)}</b>}
              {openLoansKhr > 0 && <b style={{ fontSize: "15px", color: "#b34a1e" }}>{formatKhr(openLoansKhr)}</b>}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {isLoansLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>កំពុងផ្ទុកទិន្នន័យប្រាក់កម្ចី...</div>
            ) : loansData.length === 0 ? (
              <div className="w-panel" style={{ padding: "40px", textAlign: "center", color: "#888" }}>
                មិនមានទិន្នន័យប្រាក់កម្ចីឡើយ
              </div>
            ) : (
              loansData.map((loan) => {
                const fmt = (v: number) => (loan.currency === "USD" ? formatUsd(v) : formatKhr(v));
                const pct = loan.principal > 0 ? Math.min(100, (Number(loan.repaid) / Number(loan.principal)) * 100) : 0;
                return (
                  <div
                    key={loan.id}
                    className="w-panel"
                    style={{ display: "flex", flexDirection: "column", padding: "12px 16px", gap: "10px" }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "700" }}>{loan.staff_name}</span>
                          <span
                            className={`p-badge ${
                              loan.status === "open"
                                ? "p-badge-pending"
                                : loan.status === "repaid"
                                ? "p-badge-paid"
                                : "p-badge-void"
                            }`}
                          >
                            {loan.status === "open"
                              ? "កំពុងសង (OPEN)"
                              : loan.status === "repaid"
                              ? "សងរួច (REPAID)"
                              : "មោឃភាព (VOID)"}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#666", marginTop: "3px" }}>
                          ថ្ងៃខ្ចី: {loan.given_at} · កាបូប: {loan.wallet_name || loan.wallet_code || "សាច់ប្រាក់"} · កាត់ម្តង{" "}
                          {fmt(loan.installment)}
                          {loan.note && ` · ចំណាំ: ${loan.note}`}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "15px", fontWeight: "700", color: "#b34a1e" }}>
                            {loan.status === "void" ? fmt(loan.principal) : `${fmt(loan.outstanding)} នៅសល់`}
                          </div>
                          <div style={{ fontSize: "11px", color: "#888" }}>
                            ខ្ចី {fmt(loan.principal)} · សងរួច {fmt(loan.repaid)} ({loan.repayment_count} ដង)
                          </div>
                        </div>

                        {isOwner && loan.status === "open" && loan.repayment_count === 0 && (
                          <button
                            type="button"
                            className="bc-btn bc-btn-secondary"
                            style={{ color: "#c0392b", fontSize: "12px", minHeight: "32px", padding: "4px 8px" }}
                            onClick={() => handleVoidLoan(loan.id)}
                          >
                            មោឃភាព
                          </button>
                        )}
                      </div>
                    </div>

                    {loan.status !== "void" && (
                      <div
                        style={{ height: "6px", borderRadius: "3px", background: "#eee", overflow: "hidden" }}
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="សងរួច"
                      >
                        <div style={{ width: `${pct}%`, height: "100%", background: "#2e7d32" }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 4: បុគ្គលិក & កិច្ចសន្យា (STAFF DIRECTORY & CONTRACTS)
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "staff" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* ─── 1. Summary KPI Cards ─── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isOwner
                ? "repeat(auto-fit, minmax(210px, 1fr))"
                : "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "12px",
            }}
          >
            {/* KPI 1: Total */}
            <div
              className="w-panel"
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: "var(--ink-muted, #777)", fontWeight: "500" }}>
                  បុគ្គលិកសរុប (Total)
                </div>
                <div style={{ fontSize: "24px", fontWeight: "800", marginTop: "2px", lineHeight: 1.1 }}>
                  {totalStaffCount} <span style={{ fontSize: "14px", fontWeight: "500", color: "#666" }}>នាក់</span>
                </div>
              </div>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#F5F5F7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#555",
                }}
              >
                <BonchiIcon name="user" size={22} />
              </div>
            </div>

            {/* KPI 2: Active */}
            <div
              className="w-panel"
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                borderLeft: "4px solid #2e7d32",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: "#2e7d32", fontWeight: "600" }}>
                  កំពុងបម្រើការងារ (Active)
                </div>
                <div style={{ fontSize: "24px", fontWeight: "800", marginTop: "2px", lineHeight: 1.1, color: "#1b5e20" }}>
                  {activeStaffCount} <span style={{ fontSize: "14px", fontWeight: "500", color: "#666" }}>នាក់</span>
                </div>
              </div>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#E8F5E9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2e7d32",
                }}
              >
                <BonchiIcon name="check" size={22} />
              </div>
            </div>

            {/* KPI 3: Inactive */}
            <div
              className="w-panel"
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                opacity: inactiveStaffCount > 0 ? 1 : 0.7,
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: "var(--ink-muted, #777)", fontWeight: "500" }}>
                  បានផ្អាក / ឈប់ (Inactive)
                </div>
                <div style={{ fontSize: "24px", fontWeight: "800", marginTop: "2px", lineHeight: 1.1, color: inactiveStaffCount > 0 ? "#c0392b" : "#888" }}>
                  {inactiveStaffCount} <span style={{ fontSize: "14px", fontWeight: "500", color: "#666" }}>នាក់</span>
                </div>
              </div>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: inactiveStaffCount > 0 ? "#FFEBEE" : "#F5F5F7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: inactiveStaffCount > 0 ? "#c0392b" : "#999",
                }}
              >
                <BonchiIcon name="x" size={20} />
              </div>
            </div>

            {/* KPI 4: Monthly Payroll Commitment (Owner Only) */}
            {isOwner && (
              <div
                className="w-panel"
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  background: "linear-gradient(135deg, #FFF8E1 0%, #FFFFFF 100%)",
                  borderColor: "#FFE082",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#B45309", fontWeight: "600" }}>
                    ប៉ាន់ស្មានប្រាក់ខែ/ខែ (Active Staff)
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "800", marginTop: "2px", color: "var(--brand-primary, #b34a1e)", lineHeight: 1.1 }}>
                    {formatUsd(totalMonthlyUsd)}
                    {totalMonthlyKhr > 0 && (
                      <span style={{ fontSize: "13px", fontWeight: "600", marginLeft: "6px", color: "#888" }}>
                        + {formatKhr(totalMonthlyKhr)}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "#FEF3C7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#D97706",
                  }}
                >
                  <BonchiIcon name="coins" size={22} />
                </div>
              </div>
            )}
          </div>

          {/* ─── 2. Search & Filter Toolbar ─── */}
          <div
            className="w-panel"
            style={{
              padding: "14px 16px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            {/* Left Controls: Search, Status filter, Position filter */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", flex: 1 }}>
              {/* Search input */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minHeight: "38px",
                  padding: "0 12px",
                  borderRadius: "999px",
                  border: "1.5px solid var(--line-strong, #ddd)",
                  background: "var(--surface-raised, #fff)",
                  minWidth: "220px",
                  flex: "1 1 240px",
                  maxWidth: "340px",
                }}
              >
                <BonchiIcon name="search" size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="ស្វែងរកឈ្មោះ, មុខតំណែង, ទូរស័ព្ទ..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "13px",
                    width: "100%",
                  }}
                />
                {staffSearch && (
                  <button
                    type="button"
                    onClick={() => setStaffSearch("")}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: "2px",
                      color: "#999",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <BonchiIcon name="x" size={14} />
                  </button>
                )}
              </div>

              {/* Status Chips */}
              <div style={{ display: "inline-flex", gap: "4px", background: "#f5f4ef", padding: "3px", borderRadius: "999px" }}>
                {(
                  [
                    { key: "all", label: "ទាំងអស់", count: totalStaffCount },
                    { key: "active", label: "សកម្ម", count: activeStaffCount },
                    { key: "inactive", label: "បានផ្អាក", count: inactiveStaffCount },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStaffStatusFilter(item.key)}
                    style={{
                      border: "none",
                      background: staffStatusFilter === item.key ? "var(--surface-raised, #fff)" : "transparent",
                      color: staffStatusFilter === item.key ? "var(--brand-primary, #b34a1e)" : "#666",
                      fontWeight: staffStatusFilter === item.key ? "700" : "500",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      cursor: "pointer",
                      boxShadow: staffStatusFilter === item.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{item.label}</span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "1px 6px",
                        borderRadius: "999px",
                        background: staffStatusFilter === item.key ? "#FFEFEA" : "#e5e4de",
                        color: staffStatusFilter === item.key ? "var(--brand-primary, #b34a1e)" : "#777",
                      }}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Position Dropdown */}
              {allPositions.length > 0 && (
                <select
                  value={staffPositionFilter}
                  onChange={(e) => setStaffPositionFilter(e.target.value)}
                  style={{
                    height: "38px",
                    padding: "0 10px",
                    borderRadius: "8px",
                    border: "1.5px solid var(--line-strong, #ddd)",
                    background: "var(--surface-raised, #fff)",
                    fontSize: "13px",
                    color: "#444",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">មុខតំណែងទាំងអស់ ({allPositions.length})</option>
                  {allPositions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Right Controls: View Switcher & Add Staff Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* View Switcher: Table vs Cards */}
              <div
                style={{
                  display: "inline-flex",
                  gap: "2px",
                  background: "#f5f4ef",
                  padding: "3px",
                  borderRadius: "8px",
                }}
              >
                <button
                  type="button"
                  title="ទម្រង់តារាង (Table View)"
                  onClick={() => setStaffViewMode("table")}
                  style={{
                    border: "none",
                    background: staffViewMode === "table" ? "var(--surface-raised, #fff)" : "transparent",
                    color: staffViewMode === "table" ? "var(--brand-primary, #b34a1e)" : "#777",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: staffViewMode === "table" ? "700" : "500",
                    boxShadow: staffViewMode === "table" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  <span>តារាង</span>
                </button>

                <button
                  type="button"
                  title="ទម្រង់កាត (Card Grid View)"
                  onClick={() => setStaffViewMode("cards")}
                  style={{
                    border: "none",
                    background: staffViewMode === "cards" ? "var(--surface-raised, #fff)" : "transparent",
                    color: staffViewMode === "cards" ? "var(--brand-primary, #b34a1e)" : "#777",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: staffViewMode === "cards" ? "700" : "500",
                    boxShadow: staffViewMode === "cards" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                  <span>កាត</span>
                </button>
              </div>

              {/* Add Staff Button */}
              {isOwner && (
                <button
                  type="button"
                  className="bc-btn bc-btn-primary"
                  onClick={() => {
                    setStaffToEdit(null);
                    setIsStaffModalOpen(true);
                  }}
                  style={{ minHeight: "38px", padding: "0 14px", fontSize: "13px" }}
                >
                  <BonchiIcon name="plus" size={17} />
                  បន្ថែមបុគ្គលិកថ្មី
                </button>
              )}
            </div>
          </div>

          {/* ─── 3. Content Area: Table View or Cards View ─── */}
          {isStaffLoading ? (
            <div className="w-panel" style={{ padding: "48px", textAlign: "center", color: "#888" }}>
              កំពុងផ្ទុកទិន្នន័យបុគ្គលិក...
            </div>
          ) : filteredStaffList.length === 0 ? (
            <div
              className="w-panel"
              style={{
                padding: "48px 24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#F5F5F7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                }}
              >
                <BonchiIcon name="user" size={28} />
              </div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#333" }}>
                {staffList.length === 0
                  ? "មិនទាន់មានបុគ្គលិកនៅឡើយទេ"
                  : "រកមិនឃើញបុគ្គលិកត្រូវនឹងលក្ខខណ្ឌស្វែងរក"}
              </div>
              <div style={{ fontSize: "13px", color: "#888", maxWidth: "400px" }}>
                {staffList.length === 0
                  ? "ចុចប៊ូតុង «បន្ថែមបុគ្គលិកថ្មី» ដើម្បីបញ្ចូលព័ត៌មានបុគ្គលិក និងកំណត់លក្ខខណ្ឌប្រាក់ខែដំបូង។"
                  : "សូមព្យាយាមលុបពាក្យស្វែងរក ឬប្តូរលក្ខខណ្ឌតម្រងស្ថានភាពឡើងវិញ។"}
              </div>
              {(staffSearch || staffStatusFilter !== "all" || staffPositionFilter !== "all") && (
                <button
                  type="button"
                  className="bc-btn bc-btn-secondary"
                  onClick={() => {
                    setStaffSearch("");
                    setStaffStatusFilter("all");
                    setStaffPositionFilter("all");
                  }}
                  style={{ marginTop: "6px", fontSize: "12px", minHeight: "34px", padding: "4px 12px" }}
                >
                  កំណត់តម្រងឡើងវិញ (Reset Filters)
                </button>
              )}
            </div>
          ) : staffViewMode === "table" ? (
            /* ═══ VIEW A: TABLE VIEW ═══ */
            <div className="w-panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr
                      style={{
                        background: "#faf9f6",
                        borderBottom: "1.5px solid var(--line, #eee)",
                        color: "#666",
                        fontWeight: "600",
                      }}
                    >
                      <th style={{ padding: "12px 16px" }}>បុគ្គលិក (Staff)</th>
                      <th style={{ padding: "12px 14px" }}>មុខតំណែង</th>
                      <th style={{ padding: "12px 14px" }}>ថ្ងៃចូល / អតីតភាព</th>
                      <th style={{ padding: "12px 14px" }}>កិច្ចសន្យាប្រាក់ខែ</th>
                      <th style={{ padding: "12px 14px" }}>អត្រា/ថ្ងៃ (Daily Rate)</th>
                      <th style={{ padding: "12px 14px", textAlign: "center" }}>ស្ថានភាព</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaffList.map((s, idx) => {
                      const color = getStaffColor(s.name);
                      const initial = s.name.trim().charAt(0).toUpperCase();
                      const dailyRate =
                        s.base_rate !== null
                          ? s.salary_type === "monthly"
                            ? Number(s.base_rate) / (s.standard_days || 26)
                            : Number(s.base_rate)
                          : null;

                      return (
                        <tr
                          key={s.id}
                          style={{
                            borderBottom: idx === filteredStaffList.length - 1 ? "none" : "1px solid var(--line, #eee)",
                            background: s.is_active ? "transparent" : "#fafafa",
                            opacity: s.is_active ? 1 : 0.72,
                            transition: "background 0.15s ease",
                          }}
                        >
                          {/* 1. Name & Avatar & Phone */}
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "50%",
                                  background: color.bg,
                                  color: color.text,
                                  fontWeight: "700",
                                  fontSize: "14px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {initial}
                              </div>
                              <div>
                                <div style={{ fontWeight: "700", fontSize: "14px", color: "#111" }}>
                                  {s.name}
                                </div>
                                {s.phone ? (
                                  <a
                                    href={`tel:${s.phone}`}
                                    style={{
                                      fontSize: "12px",
                                      color: "#0277bd",
                                      textDecoration: "none",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    <BonchiIcon name="phone" size={12} />
                                    <span>{s.phone}</span>
                                  </a>
                                ) : (
                                  <span style={{ fontSize: "11px", color: "#aaa" }}>គ្មានលេខទូរស័ព្ទ</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Position */}
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: "999px",
                                background: "#f0f2f5",
                                color: "#334155",
                                fontSize: "12px",
                                fontWeight: "600",
                              }}
                            >
                              {s.position || "—"}
                            </span>
                          </td>

                          {/* 3. Joined Date & Tenure */}
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontSize: "13px", fontWeight: "500", color: "#333" }}>
                              {s.joined_date || "—"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#888", marginTop: "1px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <BonchiIcon name="clock" size={12} />
                              <span>{getTenureText(s.joined_date)}</span>
                            </div>
                          </td>

                          {/* 4. Base Salary & Type */}
                          <td style={{ padding: "12px 14px" }}>
                            {isOwner && s.base_rate !== null ? (
                              <div>
                                <div style={{ fontWeight: "700", color: "var(--brand-primary, #b34a1e)", fontSize: "14px" }}>
                                  {s.currency === "USD" ? formatUsd(s.base_rate) : formatKhr(s.base_rate)}
                                </div>
                                <div style={{ fontSize: "11px", color: "#666" }}>
                                  {s.salary_type === "monthly"
                                    ? `ប្រចាំខែ (${s.standard_days || 26} ថ្ងៃ)`
                                    : "គិតតាមថ្ងៃធ្វើការ"}
                                </div>
                              </div>
                            ) : !isOwner ? (
                              <span style={{ fontSize: "12px", color: "#888", fontStyle: "italic" }}>
                                •••••• (Owner only)
                              </span>
                            ) : (
                              <span style={{ fontSize: "12px", color: "#c0392b", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                <BonchiIcon name="alert" size={12} />
                                <span>មិនទាន់កំណត់</span>
                              </span>
                            )}
                          </td>

                          {/* 5. Daily Rate */}
                          <td style={{ padding: "12px 14px" }}>
                            {isOwner && dailyRate !== null ? (
                              <div style={{ fontWeight: "600", color: "#444" }}>
                                {s.currency === "USD" ? formatUsd(dailyRate) : formatKhr(dailyRate)}
                                <span style={{ fontSize: "11px", color: "#888", marginLeft: "3px" }}>/ ថ្ងៃ</span>
                              </div>
                            ) : !isOwner ? (
                              <span style={{ fontSize: "12px", color: "#888" }}>••••••</span>
                            ) : (
                              <span style={{ color: "#aaa" }}>—</span>
                            )}
                          </td>

                          {/* 6. Status */}
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "3px 10px",
                                borderRadius: "999px",
                                fontSize: "12px",
                                fontWeight: "600",
                                background: s.is_active ? "#E8F5E9" : "#FFEBEE",
                                color: s.is_active ? "#1B5E20" : "#B71C1C",
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: s.is_active ? "#2E7D32" : "#D32F2F",
                                }}
                              />
                              {s.is_active ? "សកម្ម" : "បានផ្អាក"}
                            </span>
                          </td>

                          {/* 7. Action Shortcuts */}
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              {/* Advance shortcut */}
                              <button
                                type="button"
                                className="bc-btn bc-btn-secondary"
                                title="ផ្តល់បុរេប្រទានបុគ្គលិកនេះ"
                                onClick={() => handleOpenAdvanceForStaff(s.id)}
                                style={{
                                  minHeight: "30px",
                                  padding: "2px 8px",
                                  fontSize: "12px",
                                  color: "#2e7d32",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <BonchiIcon name="count" size={13} />
                                <span>បុរេប្រទាន</span>
                              </button>

                              {/* Loan shortcut */}
                              {isOwner && s.is_active && (
                                <button
                                  type="button"
                                  className="bc-btn bc-btn-secondary"
                                  title="ផ្តល់ប្រាក់កម្ចីបុគ្គលិកនេះ"
                                  onClick={() => handleOpenLoanForStaff(s.id)}
                                  style={{
                                    minHeight: "30px",
                                    padding: "2px 8px",
                                    fontSize: "12px",
                                    color: "#b34a1e",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <BonchiIcon name="bank" size={13} />
                                  <span>កម្ចី</span>
                                </button>
                              )}

                              {/* Edit Modal shortcut */}
                              {isOwner && (
                                <button
                                  type="button"
                                  className="bc-btn bc-btn-secondary"
                                  title="កែប្រែព័ត៌មាន & កិច្ចសន្យា"
                                  onClick={() => {
                                    setStaffToEdit(s);
                                    setIsStaffModalOpen(true);
                                  }}
                                  style={{
                                    minHeight: "30px",
                                    padding: "2px 8px",
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <BonchiIcon name="edit" size={13} />
                                  <span>កែប្រែ</span>
                                </button>
                              )}

                              {/* Toggle active shortcut */}
                              {isOwner && (
                                <button
                                  type="button"
                                  className="bc-btn bc-btn-secondary"
                                  title={s.is_active ? "ផ្អាកដំណើរការបុគ្គលិក" : "ដាក់ឱ្យដំណើរការឡើងវិញ"}
                                  onClick={() => handleToggleStaffActive(s)}
                                  style={{
                                    minHeight: "30px",
                                    padding: "2px 7px",
                                    fontSize: "11px",
                                    color: s.is_active ? "#c0392b" : "#1B5E20",
                                  }}
                                >
                                  {s.is_active ? "ផ្អាក" : "បើកវិញ"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ═══ VIEW B: CARD GRID VIEW ═══ */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
                gap: "14px",
              }}
            >
              {filteredStaffList.map((s) => {
                const color = getStaffColor(s.name);
                const initial = s.name.trim().charAt(0).toUpperCase();
                const dailyRate =
                  s.base_rate !== null
                    ? s.salary_type === "monthly"
                      ? Number(s.base_rate) / (s.standard_days || 26)
                      : Number(s.base_rate)
                    : null;

                return (
                  <div
                    key={s.id}
                    className="w-panel"
                    style={{
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      opacity: s.is_active ? 1 : 0.72,
                      borderTop: s.is_active ? "3px solid #2e7d32" : "3px solid #ccc",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    {/* Header: Avatar, Name, Phone & Status Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            background: color.bg,
                            color: color.text,
                            fontWeight: "700",
                            fontSize: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div style={{ fontSize: "15px", fontWeight: "700", color: "#111" }}>
                            {s.name}
                          </div>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              background: "#f0f2f5",
                              color: "#475569",
                              fontSize: "11px",
                              fontWeight: "600",
                              marginTop: "2px",
                            }}
                          >
                            {s.position || "គ្មានមុខតំណែង"}
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: "700",
                          background: s.is_active ? "#E8F5E9" : "#FFEBEE",
                          color: s.is_active ? "#1B5E20" : "#B71C1C",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: s.is_active ? "#2E7D32" : "#D32F2F",
                          }}
                        />
                        {s.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>

                    {/* Contact & Tenure Bar */}
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: "#faf9f6",
                        fontSize: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#777" }}>ទូរស័ព្ទ:</span>
                        {s.phone ? (
                          <a
                            href={`tel:${s.phone}`}
                            style={{
                              color: "#0277bd",
                              textDecoration: "none",
                              fontWeight: "500",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <BonchiIcon name="phone" size={12} />
                            <span>{s.phone}</span>
                          </a>
                        ) : (
                          <span style={{ color: "#aaa" }}>—</span>
                        )}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#777" }}>ចូលធ្វើការ:</span>
                        <span style={{ color: "#333", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <span>{s.joined_date || "—"}</span>
                          <span style={{ color: "#888", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            (<BonchiIcon name="clock" size={11} /> {getTenureText(s.joined_date)})
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Salary Contract Box */}
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        background: isOwner ? "#FFFBF7" : "#F5F5F7",
                        border: isOwner ? "1px solid #FFE8DC" : "1px solid #E5E5E5",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "11px", color: "#888", fontWeight: "500" }}>
                          កិច្ចសន្យាប្រាក់ខែ
                        </div>
                        {isOwner && s.base_rate !== null ? (
                          <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--brand-primary, #b34a1e)", marginTop: "1px" }}>
                            {s.currency === "USD" ? formatUsd(s.base_rate) : formatKhr(s.base_rate)}
                            <span style={{ fontSize: "11px", fontWeight: "500", color: "#666", marginLeft: "4px" }}>
                              {s.salary_type === "monthly" ? `/${s.standard_days || 26} ថ្ងៃ` : "/ថ្ងៃ"}
                            </span>
                          </div>
                        ) : !isOwner ? (
                          <div style={{ fontSize: "12px", color: "#888", fontStyle: "italic", marginTop: "2px" }}>
                            (Owner only)
                          </div>
                        ) : (
                          <div style={{ fontSize: "12px", color: "#c0392b", fontWeight: "600", marginTop: "2px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <BonchiIcon name="alert" size={12} />
                            <span>មិនទាន់កំណត់</span>
                          </div>
                        )}
                      </div>

                      {isOwner && dailyRate !== null && (
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "11px", color: "#888" }}>អត្រា/ថ្ងៃ</div>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#444" }}>
                            {s.currency === "USD" ? formatUsd(dailyRate) : formatKhr(dailyRate)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "auto",
                        paddingTop: "6px",
                      }}
                    >
                      {/* Advance Button */}
                      <button
                        type="button"
                        className="bc-btn bc-btn-secondary"
                        onClick={() => handleOpenAdvanceForStaff(s.id)}
                        style={{
                          flex: 1,
                          minHeight: "34px",
                          fontSize: "12px",
                          color: "#2e7d32",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        <BonchiIcon name="count" size={14} />
                        <span>បុរេប្រទាន</span>
                      </button>

                      {/* Loan Button */}
                      {isOwner && s.is_active && (
                        <button
                          type="button"
                          className="bc-btn bc-btn-secondary"
                          onClick={() => handleOpenLoanForStaff(s.id)}
                          style={{
                            flex: 1,
                            minHeight: "34px",
                            fontSize: "12px",
                            color: "#b34a1e",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          <BonchiIcon name="bank" size={14} />
                          <span>កម្ចី</span>
                        </button>
                      )}

                      {/* Edit Button */}
                      {isOwner && (
                        <button
                          type="button"
                          className="bc-btn bc-btn-secondary"
                          onClick={() => {
                            setStaffToEdit(s);
                            setIsStaffModalOpen(true);
                          }}
                          style={{
                            flex: 1,
                            minHeight: "34px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          <BonchiIcon name="edit" size={13} />
                          <span>កែប្រែ</span>
                        </button>
                      )}

                      {/* Active Status Toggle */}
                      {isOwner && (
                        <button
                          type="button"
                          className="bc-btn bc-btn-secondary"
                          onClick={() => handleToggleStaffActive(s)}
                          title={s.is_active ? "ផ្អាកដំណើរការ" : "ដាក់ឱ្យដំណើរការឡើងវិញ"}
                          style={{
                            minHeight: "34px",
                            padding: "0 10px",
                            fontSize: "11px",
                            color: s.is_active ? "#c0392b" : "#1B5E20",
                          }}
                        >
                          {s.is_active ? "ផ្អាក" : "បើកវិញ"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Modals ─── */}
      <StaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffToEdit={staffToEdit}
        onSuccess={() => showToast(staffToEdit ? "បានកែប្រែព័ត៌មានបុគ្គលិករួចរាល់" : "បានបង្កើតបុគ្គលិកថ្មី")}
      />

      <AdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => {
          setIsAdvanceModalOpen(false);
          setPreselectedAdvanceStaffId(null);
        }}
        staffList={activeStaffList}
        wallets={wallets}
        defaultStaffId={preselectedAdvanceStaffId}
        onSuccess={() => showToast("បានផ្តល់បុរេប្រទាន និងកត់ត្រាចំណាយរួចរាល់")}
      />

      <LoanModal
        isOpen={isLoanModalOpen}
        onClose={() => {
          setIsLoanModalOpen(false);
          setPreselectedLoanStaffId(null);
        }}
        staffList={activeStaffList}
        wallets={wallets}
        defaultStaffId={preselectedLoanStaffId}
        onSuccess={() => showToast("បានផ្តល់ប្រាក់កម្ចី និងកត់ត្រាចំណាយរួចរាល់")}
      />

      <CreatePayrollRunModal
        isOpen={isCreateRunOpen}
        onClose={() => setIsCreateRunOpen(false)}
        onSuccess={() => showToast("បានបង្កើតការបើកប្រាក់ខែ (ព្រាង) រួចរាល់")}
      />

      <PayrollRunDetailModal
        isOpen={!!selectedRunId}
        onClose={() => setSelectedRunId(null)}
        runId={selectedRunId}
        wallets={wallets}
        isOwner={isOwner}
        onSuccess={() => showToast("ប្រតិបត្តិការបានជោគជ័យ")}
      />
    </div>
  );
}
