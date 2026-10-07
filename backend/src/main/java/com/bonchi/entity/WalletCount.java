package com.bonchi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "wallet_counts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalletCount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wallet_id", nullable = false)
    private Long walletId;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "count_date", nullable = false)
    private LocalDate countDate;

    @Column(name = "system_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal systemAmount;

    @Column(name = "counted_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal countedAmount;

    @Column(precision = 14, scale = 2)
    private BigDecimal difference;

    @Column(name = "tolerance_threshold", nullable = false, precision = 14, scale = 2)
    private BigDecimal toleranceThreshold;

    @Column(name = "denominations_breakdown", columnDefinition = "jsonb", nullable = false)
    private String denominationsBreakdown;

    @Column(name = "reason_for_gap", columnDefinition = "TEXT")
    private String reasonForGap;

    @Column(name = "is_blind_count", nullable = false)
    @Builder.Default
    private Boolean isBlindCount = true;

    @Column(name = "counted_by")
    private Long countedBy;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
