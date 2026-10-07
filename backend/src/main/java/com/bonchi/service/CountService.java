package com.bonchi.service;

import com.bonchi.common.TimeUtil;
import com.bonchi.dto.CountDto;
import com.bonchi.entity.Wallet;
import com.bonchi.entity.WalletCount;
import com.bonchi.repository.WalletCountRepository;
import com.bonchi.repository.WalletRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CountService {

    private final WalletCountRepository walletCountRepository;
    private final WalletRepository walletRepository;
    private final WalletService walletService;
    private final ObjectMapper objectMapper;

    private static final BigDecimal TOLERANCE_USD = new BigDecimal("2.00");
    private static final BigDecimal TOLERANCE_KHR = new BigDecimal("10000.00");

    @Transactional(readOnly = true)
    public CountDto.ExpectedResponse getExpected() {
        List<Wallet> wallets = walletRepository.findByIsActiveTrueOrderByCreatedAtAsc();

        BigDecimal usd = BigDecimal.ZERO;
        BigDecimal khr = BigDecimal.ZERO;

        for (Wallet w : wallets) {
            if (w.getCode() != null && w.getCode().startsWith("drawer")) {
                if ("USD".equalsIgnoreCase(w.getCurrency())) {
                    usd = usd.add(w.getCurrentBalance());
                } else if ("KHR".equalsIgnoreCase(w.getCurrency())) {
                    khr = khr.add(w.getCurrentBalance());
                }
            }
        }

        Map<String, BigDecimal> expected = new HashMap<>();
        expected.put("USD", usd);
        expected.put("KHR", khr);

        Map<String, BigDecimal> tolerance = new HashMap<>();
        tolerance.put("USD", TOLERANCE_USD);
        tolerance.put("KHR", TOLERANCE_KHR);

        return CountDto.ExpectedResponse.builder()
                .expected(expected)
                .tolerance(tolerance)
                .build();
    }

    @Transactional
    public Map<String, Object> recordCount(CountDto.RecordCountRequest req, Long userId) {
        if (req.getCurrency() == null || req.getDenominations() == null) {
            throw new IllegalArgumentException("currency and denominations breakdown are required");
        }

        String currency = req.getCurrency().trim().toUpperCase();
        Wallet targetWallet;
        if (req.getWallet_id() != null && !req.getWallet_id().isBlank()) {
            targetWallet = walletService.findWalletByCodeOrId(req.getWallet_id());
        } else {
            String defaultCode = "USD".equalsIgnoreCase(currency) ? "drawer_usd" : "drawer_khr";
            targetWallet = walletRepository.findByCode(defaultCode)
                    .orElseGet(() -> walletRepository.findByCodePrefixAndCurrency("drawer", currency).stream().findFirst()
                            .orElseThrow(() -> new IllegalArgumentException("Target drawer wallet for " + currency + " not found")));
        }

        BigDecimal counted = BigDecimal.ZERO;
        for (Map.Entry<String, Integer> entry : req.getDenominations().entrySet()) {
            try {
                BigDecimal denom = new BigDecimal(entry.getKey());
                BigDecimal count = new BigDecimal(entry.getValue());
                counted = counted.add(denom.multiply(count));
            } catch (Exception ignored) {}
        }

        BigDecimal system = targetWallet.getCurrentBalance();
        BigDecimal difference = counted.subtract(system);
        BigDecimal tolerance = "USD".equalsIgnoreCase(currency) ? TOLERANCE_USD : TOLERANCE_KHR;

        if (difference.abs().compareTo(tolerance) > 0 && (req.getReason_for_gap() == null || req.getReason_for_gap().isBlank())) {
            throw new IllegalArgumentException("Reason is required because discrepancy (" + difference + " " + currency +
                    ") exceeds tolerance threshold (" + tolerance + " " + currency + ")");
        }

        String jsonBreakdown;
        try {
            jsonBreakdown = objectMapper.writeValueAsString(req.getDenominations());
        } catch (Exception e) {
            jsonBreakdown = "{}";
        }

        WalletCount record = WalletCount.builder()
                .walletId(targetWallet.getId())
                .currency(currency)
                .countDate(TimeUtil.today())
                .systemAmount(system)
                .countedAmount(counted)
                .difference(difference)
                .toleranceThreshold(tolerance)
                .denominationsBreakdown(jsonBreakdown)
                .reasonForGap(req.getReason_for_gap())
                .isBlindCount(true)
                .countedBy(userId)
                .build();

        WalletCount saved = walletCountRepository.save(record);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("count_record", saved);
        return resp;
    }

    @Transactional(readOnly = true)
    public List<WalletCount> getHistory(int limit) {
        return walletCountRepository.findHistory(PageRequest.of(0, Math.max(1, limit)));
    }
}
