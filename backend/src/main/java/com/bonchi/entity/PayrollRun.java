package com.bonchi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "payroll_runs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "payout_date", nullable = false)
    private LocalDate payoutDate;

    @Column(name = "exchange_rate", precision = 10, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal exchangeRate = new BigDecimal("4000.00");

    @Column(name = "total_net_usd", precision = 14, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal totalNetUsd = BigDecimal.ZERO;

    @Column(name = "total_net_khr", precision = 14, scale = 0, nullable = false)
    @Builder.Default
    private BigDecimal totalNetKhr = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "draft"; // draft, paid, void

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "paid_by")
    private Long paidBy;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @Column(name = "voided_by")
    private Long voidedBy;

    @Column(name = "voided_at")
    private OffsetDateTime voidedAt;

    @Column(name = "void_reason", length = 200)
    private String voidReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @OneToMany(mappedBy = "payrollRun", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PayrollItem> items = new ArrayList<>();
}
