package com.bonchi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Money lent to a staff member, paid back by {@code installment} from each payroll run */
@Entity
@Table(name = "staff_loans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffLoan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal principal;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal installment;

    @Column(name = "given_at", nullable = false)
    private LocalDate givenAt;

    @Column(name = "wallet_id")
    private Long walletId;

    @Column(name = "invoice_id")
    private Long invoiceId;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "open"; // open, repaid, void

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
