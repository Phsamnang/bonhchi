package com.bonchi.repository;

import com.bonchi.config.ReportProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.*;

@Slf4j
@Repository
public class ReportRepository {

    private final JdbcTemplate jdbcTemplate;

    public static final int KHR_PER_USD = 4000;

    /** Label returned for invoices that have no category. */
    public static final String UNCATEGORIZED = "Other";

    /**
     * SQL expression giving the report bucket of an invoice (alias {@code i}):
     * income, purchase, payroll (salary payouts and advances), utility, or other.
     * The monthly report replaces payroll with the salary for the month (see {@link #getPayrollRuns}).
     */
    private final String bucketSql;

    /** Utility category names come from {@code bonchi.reports.utility-categories} (application.yml). */
    public ReportRepository(JdbcTemplate jdbcTemplate, ReportProperties reportProperties) {
        this.jdbcTemplate = jdbcTemplate;
        List<String> utilityCategories = reportProperties.utilityCategories();
        if (utilityCategories.isEmpty()) {
            log.warn("bonchi.reports.utility-categories is empty: no expense will be reported as utility");
        } else {
            log.info("Reports: {} utility category names loaded", utilityCategories.size());
        }
        // Names come from application.yml (not user input); quotes are still escaped
        String names = utilityCategories.stream()
                .map(c -> "'" + c.trim().toLowerCase(Locale.ROOT).replace("'", "''") + "'")
                .reduce((x, y) -> x + ", " + y)
                .orElse("''");
        this.bucketSql = "CASE "
                + "WHEN i.type = 'income' THEN 'income' "
                + "WHEN i.expense_kind = 'product' THEN 'purchase' "
                + "WHEN i.expense_kind = 'salary' THEN 'payroll' "
                + "WHEN LOWER(TRIM(i.category_name)) IN (" + names + ") THEN 'utility' "
                + "ELSE 'other' END";
    }

    public Map<String, Object> getSummaryRow(String dateFilter) {
        String sql = "SELECT " +
                "COALESCE(SUM(total_usd), 0) AS total_usd, " +
                "COALESCE(SUM(total_khr), 0) AS total_khr, " +
                "COALESCE(SUM(paid_usd), 0) AS paid_usd, " +
                "COALESCE(SUM(paid_khr), 0) AS paid_khr, " +
                "COALESCE(SUM(CASE WHEN status = 'unpaid' THEN total_usd - paid_usd ELSE 0 END), 0) AS owe_usd, " +
                "COALESCE(SUM(CASE WHEN status = 'unpaid' THEN total_khr - paid_khr ELSE 0 END), 0) AS owe_khr, " +
                "COALESCE(SUM(CASE WHEN wallet_code IN ('aba', 'bakong') THEN paid_usd ELSE 0 END), 0) AS qr_usd, " +
                "COALESCE(SUM(CASE WHEN wallet_code IN ('aba', 'bakong') THEN paid_khr ELSE 0 END), 0) AS qr_khr, " +
                "COALESCE(SUM(CASE WHEN wallet_code IN ('drawer', 'petty') THEN paid_usd ELSE 0 END), 0) AS cash_usd, " +
                "COALESCE(SUM(CASE WHEN wallet_code IN ('drawer', 'petty') THEN paid_khr ELSE 0 END), 0) AS cash_khr " +
                "FROM invoices WHERE " + dateFilter + " AND status != 'void' AND type = 'expense'";

        return jdbcTemplate.queryForMap(sql);
    }

    public List<Map<String, Object>> getPurchasedItems(String dateFilter) {
        String sql = "SELECT " +
                "ii.id, " +
                "ii.item_name, " +
                "CAST(ii.quantity AS FLOAT) AS quantity, " +
                "ii.unit, " +
                "CAST(ii.unit_price AS FLOAT) AS unit_price, " +
                "ii.currency, " +
                "CAST(ii.line_total AS FLOAT) AS line_total, " +
                "ii.is_paid, " +
                "i.id AS invoice_id, " +
                "i.invoice_no, " +
                "to_char(i.invoice_date, 'YYYY-MM-DD') AS invoice_date, " +
                "i.supplier_name, " +
                "i.wallet_code, " +
                "i.status " +
                "FROM invoice_items ii " +
                "JOIN invoices i ON i.id = ii.invoice_id " +
                "WHERE " + dateFilter + " AND i.status != 'void' AND i.type = 'expense' " +
                "ORDER BY i.invoice_date DESC, i.created_at DESC, i.id DESC, ii.created_at ASC, ii.id ASC";

        return jdbcTemplate.queryForList(sql);
    }

    public LocalDate findFirstInvoiceDate() {
        return jdbcTemplate.queryForObject("SELECT MIN(invoice_date) FROM invoices", LocalDate.class);
    }

    public List<Map<String, Object>> getCategoriesBreakdown(LocalDate start, LocalDate end) {
        return jdbcTemplate.query(
                "SELECT " + bucketSql + " AS grp, "
                        + "COALESCE(NULLIF(TRIM(i.category_name), ''), '" + UNCATEGORIZED + "') AS category, "
                        + "COUNT(*) AS cnt, COALESCE(SUM(i.total_usd), 0) AS usd, COALESCE(SUM(i.total_khr), 0) AS khr, "
                        + "MIN(i.invoice_date) AS first_date, MAX(i.invoice_date) AS last_date "
                        + "FROM invoices i "
                        + "WHERE i.status != 'void' AND i.invoice_date BETWEEN ? AND ? "
                        + "GROUP BY 1, 2 "
                        + "ORDER BY 1, (COALESCE(SUM(i.total_usd), 0) * " + KHR_PER_USD + " + COALESCE(SUM(i.total_khr), 0)) DESC",
                (rs, n) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("grp", rs.getString("grp"));
                    m.put("category", rs.getString("category"));
                    m.put("count", rs.getLong("cnt"));
                    m.put("usd", rs.getBigDecimal("usd"));
                    m.put("khr", rs.getBigDecimal("khr"));
                    m.put("first_date", rs.getObject("first_date", LocalDate.class).toString());
                    m.put("last_date", rs.getObject("last_date", LocalDate.class).toString());
                    return m;
                },
                start, end);
    }

    public List<Map<String, Object>> getSalaryInvoices(LocalDate start, LocalDate end) {
        return jdbcTemplate.query(
                "SELECT i.invoice_no, i.invoice_date, i.supplier_name, i.category_name, i.wallet_code, "
                        + "i.total_usd, i.total_khr "
                        + "FROM invoices i "
                        + "WHERE i.status != 'void' AND i.type = 'expense' AND i.expense_kind = 'salary' "
                        + "AND i.invoice_date BETWEEN ? AND ? "
                        + "ORDER BY i.invoice_date, i.id",
                (rs, n) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("invoice_no", rs.getString("invoice_no"));
                    m.put("date", rs.getObject("invoice_date", LocalDate.class).toString());
                    m.put("description", rs.getString("supplier_name"));
                    m.put("category", rs.getString("category_name"));
                    m.put("wallet_code", rs.getString("wallet_code"));
                    m.put("usd", rs.getBigDecimal("total_usd"));
                    m.put("khr", rs.getBigDecimal("total_khr"));
                    return m;
                },
                start, end);
    }

    /**
     * Payroll runs whose period ends in [start, end] (so a run is counted in exactly one month), void excluded.
     * {@code cost_*} is the salary earned for the period (gross + allowance + bonus - penalty) per currency;
     * {@code net_*} is what the run pays out after advances and carried debt.
     */
    public List<Map<String, Object>> getPayrollRuns(LocalDate start, LocalDate end) {
        String earned = "pi.gross + pi.allowance + pi.bonus - pi.penalty";
        return jdbcTemplate.query(
                "SELECT pr.id, pr.title, pr.period_start, pr.period_end, pr.status, "
                        + "(pr.paid_at AT TIME ZONE 'Asia/Phnom_Penh')::date AS paid_on, "
                        + "pr.total_net_usd, pr.total_net_khr, COUNT(pi.id) AS staff_count, "
                        + "COALESCE(SUM(" + earned + ") FILTER (WHERE pi.currency = 'USD'), 0) AS cost_usd, "
                        + "COALESCE(SUM(" + earned + ") FILTER (WHERE pi.currency = 'KHR'), 0) AS cost_khr "
                        + "FROM payroll_runs pr LEFT JOIN payroll_items pi ON pi.payroll_run_id = pr.id "
                        + "WHERE pr.status != 'void' AND pr.period_end BETWEEN ? AND ? "
                        + "GROUP BY pr.id "
                        + "ORDER BY pr.period_start, pr.id",
                (rs, n) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("title", rs.getString("title"));
                    m.put("period_start", rs.getObject("period_start", LocalDate.class).toString());
                    m.put("period_end", rs.getObject("period_end", LocalDate.class).toString());
                    m.put("status", rs.getString("status"));
                    LocalDate paidOn = rs.getObject("paid_on", LocalDate.class);
                    m.put("paid_on", paidOn != null ? paidOn.toString() : null);
                    m.put("net_usd", rs.getBigDecimal("total_net_usd"));
                    m.put("net_khr", rs.getBigDecimal("total_net_khr"));
                    m.put("staff_count", rs.getLong("staff_count"));
                    m.put("cost_usd", rs.getBigDecimal("cost_usd"));
                    m.put("cost_khr", rs.getBigDecimal("cost_khr"));
                    return m;
                },
                start, end);
    }

    public List<Map<String, Object>> getDailyCashflowRows(LocalDate start, LocalDate end, String[] buckets) {
        StringBuilder cols = new StringBuilder();
        for (String b : buckets) {
            cols.append("COALESCE(SUM(t.total_usd) FILTER (WHERE t.grp = '").append(b).append("'), 0) AS ").append(b).append("_usd, ");
            cols.append("COALESCE(SUM(t.total_khr) FILTER (WHERE t.grp = '").append(b).append("'), 0) AS ").append(b).append("_khr, ");
        }
        String sql = "WITH days AS ("
                + "  SELECT d::date AS day FROM generate_series(?::date, ?::date, INTERVAL '1 day') d"
                + "), t AS ("
                + "  SELECT i.invoice_date, i.total_usd, i.total_khr, i.type, " + bucketSql + " AS grp"
                + "  FROM invoices i WHERE i.status != 'void' AND i.invoice_date BETWEEN ? AND ?"
                + ") "
                + "SELECT days.day, " + cols
                + "COUNT(t.type) FILTER (WHERE t.type = 'income') AS income_count, "
                + "COUNT(t.type) FILTER (WHERE t.type = 'expense') AS expense_count "
                + "FROM days LEFT JOIN t ON t.invoice_date = days.day "
                + "GROUP BY days.day ORDER BY days.day";

        return jdbcTemplate.query(sql, (rs, n) -> {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("date", rs.getObject("day", LocalDate.class).toString());
            for (String b : buckets) {
                d.put(b + "_usd", rs.getBigDecimal(b + "_usd"));
                d.put(b + "_khr", rs.getBigDecimal(b + "_khr"));
            }
            d.put("income_count", rs.getLong("income_count"));
            d.put("expense_count", rs.getLong("expense_count"));
            return d;
        }, start, end, start, end);
    }

    public List<Map<String, Object>> getExportCardInvoices() {
        String sql = "SELECT " +
                "invoice_no, " +
                "supplier_name, " +
                "category_name, " +
                "wallet_code, " +
                "CAST(total_usd AS FLOAT) as total_usd, " +
                "CAST(total_khr AS BIGINT) as total_khr, " +
                "CAST(paid_usd AS FLOAT) as paid_usd, " +
                "CAST(paid_khr AS BIGINT) as paid_khr, " +
                "status, " +
                "to_char(invoice_time, 'HH24:MI:SS') as invoice_time " +
                "FROM invoices " +
                "WHERE invoice_date = CURRENT_DATE AND status != 'void' " +
                "ORDER BY invoice_time DESC";

        return jdbcTemplate.queryForList(sql);
    }
}
