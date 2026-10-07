package com.bonchi.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "invoice_payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoicePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    @JsonIgnore
    private Invoice invoice;

    @Column(name = "wallet_id", nullable = false)
    private Long walletId;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String method = "cash";

    @Column(name = "cross_currency_rate", precision = 10, scale = 4)
    private BigDecimal crossCurrencyRate;

    @CreationTimestamp
    @Column(name = "paid_at", nullable = false, updatable = false)
    private OffsetDateTime paidAt;

    @Column(name = "created_by")
    private Long createdBy;
}
