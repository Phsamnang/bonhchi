package com.bonchi.service;

import com.bonchi.dto.WalletDto;
import com.bonchi.entity.Transfer;
import com.bonchi.entity.Wallet;
import com.bonchi.repository.TransferRepository;
import com.bonchi.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransferRepository transferRepository;

    @Transactional(readOnly = true)
    public List<WalletDto.WalletResponse> getWallets(String userRole) {
        List<Wallet> all = walletRepository.findByIsActiveTrueOrderByCreatedAtAsc();

        List<WalletDto.WalletResponse> formatted = all.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        if ("staff".equalsIgnoreCase(userRole)) {
            return formatted.stream()
                    .filter(w -> w.getCode() != null && w.getCode().startsWith("petty"))
                    .collect(Collectors.toList());
        }

        if ("manager".equalsIgnoreCase(userRole)) {
            return formatted.stream()
                    .filter(w -> {
                        String c = w.getCode();
                        return c != null && (c.startsWith("drawer") || c.startsWith("main_drawer") ||
                                c.startsWith("petty") || c.startsWith("mgr") ||
                                c.startsWith("aba") || c.startsWith("bakong"));
                    })
                    .collect(Collectors.toList());
        }

        return formatted;
    }

    /**
     * { total: {usd, khr}, cash: {usd, khr}, bank: {usd, khr} } over the wallets this role may see
     * (frontend hooks/useWallets.ts `LiquiditySummary`). Each wallet holds one currency.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getLiquiditySummary(String userRole) {
        BigDecimal[] total = {BigDecimal.ZERO, BigDecimal.ZERO};
        BigDecimal[] cash = {BigDecimal.ZERO, BigDecimal.ZERO};
        BigDecimal[] bank = {BigDecimal.ZERO, BigDecimal.ZERO};
        for (WalletDto.WalletResponse w : getWallets(userRole)) {
            int idx = "KHR".equalsIgnoreCase(w.getCurrency()) ? 1 : 0;
            BigDecimal bal = w.getCurrent_balance() != null ? w.getCurrent_balance() : BigDecimal.ZERO;
            total[idx] = total[idx].add(bal);
            if ("cash".equalsIgnoreCase(w.getCategory())) cash[idx] = cash[idx].add(bal);
            else if ("bank".equalsIgnoreCase(w.getCategory())) bank[idx] = bank[idx].add(bal);
        }
        java.util.function.Function<BigDecimal[], Map<String, Object>> pair = p -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("usd", p[0].setScale(2, java.math.RoundingMode.HALF_UP));
            m.put("khr", p[1].setScale(0, java.math.RoundingMode.HALF_UP));
            return m;
        };
        Map<String, Object> resp = new java.util.LinkedHashMap<>();
        resp.put("total", pair.apply(total));
        resp.put("cash", pair.apply(cash));
        resp.put("bank", pair.apply(bank));
        return resp;
    }

    @Transactional(readOnly = true)
    public WalletDto.WalletResponse getWallet(String codeOrId) {
        Wallet wallet = findWalletByCodeOrId(codeOrId);
        return toResponse(wallet);
    }

    @Transactional
    public WalletDto.WalletResponse createWallet(WalletDto.CreateWalletRequest req) {
        if (req.getName_km() == null || req.getName_km().isBlank()) {
            throw new IllegalArgumentException("Wallet Khmer name is required");
        }

        String nameKm = req.getName_km().trim();
        String nameEn = req.getName_en() != null && !req.getName_en().isBlank() ? req.getName_en().trim() : nameKm;

        String currency = req.getCurrency() != null ? req.getCurrency().trim().toUpperCase() : "USD";
        BigDecimal opening = req.getOpening_balance() != null ? req.getOpening_balance() : BigDecimal.ZERO;

        if (req.getCurrency() == null) {
            if (req.getOpening_khr() != null && req.getOpening_khr().compareTo(BigDecimal.ZERO) > 0) {
                currency = "KHR";
                opening = req.getOpening_khr();
            } else if (req.getOpening_usd() != null && req.getOpening_usd().compareTo(BigDecimal.ZERO) > 0) {
                currency = "USD";
                opening = req.getOpening_usd();
            }
        }

        String code = req.getCode() != null ? req.getCode().trim().toLowerCase() : "";
        if (code.isBlank()) {
            String base = nameEn.toLowerCase().replaceAll("[^a-z0-9]", "_").replaceAll("_+", "_");
            String prefix = base.isBlank() ? "wallet_" + currency.toLowerCase() : base + "_" + currency.toLowerCase();
            code = prefix;
            int counter = 1;
            while (walletRepository.findByCode(code).isPresent()) {
                code = prefix + "_" + counter;
                counter++;
            }
        } else {
            if (walletRepository.findByCode(code).isPresent()) {
                throw new IllegalArgumentException("Wallet code '" + code + "' already exists");
            }
        }

        Wallet wallet = Wallet.builder()
                .code(code)
                .nameKm(nameKm)
                .nameEn(nameEn)
                .type(req.getType() != null ? req.getType() : "bank")
                .category(req.getCategory() != null ? req.getCategory() : ("cash".equalsIgnoreCase(req.getType()) ? "cash" : "bank"))
                .currency(currency)
                .openingBalance(opening)
                .currentBalance(opening)
                .isActive(true)
                .build();

        Wallet saved = walletRepository.save(wallet);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<WalletDto.TransferResponse> getTransfers(int limit) {
        List<Transfer> transfers = transferRepository.findRecentTransfers(PageRequest.of(0, Math.max(1, limit)));
        List<Wallet> wallets = walletRepository.findAll();
        Map<Long, Wallet> walletMap = wallets.stream().collect(Collectors.toMap(Wallet::getId, Function.identity(), (a, b) -> a));

        return transfers.stream().map(t -> {
            Wallet from = walletMap.get(t.getFromWalletId());
            Wallet to = walletMap.get(t.getToWalletId());
            return WalletDto.TransferResponse.builder()
                    .id(t.getId())
                    .transfer_date(t.getTransferDate())
                    .amount(t.getAmount())
                    .currency(t.getCurrency())
                    .note(t.getNote())
                    .from_wallet(from != null ? from.getNameKm() : String.valueOf(t.getFromWalletId()))
                    .to_wallet(to != null ? to.getNameKm() : String.valueOf(t.getToWalletId()))
                    .created_at(t.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public WalletDto.TransferResponse transfer(WalletDto.TransferRequest req, Long userId) {
        if (req.getFrom_wallet_id() == null || req.getTo_wallet_id() == null ||
                req.getAmount() == null || req.getCurrency() == null) {
            throw new IllegalArgumentException("from_wallet_id, to_wallet_id, amount, and currency are required");
        }

        if (req.getFrom_wallet_id().equals(req.getTo_wallet_id())) {
            throw new IllegalArgumentException("Source and destination wallets must be different");
        }

        Wallet fromWallet = findWalletForUpdate(req.getFrom_wallet_id());
        Wallet toWallet = findWalletForUpdate(req.getTo_wallet_id());

        String currency = req.getCurrency().trim().toUpperCase();
        if (!fromWallet.getCurrency().equalsIgnoreCase(currency)) {
            throw new IllegalArgumentException("Source wallet '" + fromWallet.getNameKm() + "' is in " +
                    fromWallet.getCurrency() + ", cannot transfer " + currency);
        }
        if (!toWallet.getCurrency().equalsIgnoreCase(currency)) {
            throw new IllegalArgumentException("Destination wallet '" + toWallet.getNameKm() + "' is in " +
                    toWallet.getCurrency() + ", cannot transfer " + currency);
        }

        if (req.getAmount().compareTo(fromWallet.getCurrentBalance()) > 0) {
            throw new IllegalArgumentException("Transfer amount (" + req.getAmount() + " " + currency +
                    ") exceeds available balance in " + fromWallet.getNameKm() + " (" + fromWallet.getCurrentBalance() + " " + currency + ")");
        }

        fromWallet.setCurrentBalance(fromWallet.getCurrentBalance().subtract(req.getAmount()));
        toWallet.setCurrentBalance(toWallet.getCurrentBalance().add(req.getAmount()));
        walletRepository.save(fromWallet);
        walletRepository.save(toWallet);

        Transfer transfer = Transfer.builder()
                .transferDate(LocalDate.now())
                .fromWalletId(fromWallet.getId())
                .toWalletId(toWallet.getId())
                .amount(req.getAmount())
                .currency(currency)
                .note(req.getNote())
                .createdBy(userId)
                .build();

        Transfer saved = transferRepository.save(transfer);

        return WalletDto.TransferResponse.builder()
                .id(saved.getId())
                .transfer_date(saved.getTransferDate())
                .amount(saved.getAmount())
                .currency(saved.getCurrency())
                .note(saved.getNote())
                .from_wallet(fromWallet.getNameKm())
                .to_wallet(toWallet.getNameKm())
                .created_at(saved.getCreatedAt())
                .build();
    }

    public Wallet findWalletByCodeOrId(String codeOrId) {
        try {
            Long id = Long.parseLong(codeOrId);
            return walletRepository.findById(id)
                    .or(() -> walletRepository.findByCode(codeOrId))
                    .orElseThrow(() -> new IllegalArgumentException("Wallet " + codeOrId + " not found"));
        } catch (NumberFormatException e) {
            return walletRepository.findByCode(codeOrId)
                    .orElseThrow(() -> new IllegalArgumentException("Wallet " + codeOrId + " not found"));
        }
    }

    public Wallet findWalletForUpdate(String codeOrId) {
        try {
            Long id = Long.parseLong(codeOrId);
            return walletRepository.findByIdForUpdate(id)
                    .or(() -> walletRepository.findByCodeForUpdate(codeOrId))
                    .orElseThrow(() -> new IllegalArgumentException("Wallet " + codeOrId + " not found"));
        } catch (NumberFormatException e) {
            return walletRepository.findByCodeForUpdate(codeOrId)
                    .orElseThrow(() -> new IllegalArgumentException("Wallet " + codeOrId + " not found"));
        }
    }

    private WalletDto.WalletResponse toResponse(Wallet w) {
        BigDecimal balance = w.getCurrentBalance() != null ? w.getCurrentBalance() : BigDecimal.ZERO;
        BigDecimal opening = w.getOpeningBalance() != null ? w.getOpeningBalance() : BigDecimal.ZERO;
        boolean isUsd = "USD".equalsIgnoreCase(w.getCurrency());

        return WalletDto.WalletResponse.builder()
                .id(w.getId())
                .code(w.getCode())
                .name_km(w.getNameKm())
                .name_en(w.getNameEn())
                .type(w.getType())
                .category(w.getCategory())
                .currency(w.getCurrency())
                .balance(balance)
                .opening_balance(opening)
                .current_balance(balance)
                .usd(isUsd ? balance : BigDecimal.ZERO)
                .khr(isUsd ? BigDecimal.ZERO : balance)
                .opening_usd(isUsd ? opening : BigDecimal.ZERO)
                .opening_khr(isUsd ? BigDecimal.ZERO : opening)
                .build();
    }
}
