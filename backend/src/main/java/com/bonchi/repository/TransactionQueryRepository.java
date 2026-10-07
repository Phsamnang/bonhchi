package com.bonchi.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

/** Reads the wallet transactions ledger (money in / out) with filters. */
@Repository
@RequiredArgsConstructor
public class TransactionQueryRepository {

    private static final ZoneId PHNOM_PENH = ZoneId.of("Asia/Phnom_Penh");

    private final JdbcTemplate jdbcTemplate;

    /**
     * Filters for the list; null fields are ignored. {@code walletIds} = wallets the role may see
     * (null = every wallet); {@code chosenWalletIds} = the wallets picked in the UI.
     */
    public record Filter(LocalDate from, LocalDate to, Collection<Long> walletIds, Collection<Long> chosenWalletIds,
                         String kind, String direction, String search) {
    }

    private record Where(String sql, List<Object> params) {
    }

    private static Where where(Filter f) {
        StringBuilder sql = new StringBuilder(" WHERE t.txn_date BETWEEN ? AND ?");
        List<Object> params = new ArrayList<>(List.of(f.from(), f.to()));
        if (f.walletIds() != null) {
            if (f.walletIds().isEmpty()) {
                sql.append(" AND FALSE");
            } else {
                sql.append(" AND t.wallet_id IN (").append(String.join(",", Collections.nCopies(f.walletIds().size(), "?"))).append(")");
                params.addAll(f.walletIds());
            }
        }
        if (f.chosenWalletIds() != null && !f.chosenWalletIds().isEmpty()) {
            sql.append(" AND t.wallet_id IN (").append(String.join(",", Collections.nCopies(f.chosenWalletIds().size(), "?"))).append(")");
            params.addAll(f.chosenWalletIds());
        }
        if (f.kind() != null) {
            sql.append(" AND t.kind = ?");
            params.add(f.kind());
        }
        if (f.direction() != null) {
            sql.append(" AND t.direction = ?");
            params.add(f.direction());
        }
        if (f.search() != null) {
            sql.append(" AND (t.description ILIKE ? OR i.invoice_no ILIKE ? OR w.name_km ILIKE ? OR w.code ILIKE ?)");
            String like = "%" + f.search() + "%";
            params.addAll(List.of(like, like, like, like));
        }
        return new Where(sql.toString(), params);
    }

    private static final String FROM = " FROM wallet_transactions t"
            + " JOIN wallets w ON w.id = t.wallet_id"
            + " LEFT JOIN invoices i ON t.ref_type = 'invoice' AND i.id = t.ref_id"
            + " LEFT JOIN users u ON u.id = t.created_by";

    public List<Map<String, Object>> find(Filter f, int limit, int offset) {
        Where w = where(f);
        List<Object> params = new ArrayList<>(w.params());
        params.add(limit);
        params.add(offset);
        return jdbcTemplate.query(
                "SELECT t.id, t.txn_date, t.created_at, t.wallet_id, w.code AS wallet_code, w.name_km AS wallet_name,"
                        + " t.direction, t.amount, t.currency, t.balance_after, t.kind, t.ref_type, t.ref_id, t.description,"
                        + " i.invoice_no, i.status AS invoice_status, COALESCE(u.name, u.username) AS created_by_name"
                        + FROM + w.sql()
                        + " ORDER BY t.txn_date DESC, t.created_at DESC, t.id DESC LIMIT ? OFFSET ?",
                (rs, n) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("date", rs.getObject("txn_date", LocalDate.class).toString());
                    Timestamp created = rs.getTimestamp("created_at");
                    m.put("time", created.toInstant().atZone(PHNOM_PENH).toLocalTime().withNano(0).toString());
                    m.put("created_at", created.toInstant().atZone(PHNOM_PENH).toOffsetDateTime().toString());
                    m.put("wallet_id", rs.getLong("wallet_id"));
                    m.put("wallet_code", rs.getString("wallet_code"));
                    m.put("wallet_name", rs.getString("wallet_name"));
                    m.put("direction", rs.getString("direction"));
                    m.put("amount", rs.getBigDecimal("amount"));
                    m.put("currency", rs.getString("currency"));
                    m.put("balance_after", rs.getBigDecimal("balance_after"));
                    m.put("kind", rs.getString("kind"));
                    m.put("ref_type", rs.getString("ref_type"));
                    long refId = rs.getLong("ref_id");
                    m.put("ref_id", rs.wasNull() ? null : refId);
                    m.put("description", rs.getString("description"));
                    m.put("invoice_no", rs.getString("invoice_no"));
                    m.put("invoice_status", rs.getString("invoice_status"));
                    m.put("created_by_name", rs.getString("created_by_name"));
                    return m;
                },
                params.toArray());
    }

    /** Row count plus money in / out per currency for the same filter */
    public Map<String, Object> totals(Filter f) {
        Where w = where(f);
        Map<String, Object> totals = new LinkedHashMap<>();
        long count = 0;
        for (String cur : List.of("usd", "khr")) {
            totals.put("in_" + cur, java.math.BigDecimal.ZERO);
            totals.put("out_" + cur, java.math.BigDecimal.ZERO);
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT t.direction, t.currency, COUNT(*) AS cnt, SUM(t.amount) AS amount" + FROM + w.sql()
                        + " GROUP BY t.direction, t.currency",
                w.params().toArray());
        for (Map<String, Object> r : rows) {
            count += ((Number) r.get("cnt")).longValue();
            String key = r.get("direction") + "_" + String.valueOf(r.get("currency")).toLowerCase(Locale.ROOT);
            totals.put(key, r.get("amount"));
        }
        totals.put("count", count);
        return totals;
    }
}
