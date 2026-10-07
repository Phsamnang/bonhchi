package com.bonchi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "default_unit", nullable = false, length = 50)
    private String defaultUnit;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "supplier_id")
    private Long supplierId;

    @Column(name = "default_currency", length = 3)
    @Builder.Default
    private String defaultCurrency = "USD";

    @Column(name = "default_unit_price", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal defaultUnitPrice = BigDecimal.ZERO;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
