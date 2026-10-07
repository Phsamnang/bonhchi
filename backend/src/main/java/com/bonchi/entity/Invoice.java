package com.bonchi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_no", nullable = false, unique = true, length = 50)
    private String invoiceNo;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(name = "invoice_time", nullable = false)
    private LocalTime invoiceTime;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String type = "expense"; // expense, income

    @Column(name = "expense_kind", length = 20)
    private String expenseKind; // product, small, salary

    @Column(name = "market_trip_id")
    private Long marketTripId;

    @Column(name = "supplier_id")
    private Long supplierId;

    @Column(name = "supplier_name", length = 150)
    private String supplierName;

    @Column(name = "table_name", length = 50)
    private String tableName;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "category_name", length = 100)
    private String categoryName;

    @Column(name = "wallet_code", length = 50)
    private String walletCode;

    @Column(name = "total_usd", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal totalUsd = BigDecimal.ZERO;

    @Column(name = "total_khr", precision = 14, scale = 0, nullable = false)
    @Builder.Default
    private BigDecimal totalKhr = BigDecimal.ZERO;

    @Column(name = "paid_usd", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal paidUsd = BigDecimal.ZERO;

    @Column(name = "paid_khr", precision = 14, scale = 0, nullable = false)
    @Builder.Default
    private BigDecimal paidKhr = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "unpaid"; // paid, partial, unpaid, void

    @Column(name = "void_reason", length = 100)
    private String voidReason;

    @Column(name = "voided_by")
    private Long voidedBy;

    @Column(name = "voided_at")
    private OffsetDateTime voidedAt;

    @Column(name = "receipt_url", columnDefinition = "TEXT")
    private String receiptUrl;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<InvoiceItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<InvoicePayment> payments = new ArrayList<>();
}
