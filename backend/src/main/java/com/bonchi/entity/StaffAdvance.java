package com.bonchi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "staff_advances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffAdvance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "given_at", nullable = false)
    private LocalDate givenAt;

    @Column(name = "wallet_id")
    private Long walletId;

    @Column(name = "invoice_id")
    private Long invoiceId;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "open"; // open, deducted, void

    @Column(name = "deducted_in_item_id")
    private Long deductedInItemId;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
