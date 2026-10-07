package com.bonchi.service;

import com.bonchi.common.TimeUtil;
import com.bonchi.dto.WalletDto;
import com.bonchi.entity.Invoice;
import com.bonchi.repository.InvoiceRepository;
import com.bonchi.repository.WalletCountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final WalletService walletService;
    private final InvoiceRepository invoiceRepository;
    private final WalletCountRepository walletCountRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getSummary(String role) {
        String userRole = role != null ? role.toLowerCase() : "staff";
        List<WalletDto.WalletResponse> visibleWallets = walletService.getWallets(userRole);

        BigDecimal cashUsd = BigDecimal.ZERO;
        BigDecimal cashKhr = BigDecimal.ZERO;
        BigDecimal bankUsd = BigDecimal.ZERO;
        BigDecimal bankKhr = BigDecimal.ZERO;
        BigDecimal totalUsd = BigDecimal.ZERO;
        BigDecimal totalKhr = BigDecimal.ZERO;

        for (WalletDto.WalletResponse w : visibleWallets) {
            BigDecimal usd = w.getUsd() != null ? w.getUsd() : BigDecimal.ZERO;
            BigDecimal khr = w.getKhr() != null ? w.getKhr() : BigDecimal.ZERO;

            totalUsd = totalUsd.add(usd);
            totalKhr = totalKhr.add(khr);

            if ("cash".equalsIgnoreCase(w.getCategory())) {
                cashUsd = cashUsd.add(usd);
                cashKhr = cashKhr.add(khr);
            } else if ("bank".equalsIgnoreCase(w.getCategory())) {
                bankUsd = bankUsd.add(usd);
                bankKhr = bankKhr.add(khr);
            }
        }

        LocalDate today = TimeUtil.today();
        List<Invoice> todayInvoices = invoiceRepository.findByDateOrderByTimeDesc(today);

        BigDecimal incomeUsd = BigDecimal.ZERO;
        BigDecimal incomeKhr = BigDecimal.ZERO;
        BigDecimal expenseUsd = BigDecimal.ZERO;
        BigDecimal expenseKhr = BigDecimal.ZERO;
        BigDecimal staffUsd = BigDecimal.ZERO;
        BigDecimal staffKhr = BigDecimal.ZERO;

        for (Invoice inv : todayInvoices) {
            if ("income".equalsIgnoreCase(inv.getType())) {
                incomeUsd = incomeUsd.add(inv.getTotalUsd());
                incomeKhr = incomeKhr.add(inv.getTotalKhr());
            } else if ("expense".equalsIgnoreCase(inv.getType())) {
                expenseUsd = expenseUsd.add(inv.getTotalUsd());
                expenseKhr = expenseKhr.add(inv.getTotalKhr());

                if (inv.getWalletCode() != null && inv.getWalletCode().startsWith("petty")) {
                    staffUsd = staffUsd.add(inv.getTotalUsd());
                    staffKhr = staffKhr.add(inv.getTotalKhr());
                }
            }
        }

        List<Invoice> recentTransactions = invoiceRepository.findRecentByDate(today, PageRequest.of(0, 10));
        boolean closingCountCompleted = walletCountRepository.existsByCountDate(today);

        Map<String, Object> resp = new HashMap<>();
        resp.put("date", TimeUtil.getPhnomPenhDate());
        resp.put("date_km", TimeUtil.getPhnomPenhDateKhmer());
        resp.put("role", userRole);
        resp.put("closing_count_completed", closingCountCompleted);
        resp.put("closing_time", "21:00");

        Map<String, Object> inc = new HashMap<>();
        inc.put("usd", incomeUsd);
        inc.put("khr", incomeKhr);
        resp.put("income_today", inc);

        Map<String, Object> exp = new HashMap<>();
        exp.put("usd", expenseUsd);
        exp.put("khr", expenseKhr);
        resp.put("expense_today", exp);

        Map<String, Object> stf = new HashMap<>();
        stf.put("usd", staffUsd);
        stf.put("khr", staffKhr);
        resp.put("staff_spend_today", stf);

        Map<String, Object> liquidity = new HashMap<>();
        Map<String, Object> liqTotal = new HashMap<>();
        liqTotal.put("usd", totalUsd);
        liqTotal.put("khr", totalKhr);
        liquidity.put("total", liqTotal);

        Map<String, Object> liqCash = new HashMap<>();
        liqCash.put("usd", cashUsd);
        liqCash.put("khr", cashKhr);
        liquidity.put("cash", liqCash);

        Map<String, Object> liqBank = new HashMap<>();
        liqBank.put("usd", bankUsd);
        liqBank.put("khr", bankKhr);
        liquidity.put("bank", liqBank);
        resp.put("liquidity", liquidity);

        resp.put("wallets", visibleWallets);
        resp.put("recent_transactions", recentTransactions);

        return resp;
    }
}
