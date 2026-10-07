import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Staff {
  id: number;
  name: string;
  phone: string | null;
  position: string;
  user_id: number | null;
  joined_date: string;
  left_date: string | null;
  is_active: boolean;
  contract_id: number | null;
  salary_type: "monthly" | "daily" | null;
  base_rate: number | null;
  currency: "USD" | "KHR" | null;
  standard_days: number | null;
  effective_from: string | null;
}

export type AttendanceStatus = "present" | "half_day" | "absent" | "leave_paid" | "leave_unpaid" | "holiday_work";

export interface AttendanceRecord {
  staff_id: number;
  staff_name: string;
  position: string;
  joined_date?: string;
  attendance_id: number;
  /** null = not counted yet for this day */
  status: AttendanceStatus | null;
  paid_units: number | null;
  note: string | null;
  is_recorded: boolean;
  updated_at: string | null;
}

export interface AttendanceSummary {
  staff_id: number;
  staff_name: string;
  position: string;
  total_paid_days: number;
  recorded_days: number;
  present_days: number;
  half_days: number;
  absent_days: number;
  leave_paid_days: number;
  leave_unpaid_days: number;
  holiday_work_days: number;
}

export interface StaffAdvance {
  id: number;
  staff_id: number;
  staff_name: string;
  amount: number;
  currency: "USD" | "KHR";
  given_at: string;
  wallet_id: number | null;
  wallet_name: string | null;
  wallet_code: string | null;
  invoice_id: number | null;
  status: "open" | "deducted" | "void";
  deducted_in_item_id: number | null;
  note: string | null;
  created_at: string;
}

export interface StaffLoan {
  id: number;
  staff_id: number;
  staff_name: string;
  principal: number;
  currency: "USD" | "KHR";
  /** Deducted from each payroll run until repaid */
  installment: number;
  repaid: number;
  outstanding: number;
  repayment_count: number;
  given_at: string;
  wallet_id: number | null;
  wallet_name: string | null;
  wallet_code: string | null;
  invoice_id: number | null;
  status: "open" | "repaid" | "void";
  note: string | null;
  created_at: string;
}

export interface PayrollRunItem {
  id?: number;
  payroll_run_id?: number;
  staff_id: number;
  staff_name: string;
  position: string;
  contract_id: number;
  salary_type: "monthly" | "daily";
  contract_base_rate: number;
  currency: "USD" | "KHR";
  standard_days: number;
  daily_rate: number;
  days_counted: number;
  days_override: number | null;
  override_reason: string | null;
  unrecorded_days: number;
  gross: number;
  allowance: number;
  bonus: number;
  penalty: number;
  advances: number;
  /** Loan installment taken from this line */
  loan_deduction: number;
  /** Preview only: what the open loans ask for this run (sum of installments, capped by what is owed) */
  loan_installment?: number;
  /** Preview only: total still owed on the open loans */
  loan_outstanding?: number;
  carry_in: number;
  carry_out: number;
  net: number;
  invoice_id?: number | null;
  note: string | null;
}

export interface PayrollRun {
  id: number;
  title: string;
  period_start: string;
  period_end: string;
  payout_date: string;
  exchange_rate: number;
  total_net_usd: number;
  total_net_khr: number;
  status: "draft" | "paid" | "void";
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  void_reason: string | null;
  created_by_name?: string | null;
  paid_by_name?: string | null;
  staff_count?: number;
  items?: PayrollRunItem[];
}

export interface PayrollPreviewResult {
  period_start: string;
  period_end: string;
  payout_date: string;
  exchange_rate: number;
  total_days_in_period: number;
  total_net_usd: number;
  total_net_khr: number;
  items: PayrollRunItem[];
}

// ─── Staff Queries & Mutations ─────────────────────────────────

export function useStaff(includeInactive = false) {
  return useQuery({
    queryKey: ["staff", { includeInactive }],
    queryFn: async () => {
      const res = await api.get(`/payroll/staff?include_inactive=${includeInactive}`);
      return (res.data.staff || []) as Staff[];
    },
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      phone?: string | null;
      position: string;
      joined_date: string;
      salary_type: "monthly" | "daily";
      base_rate: number;
      currency: "USD" | "KHR";
      standard_days: number;
    }) => {
      const res = await api.post("/payroll/staff", payload);
      return res.data.staff;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: number;
      name?: string;
      phone?: string | null;
      position?: string;
      joined_date?: string;
      is_active?: boolean;
      left_date?: string | null;
      salary_type?: "monthly" | "daily";
      base_rate?: number;
      currency?: "USD" | "KHR";
      standard_days?: number;
    }) => {
      const res = await api.put(`/payroll/staff/${id}`, payload);
      return res.data.staff;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

// ─── Attendance Queries & Mutations ────────────────────────────

export function useDailyAttendance(date: string) {
  return useQuery({
    queryKey: ["attendance", date],
    queryFn: async () => {
      const res = await api.get(`/payroll/attendance?date=${date}`);
      return (res.data.attendance || []) as AttendanceRecord[];
    },
    enabled: !!date,
  });
}

export function useAttendanceSummary(start: string, end: string) {
  return useQuery({
    queryKey: ["attendanceSummary", start, end],
    queryFn: async () => {
      const res = await api.get(`/payroll/attendance/summary?start=${start}&end=${end}`);
      return (res.data.summary || []) as AttendanceSummary[];
    },
    enabled: !!start && !!end,
  });
}

/** Month grid: active staff + every recorded day in [start, end] (max 62 days) */
export interface AttendanceRange {
  staff: { staff_id: number; staff_name: string; position: string; joined_date: string; left_date: string | null }[];
  records: { staff_id: number; date: string; status: AttendanceStatus; paid_units: number; note: string | null }[];
}

export function useAttendanceRange(start: string, end: string) {
  return useQuery({
    queryKey: ["attendanceRange", start, end],
    queryFn: async () => {
      const res = await api.get(`/payroll/attendance/range?start=${start}&end=${end}`);
      return res.data as AttendanceRange;
    },
    enabled: !!start && !!end,
  });
}

export function useSaveAttendanceBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      date: string;
      records: {
        staff_id: number;
        status: AttendanceStatus;
        note?: string | null;
      }[];
    }) => {
      const res = await api.post("/payroll/attendance/batch", payload);
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["attendance", vars.date] });
      qc.invalidateQueries({ queryKey: ["attendanceSummary"] });
      qc.invalidateQueries({ queryKey: ["attendanceRange"] });
    },
  });
}

// ─── Advance Queries & Mutations ───────────────────────────────

export function useStaffAdvances(filter?: { staff_id?: number; status?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ["staffAdvances", filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter?.staff_id) params.set("staff_id", String(filter.staff_id));
      if (filter?.status) params.set("status", filter.status);
      if (filter?.from) params.set("from", filter.from);
      if (filter?.to) params.set("to", filter.to);
      const res = await api.get(`/payroll/advances?${params.toString()}`);
      return (res.data.advances || []) as StaffAdvance[];
    },
  });
}

export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      staff_id: number;
      amount: number;
      currency: "USD" | "KHR";
      given_at: string;
      wallet_id: number;
      note?: string | null;
    }) => {
      const res = await api.post("/payroll/advances", payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staffAdvances"] });
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["monthly-report"] });
      qc.invalidateQueries({ queryKey: ["daily-cashflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useVoidAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/payroll/advances/${id}/void`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staffAdvances"] });
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["monthly-report"] });
      qc.invalidateQueries({ queryKey: ["daily-cashflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ─── Loan Queries & Mutations ──────────────────────────────────

export function useStaffLoans(filter?: { staff_id?: number; status?: string }) {
  return useQuery({
    queryKey: ["staffLoans", filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter?.staff_id) params.set("staff_id", String(filter.staff_id));
      if (filter?.status) params.set("status", filter.status);
      const res = await api.get(`/payroll/loans?${params.toString()}`);
      return (res.data.loans || []) as StaffLoan[];
    },
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      staff_id: number;
      amount: number;
      currency: "USD" | "KHR";
      installment: number;
      given_at: string;
      wallet_id: number;
      note?: string | null;
    }) => {
      const res = await api.post("/payroll/loans", payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staffLoans"] });
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["monthly-report"] });
      qc.invalidateQueries({ queryKey: ["daily-cashflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useVoidLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/payroll/loans/${id}/void`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staffLoans"] });
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["monthly-report"] });
      qc.invalidateQueries({ queryKey: ["daily-cashflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ─── Payroll Runs Queries & Mutations ──────────────────────────

export function usePayrollRuns() {
  return useQuery({
    queryKey: ["payrollRuns"],
    queryFn: async () => {
      const res = await api.get("/payroll/runs");
      return (res.data.runs || []) as PayrollRun[];
    },
  });
}

export function usePayrollRun(id: number) {
  return useQuery({
    queryKey: ["payrollRun", id],
    queryFn: async () => {
      const res = await api.get(`/payroll/runs/${id}`);
      return res.data.run as PayrollRun;
    },
    enabled: !!id,
  });
}

export function usePreviewPayroll() {
  return useMutation({
    mutationFn: async (payload: {
      period_start: string;
      period_end: string;
      payout_date: string;
      exchange_rate: number;
    }) => {
      const res = await api.post("/payroll/runs/preview", payload);
      return res.data.preview as PayrollPreviewResult;
    },
  });
}

export function useCreatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      period_start: string;
      period_end: string;
      payout_date: string;
      exchange_rate: number;
      notes?: string | null;
      items: PayrollRunItem[];
    }) => {
      const res = await api.post("/payroll/runs", payload);
      return res.data.run;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payrollRuns"] });
    },
  });
}

export function usePayPayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payments,
    }: {
      id: number;
      payments: { currency: "USD" | "KHR"; wallet_id: number; amount: number }[];
    }) => {
      const res = await api.post(`/payroll/runs/${id}/pay`, { payments });
      return res.data.run;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["payrollRuns"] });
      qc.invalidateQueries({ queryKey: ["payrollRun", vars.id] });
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["staffAdvances"] });
      qc.invalidateQueries({ queryKey: ["staffLoans"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["monthly-report"] });
      qc.invalidateQueries({ queryKey: ["daily-cashflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useVoidPayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, void_reason }: { id: number; void_reason: string }) => {
      const res = await api.post(`/payroll/runs/${id}/void`, { void_reason });
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["payrollRuns"] });
      qc.invalidateQueries({ queryKey: ["payrollRun", vars.id] });
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["staffAdvances"] });
      qc.invalidateQueries({ queryKey: ["staffLoans"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["monthly-report"] });
      qc.invalidateQueries({ queryKey: ["daily-cashflow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
