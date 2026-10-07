package com.bonchi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * One change of a wallet balance (money in or out). Written only through
 * {@link com.bonchi.service.LedgerService#move}, together with the balance change itself.
 */
@Entity
@Table(name = "wallet_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalletTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wallet_id", nullable = false)
    private Long walletId;

    @Column(nullable = false, length = 3)
    private String direction; // in, out

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "balance_after", precision = 14, scale = 2)
    private BigDecimal balanceAfter;

    @Column(nullable = false, length = 20)
    private String kind; // opening, income, purchase, expense, payment, salary, advance, transfer, request, void

    @Column(name = "ref_type", length = 20)
    private String refType; // invoice, transfer, wallet

    @Column(name = "ref_id")
    private Long refId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "txn_date", nullable = false)
    private LocalDate txnDate;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
