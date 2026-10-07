package com.bonchi.service;

import com.bonchi.common.TimeUtil;
import com.bonchi.entity.Wallet;
import com.bonchi.entity.WalletTransaction;
import com.bonchi.repository.WalletRepository;
import com.bonchi.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashSet;

/**
 * The only place that changes a wallet balance: every change also writes one
 * {@link WalletTransaction} row, so the transactions list shows every money in and out.
 */
@Service
@RequiredArgsConstructor
public class LedgerService {

    public static final String IN = "in";
    public static final String OUT = "out";

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;

    /** What caused a movement: kind + the record it belongs to + a short text for the list */
    public record Source(String kind, String refType, Long refId, String description, LocalDate date, Long userId) {

        public static Source invoice(String kind, Long invoiceId, String description, LocalDate date, Long userId) {
            return new Source(kind, "invoice", invoiceId, description, date, userId);
        }

        public static Source transfer(String kind, Long transferId, String description, LocalDate date, Long userId) {
            return new Source(kind, "transfer", transferId, description, date, userId);
        }
    }

    /**
     * Moves {@code amount} into ({@link #IN}) or out of ({@link #OUT}) the wallet, saves it and records
     * the movement. The amount is in the wallet's own currency. Zero or negative amounts do nothing.
     * Joins the caller's transaction: if the caller fails, neither the balance nor the row is kept.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public WalletTransaction move(Wallet wallet, String direction, BigDecimal amount, Source source) {
        if (amount == null || amount.signum() <= 0) return null;
        if (!IN.equals(direction) && !OUT.equals(direction)) {
            throw new IllegalArgumentException("direction must be 'in' or 'out'");
        }

        wallet.setCurrentBalance(IN.equals(direction)
                ? wallet.getCurrentBalance().add(amount)
                : wallet.getCurrentBalance().subtract(amount));
        walletRepository.save(wallet);

        return walletTransactionRepository.save(WalletTransaction.builder()
                .walletId(wallet.getId())
                .direction(direction)
                .amount(amount)
                .currency(wallet.getCurrency())
                .balanceAfter(wallet.getCurrentBalance())
                .kind(source.kind())
                .refType(source.refType())
                .refId(source.refId())
                .description(source.description())
                .txnDate(source.date() != null ? source.date() : TimeUtil.today())
                .createdBy(source.userId())
                .build());
    }

    /** Records a wallet's opening balance (the balance itself is already set on the new wallet). */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordOpening(Wallet wallet, Long userId) {
        if (wallet.getOpeningBalance() == null || wallet.getOpeningBalance().signum() <= 0) return;
        walletTransactionRepository.save(WalletTransaction.builder()
                .walletId(wallet.getId())
                .direction(IN)
                .amount(wallet.getOpeningBalance())
                .currency(wallet.getCurrency())
                .balanceAfter(wallet.getCurrentBalance())
                .kind("opening")
                .refType("wallet")
                .refId(wallet.getId())
                .description("សមតុល្យដើម · " + wallet.getNameKm())
                .txnDate(TimeUtil.today())
                .createdBy(userId)
                .build());
    }

    /** "a · b · c" from the non-blank parts, without repeats */
    public static String describe(String... parts) {
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        for (String p : parts) {
            if (p != null && !p.isBlank()) seen.add(p.trim());
        }
        return String.join(" · ", seen);
    }
}
