package com.bonchi.service;

import com.bonchi.common.TimeUtil;
import com.bonchi.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;

    private static final String[] BUCKETS = {"income", "purchase", "utility", "payroll", "other"};

    @Transactional(readOnly = true)
    public Map<String, Object> getSummary(String period) {
        String p = period != null ? period.toLowerCase() : "today";
        String dateFilter = "invoice_date = CURRENT_DATE";
        String label = "ថ្ងៃនេះ (Today)";

        if ("yesterday".equals(p)) {
            dateFilter = "invoice_date = CURRENT_DATE - INTERVAL '1 day'";
            label = "ម្សិលមិញ (Yesterday)";
        } else if ("week".equals(p)) {
            dateFilter = "invoice_date >= date_trunc('week', CURRENT_DATE)";
            label = "សប្តាហ៍នេះ (This Week)";
        } else if ("month".equals(p)) {
            dateFilter = "invoice_date >= date_trunc('month', CURRENT_DATE)";
            label = "ខែនេះ (This Month)";
        }

        Map<String, Object> row = reportRepository.getSummaryRow(dateFilter);

        double totalUsd = ((Number) row.get("total_usd")).doubleValue();
        long totalKhr = ((Number) row.get("total_khr")).longValue();
        double paidUsd = ((Number) row.get("paid_usd")).doubleValue();
        long paidKhr = ((Number) row.get("paid_khr")).longValue();
        double oweUsd = ((Number) row.get("owe_usd")).doubleValue();
        long oweKhr = ((Number) row.get("owe_khr")).longValue();
        double qrUsd = ((Number) row.get("qr_usd")).doubleValue();
        long qrKhr = ((Number) row.get("qr_khr")).longValue();
        double cashUsd = ((Number) row.get("cash_usd")).doubleValue();
        long cashKhr = ((Number) row.get("cash_khr")).longValue();

        Map<String, Object> resp = new HashMap<>();
        resp.put("period", p);
        resp.put("label", label);
        resp.put("usd", totalUsd);
        resp.put("khr", totalKhr);
        resp.put("owe_usd", String.format("$%.2f", oweUsd));
        resp.put("owe_khr", String.format("%,d ៛", oweKhr));
        resp.put("oweUsd", String.format("$%.2f", oweUsd));
        resp.put("oweKhr", String.format("%,d ៛", oweKhr));
        resp.put("paid", String.format("$%.2f · %,d ៛", paidUsd, paidKhr));
        resp.put("qr", String.format("$%.2f · %,d ៛", qrUsd, qrKhr));
        resp.put("cash", String.format("$%.2f · %,d ៛", cashUsd, cashKhr));

        return resp;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPurchasedItems(String period) {
        String p = period != null ? period.toLowerCase() : "today";
        String dateFilter = "i.invoice_date = CURRENT_DATE";

        if ("yesterday".equals(p)) {
            dateFilter = "i.invoice_date = CURRENT_DATE - INTERVAL '1 day'";
        } else if ("7days".equals(p) || "week".equals(p)) {
            dateFilter = "i.invoice_date >= CURRENT_DATE - INTERVAL '6 days'";
        } else if ("month".equals(p)) {
            dateFilter = "i.invoice_date >= date_trunc('month', CURRENT_DATE)";
        } else if ("all".equals(p)) {
            dateFilter = "TRUE";
        }

        List<Map<String, Object>> rows = reportRepository.getPurchasedItems(dateFilter);

        Map<String, Object> resp = new HashMap<>();
        resp.put("period", p);
        resp.put("total", rows.size());
        resp.put("items", rows);
        return resp;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDailyCashflow(String period) {
        String p = period != null ? period.toLowerCase() : "today";
        LocalDate today = TimeUtil.today();
        LocalDate start = switch (p) {
            case "yesterday" -> today.minusDays(1);
            case "7days", "week" -> today.minusDays(6);
            case "month" -> today.withDayOfMonth(1);
            case "all" -> {
                LocalDate first = reportRepository.findFirstInvoiceDate();
                yield first != null && first.isBefore(today) ? first : today;
            }
            default -> today;
        };
        LocalDate end = "yesterday".equals(p) ? today.minusDays(1) : today;

        List<Map<String, Object>> days = dailyRows(start, end);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("period", p);
        resp.put("days", days);
        resp.put("totals", sumDays(days));
        return resp;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMonthlyReport(String month) {
        if (month == null || !month.matches("^\\d{4}-(0[1-9]|1[0-2])$")) {
            throw new IllegalArgumentException("month must be YYYY-MM");
        }
        LocalDate start = LocalDate.parse(month + "-01");
        LocalDate monthEnd = start.plusMonths(1).minusDays(1);
        LocalDate today = TimeUtil.today();
        LocalDate end = monthEnd.isAfter(today) ? (today.isBefore(start) ? start : today) : monthEnd;

        // Monthly costs are not spread over the days:
        // - utilities (rent, electricity, water, internet…) are paid about once a month; they leave the
        //   day rows and come back in the totals from their categories (with the dates they were paid);
        // - payroll = salary for the month (runs whose period ends in it), not salary paid out on a day.
        //   Salary payouts/advances stay listed in "payroll" but leave the day rows and the totals.
        List<Map<String, Object>> days = dailyRows(start, end);
        for (Map<String, Object> d : days) {
            dropBucket(d, "utility");
            dropBucket(d, "payroll");
        }
        List<Map<String, Object>> payroll = reportRepository.getSalaryInvoices(start, end);
        List<Map<String, Object>> payrollRuns = reportRepository.getPayrollRuns(start, monthEnd);

        BigDecimal payrollUsd = BigDecimal.ZERO;
        BigDecimal payrollKhr = BigDecimal.ZERO;
        List<Map<String, Object>> categories = new ArrayList<>(reportRepository.getCategoriesBreakdown(start, end));
        categories.removeIf(c -> "payroll".equals(c.get("grp")));
        BigDecimal utilityUsd = BigDecimal.ZERO;
        BigDecimal utilityKhr = BigDecimal.ZERO;
        for (Map<String, Object> c : categories) {
            if (!"utility".equals(c.get("grp"))) continue;
            utilityUsd = utilityUsd.add(usd((BigDecimal) c.get("usd")));
            utilityKhr = utilityKhr.add(khr((BigDecimal) c.get("khr")));
        }
        for (Map<String, Object> run : payrollRuns) {
            BigDecimal u = usd((BigDecimal) run.get("cost_usd"));
            BigDecimal k = khr((BigDecimal) run.get("cost_khr"));
            payrollUsd = payrollUsd.add(u);
            payrollKhr = payrollKhr.add(k);

            Map<String, Object> c = new LinkedHashMap<>();
            c.put("grp", "payroll");
            c.put("category", run.get("title"));
            c.put("count", run.get("staff_count"));
            c.put("usd", u);
            c.put("khr", k);
            c.put("run_id", run.get("id"));
            c.put("status", run.get("status"));
            c.put("paid_on", run.get("paid_on"));
            categories.add(c);
        }

        Map<String, Object> totals = sumDays(days);
        totals.put("utility_usd", utilityUsd);
        totals.put("utility_khr", utilityKhr);
        totals.put("payroll_usd", payrollUsd);
        totals.put("payroll_khr", payrollKhr);
        // Utilities are kept apart from expenses: expense = purchase + payroll + other,
        // net = income - expense - utility
        totals.put("expense_usd", ((BigDecimal) totals.get("expense_usd")).add(payrollUsd));
        totals.put("expense_khr", ((BigDecimal) totals.get("expense_khr")).add(payrollKhr));
        totals.put("net_usd", ((BigDecimal) totals.get("net_usd")).subtract(payrollUsd).subtract(utilityUsd));
        totals.put("net_khr", ((BigDecimal) totals.get("net_khr")).subtract(payrollKhr).subtract(utilityKhr));

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("month", month);
        resp.put("start", start.toString());
        resp.put("end", end.toString());
        resp.put("exchange_rate", ReportRepository.KHR_PER_USD);
        resp.put("days", days);
        resp.put("totals", totals);
        resp.put("categories", categories);
        resp.put("payroll", payroll);
        resp.put("payroll_runs", payrollRuns);
        return resp;
    }

    private List<Map<String, Object>> dailyRows(LocalDate start, LocalDate end) {
        List<Map<String, Object>> rows = reportRepository.getDailyCashflowRows(start, end, BUCKETS);
        List<Map<String, Object>> formatted = new ArrayList<>();

        for (Map<String, Object> r : rows) {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("date", r.get("date"));
            BigDecimal expUsd = BigDecimal.ZERO;
            BigDecimal expKhr = BigDecimal.ZERO;

            for (String b : BUCKETS) {
                BigDecimal u = usd((BigDecimal) r.get(b + "_usd"));
                BigDecimal k = khr((BigDecimal) r.get(b + "_khr"));
                d.put(b + "_usd", u);
                d.put(b + "_khr", k);
                if (!"income".equals(b)) {
                    expUsd = expUsd.add(u);
                    expKhr = expKhr.add(k);
                }
            }
            d.put("expense_usd", expUsd);
            d.put("expense_khr", expKhr);
            d.put("net_usd", ((BigDecimal) d.get("income_usd")).subtract(expUsd));
            d.put("net_khr", ((BigDecimal) d.get("income_khr")).subtract(expKhr));
            d.put("income_count", r.get("income_count"));
            d.put("expense_count", r.get("expense_count"));
            formatted.add(d);
        }

        return formatted;
    }

    /** Takes one expense bucket out of a day row (expense and balance follow); the row keeps its shape. */
    private static void dropBucket(Map<String, Object> d, String bucket) {
        for (String cur : List.of("usd", "khr")) {
            BigDecimal p = (BigDecimal) d.get(bucket + "_" + cur);
            d.put(bucket + "_" + cur, BigDecimal.ZERO.setScale(p.scale()));
            d.put("expense_" + cur, ((BigDecimal) d.get("expense_" + cur)).subtract(p));
            d.put("net_" + cur, ((BigDecimal) d.get("net_" + cur)).add(p));
        }
    }

    private Map<String, Object> sumDays(List<Map<String, Object>> days) {
        Map<String, Object> totals = new LinkedHashMap<>();
        List<String> keys = new ArrayList<>();
        for (String b : BUCKETS) {
            keys.add(b + "_usd");
            keys.add(b + "_khr");
        }
        keys.addAll(List.of("expense_usd", "expense_khr", "net_usd", "net_khr"));
        for (String k : keys) {
            BigDecimal sum = BigDecimal.ZERO;
            for (Map<String, Object> d : days) sum = sum.add((BigDecimal) d.get(k));
            totals.put(k, sum);
        }
        return totals;
    }

    private static BigDecimal usd(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal khr(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(0, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getExportCard() {
        List<Map<String, Object>> rows = reportRepository.getExportCardInvoices();
        Map<String, Object> resp = new HashMap<>();
        resp.put("date", TimeUtil.getPhnomPenhDate());
        resp.put("invoices", rows);
        return resp;
    }
}
