package com.bonchi.service;

import com.bonchi.common.TimeUtil;
import com.bonchi.repository.TransactionQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;

/** Every money in / out (wallet transactions ledger), filtered to the wallets the role may see. */
@Service
@RequiredArgsConstructor
public class TransactionService {

    private static final Set<String> KINDS = Set.of(
            "opening", "income", "purchase", "expense", "payment", "salary", "advance", "transfer", "request", "void");
    private static final int MAX_LIMIT = 200;
    private static final int MAX_DAYS = 366;

    private final TransactionQueryRepository transactionQueryRepository;
    private final WalletService walletService;

    @Transactional(readOnly = true)
    public Map<String, Object> list(String role, String from, String to, List<Long> walletIds, String kind,
                                    String direction, String search, int page, int limit) {
        LocalDate today = TimeUtil.today();
        LocalDate start = parseDate(from, "from", today);
        LocalDate end = parseDate(to, "to", start.isAfter(today) ? start : today);
        if (end.isBefore(start)) throw new IllegalArgumentException("to must be on or after from");
        if (start.plusDays(MAX_DAYS).isBefore(end)) throw new IllegalArgumentException("date range is limited to " + MAX_DAYS + " days");
        if (page < 1 || limit < 1) throw new IllegalArgumentException("page and limit must be at least 1");
        limit = Math.min(limit, MAX_LIMIT);

        String k = blankToNull(kind);
        if (k != null && !KINDS.contains(k)) throw new IllegalArgumentException("unknown kind: " + k);
        String d = blankToNull(direction);
        if (d != null && !d.equals(LedgerService.IN) && !d.equals(LedgerService.OUT)) {
            throw new IllegalArgumentException("direction must be 'in' or 'out'");
        }

        Set<Long> visible = walletService.visibleWalletIds(role);
        List<Long> chosen = walletIds == null ? List.of() : walletIds.stream().filter(Objects::nonNull).distinct().toList();
        if (visible != null && !visible.containsAll(chosen)) {
            throw new IllegalArgumentException("wallet not available for your role");
        }

        TransactionQueryRepository.Filter filter = new TransactionQueryRepository.Filter(
                start, end, visible, chosen.isEmpty() ? null : chosen, k, d, blankToNull(search));
        Map<String, Object> totals = transactionQueryRepository.totals(filter);
        long count = (long) totals.get("count");

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("from", start.toString());
        resp.put("to", end.toString());
        resp.put("transactions", transactionQueryRepository.find(filter, limit, (page - 1) * limit));
        resp.put("totals", totals);
        resp.put("page", page);
        resp.put("limit", limit);
        resp.put("total", count);
        resp.put("total_pages", Math.max(1, (count + limit - 1) / limit));
        return resp;
    }

    private static LocalDate parseDate(String value, String name, LocalDate fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(name + " must be YYYY-MM-DD");
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
