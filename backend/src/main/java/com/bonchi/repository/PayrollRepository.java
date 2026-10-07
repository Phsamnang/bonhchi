package com.bonchi.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class PayrollRepository {

    private final JdbcTemplate jdbcTemplate;

    public List<Map<String, Object>> getAttendanceForDate(LocalDate date) {
        String sql = "SELECT " +
                "s.id as staff_id, " +
                "s.name as staff_name, " +
                "s.position, " +
                "to_char(s.joined_date, 'YYYY-MM-DD') as joined_date, " +
                "COALESCE(a.id, 0) as attendance_id, " +
                "a.status, " +
                "CAST(a.paid_units AS FLOAT) as paid_units, " +
                "a.note, " +
                "(a.id IS NOT NULL) as is_recorded, " +
                "a.updated_at " +
                "FROM staff s " +
                "LEFT JOIN staff_attendance a ON a.staff_id = s.id AND a.date = ? " +
                "WHERE s.is_active = true " +
                "  AND s.joined_date <= ? " +
                "  AND (s.left_date IS NULL OR s.left_date >= ?) " +
                "ORDER BY s.id ASC";

        return jdbcTemplate.queryForList(sql, date, date, date);
    }

    public List<Map<String, Object>> getActiveStaffForGrid() {
        String sql = "SELECT id as staff_id, name as staff_name, position, " +
                "to_char(joined_date, 'YYYY-MM-DD') as joined_date, " +
                "to_char(left_date, 'YYYY-MM-DD') as left_date " +
                "FROM staff WHERE is_active = true ORDER BY name ASC";
        return jdbcTemplate.queryForList(sql);
    }

    public List<Map<String, Object>> getAttendanceRecordsInRange(LocalDate start, LocalDate end) {
        String sql = "SELECT a.staff_id, to_char(a.date, 'YYYY-MM-DD') AS date, a.status, " +
                "CAST(a.paid_units AS FLOAT) AS paid_units, a.note " +
                "FROM staff_attendance a " +
                "WHERE a.date >= ? AND a.date <= ? " +
                "ORDER BY a.date, a.staff_id";
        return jdbcTemplate.queryForList(sql, start, end);
    }

    public List<Map<String, Object>> getAttendanceSummary(LocalDate start, LocalDate end) {
        String sql = "SELECT " +
                "s.id as staff_id, " +
                "s.name as staff_name, " +
                "s.position, " +
                "CAST(COALESCE(SUM(a.paid_units), 0) AS FLOAT) as total_paid_days, " +
                "COUNT(a.id) as recorded_days, " +
                "COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days, " +
                "COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_days, " +
                "COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days, " +
                "COUNT(CASE WHEN a.status = 'leave_paid' THEN 1 END) as leave_paid_days, " +
                "COUNT(CASE WHEN a.status = 'leave_unpaid' THEN 1 END) as leave_unpaid_days, " +
                "COUNT(CASE WHEN a.status = 'holiday_work' THEN 1 END) as holiday_work_days " +
                "FROM staff s " +
                "LEFT JOIN staff_attendance a ON a.staff_id = s.id AND a.date >= ? AND a.date <= ? " +
                "WHERE s.is_active = true " +
                "GROUP BY s.id, s.name, s.position " +
                "ORDER BY s.name ASC";

        return jdbcTemplate.queryForList(sql, start, end);
    }

    public void upsertAttendanceRecord(Long staffId, LocalDate date, String status, BigDecimal paidUnits, String note, Long recordedBy) {
        String sql = "INSERT INTO staff_attendance (staff_id, date, status, paid_units, note, recorded_by, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, NOW()) " +
                "ON CONFLICT (staff_id, date) DO UPDATE SET " +
                "status = EXCLUDED.status, " +
                "paid_units = EXCLUDED.paid_units, " +
                "note = EXCLUDED.note, " +
                "recorded_by = EXCLUDED.recorded_by, " +
                "updated_at = NOW()";

        jdbcTemplate.update(sql, staffId, date, status, paidUnits, note, recordedBy);
    }

    public List<Map<String, Object>> findAdvances(Long staffId, String status, LocalDate from, LocalDate to) {
        StringBuilder sql = new StringBuilder(
                "SELECT sa.id, sa.staff_id, s.name as staff_name, " +
                "CAST(sa.amount AS FLOAT) as amount, sa.currency, " +
                "to_char(sa.given_at, 'YYYY-MM-DD') as given_at, " +
                "sa.wallet_id, w.name_km as wallet_name, w.code as wallet_code, " +
                "sa.invoice_id, sa.status, sa.deducted_in_item_id, sa.note, " +
                "sa.created_at " +
                "FROM staff_advances sa " +
                "JOIN staff s ON s.id = sa.staff_id " +
                "LEFT JOIN wallets w ON w.id = sa.wallet_id " +
                "WHERE 1=1 "
        );

        List<Object> params = new ArrayList<>();
        if (staffId != null) {
            sql.append(" AND sa.staff_id = ?");
            params.add(staffId);
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND sa.status::text = ?");
            params.add(status.trim());
        }
        if (from != null) {
            sql.append(" AND sa.given_at >= ?");
            params.add(from);
        }
        if (to != null) {
            sql.append(" AND sa.given_at <= ?");
            params.add(to);
        }
        sql.append(" ORDER BY sa.given_at DESC, sa.id DESC");

        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    public Map<String, Object> getStaffAttendanceStats(Long staffId, LocalDate start, LocalDate end) {
        String sql = "SELECT CAST(COALESCE(SUM(paid_units), 0) AS FLOAT) as paid_days, " +
                "COUNT(id) as recorded_days " +
                "FROM staff_attendance WHERE staff_id = ? AND date >= ? AND date <= ?";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, staffId, start, end);
        return rows.isEmpty() ? Map.of("paid_days", 0.0, "recorded_days", 0) : rows.get(0);
    }

    public List<Map<String, Object>> findOpenAdvancesForStaff(Long staffId, LocalDate end) {
        String sql = "SELECT id, CAST(amount AS FLOAT) as amount, currency, to_char(given_at, 'YYYY-MM-DD') as given_at, note " +
                "FROM staff_advances WHERE staff_id = ? AND status::text = 'open' AND given_at <= ? ORDER BY given_at ASC";
        return jdbcTemplate.queryForList(sql, staffId, end);
    }

    public BigDecimal findLastCarryOut(Long staffId) {
        String sql = "SELECT CAST(pi.carry_out AS FLOAT) as carry_out " +
                "FROM payroll_items pi JOIN payroll_runs pr ON pr.id = pi.payroll_run_id " +
                "WHERE pi.staff_id = ? AND pr.status::text = 'paid' " +
                "ORDER BY pr.period_end DESC, pr.id DESC LIMIT 1";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, staffId);
        if (rows.isEmpty() || rows.get(0).get("carry_out") == null) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(((Number) rows.get(0).get("carry_out")).doubleValue());
    }

    public List<Map<String, Object>> findRunsSummary() {
        String sql = "SELECT " +
                "pr.id, pr.title, " +
                "to_char(pr.period_start, 'YYYY-MM-DD') as period_start, " +
                "to_char(pr.period_end, 'YYYY-MM-DD') as period_end, " +
                "to_char(pr.payout_date, 'YYYY-MM-DD') as payout_date, " +
                "CAST(pr.exchange_rate AS FLOAT) as exchange_rate, " +
                "CAST(pr.total_net_usd AS FLOAT) as total_net_usd, " +
                "CAST(pr.total_net_khr AS FLOAT) as total_net_khr, " +
                "pr.status, pr.notes, pr.created_at, pr.paid_at, pr.void_reason, " +
                "CAST(COUNT(pi.id) AS INT) as staff_count " +
                "FROM payroll_runs pr " +
                "LEFT JOIN payroll_items pi ON pi.payroll_run_id = pr.id " +
                "GROUP BY pr.id " +
                "ORDER BY pr.period_start DESC, pr.id DESC";

        return jdbcTemplate.queryForList(sql);
    }

    public Map<String, Object> findRunDetailsById(Long runId) {
        String sql = "SELECT " +
                "pr.id, pr.title, " +
                "to_char(pr.period_start, 'YYYY-MM-DD') as period_start, " +
                "to_char(pr.period_end, 'YYYY-MM-DD') as period_end, " +
                "to_char(pr.payout_date, 'YYYY-MM-DD') as payout_date, " +
                "CAST(pr.exchange_rate AS FLOAT) as exchange_rate, " +
                "CAST(pr.total_net_usd AS FLOAT) as total_net_usd, " +
                "CAST(pr.total_net_khr AS FLOAT) as total_net_khr, " +
                "pr.status, pr.notes, pr.created_at, pr.paid_at, pr.void_reason, " +
                "u1.name as created_by_name, u2.name as paid_by_name " +
                "FROM payroll_runs pr " +
                "LEFT JOIN users u1 ON u1.id = pr.created_by " +
                "LEFT JOIN users u2 ON u2.id = pr.paid_by " +
                "WHERE pr.id = ?";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, runId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<Map<String, Object>> findItemDetailsByRunId(Long runId) {
        String sql = "SELECT " +
                "pi.id, pi.payroll_run_id, pi.staff_id, " +
                "s.name as staff_name, s.position, " +
                "pi.contract_id, sc.salary_type, " +
                "CAST(sc.base_rate AS FLOAT) as contract_base_rate, " +
                "sc.standard_days, pi.currency, " +
                "CAST(pi.daily_rate AS FLOAT) as daily_rate, " +
                "CAST(pi.days_counted AS FLOAT) as days_counted, " +
                "CAST(pi.days_override AS FLOAT) as days_override, " +
                "pi.override_reason, pi.unrecorded_days, " +
                "CAST(pi.gross AS FLOAT) as gross, " +
                "CAST(pi.allowance AS FLOAT) as allowance, " +
                "CAST(pi.bonus AS FLOAT) as bonus, " +
                "CAST(pi.penalty AS FLOAT) as penalty, " +
                "CAST(pi.advances AS FLOAT) as advances, " +
                "CAST(pi.carry_in AS FLOAT) as carry_in, " +
                "CAST(pi.carry_out AS FLOAT) as carry_out, " +
                "CAST(pi.net AS FLOAT) as net, " +
                "pi.invoice_id, pi.note " +
                "FROM payroll_items pi " +
                "JOIN staff s ON s.id = pi.staff_id " +
                "JOIN staff_contracts sc ON sc.id = pi.contract_id " +
                "WHERE pi.payroll_run_id = ? " +
                "ORDER BY s.name ASC";

        return jdbcTemplate.queryForList(sql, runId);
    }

    public void markAdvancesDeducted(Long itemId, Long staffId, LocalDate periodEnd) {
        String sql = "UPDATE staff_advances SET status = 'deducted', deducted_in_item_id = ? " +
                "WHERE staff_id = ? AND status::text = 'open' AND given_at <= ?";
        jdbcTemplate.update(sql, itemId, staffId, periodEnd);
    }

    public void resetDeductedAdvances(Long itemId) {
        String sql = "UPDATE staff_advances SET status = 'open', deducted_in_item_id = NULL WHERE deducted_in_item_id = ?";
        jdbcTemplate.update(sql, itemId);
    }
}
