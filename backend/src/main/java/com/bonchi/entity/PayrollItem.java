package com.bonchi.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "payroll_items", uniqueConstraints = {
        @UniqueConstraint(name = "payroll_items_run_staff_uq", columnNames = {"payroll_run_id", "staff_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_run_id", nullable = false)
    @JsonIgnore
    private PayrollRun payrollRun;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "daily_rate", nullable = false, precision = 14, scale = 4)
    private BigDecimal dailyRate;

    @Column(name = "days_counted", nullable = false, precision = 5, scale = 1)
    private BigDecimal daysCounted;

    @Column(name = "days_override", precision = 5, scale = 1)
    private BigDecimal daysOverride;

    @Column(name = "override_reason", columnDefinition = "TEXT")
    private String overrideReason;

    @Column(name = "unrecorded_days", nullable = false)
    @Builder.Default
    private Integer unrecordedDays = 0;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal gross;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal allowance = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal bonus = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal penalty = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal advances = BigDecimal.ZERO;

    @Column(name = "carry_in", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal carryIn = BigDecimal.ZERO;

    @Column(name = "carry_out", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal carryOut = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal net;

    @Column(name = "invoice_id")
    private Long invoiceId;

    @Column(columnDefinition = "TEXT")
    private String note;
}
