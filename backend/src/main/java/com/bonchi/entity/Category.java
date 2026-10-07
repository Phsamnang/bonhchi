package com.bonchi.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name_km", nullable = false, length = 100)
    private String nameKm;

    @Column(name = "name_en", length = 100)
    private String nameEn;

    @Column(nullable = false, length = 50)
    private String type; // income, expense

    @Column(name = "parent_id")
    private Long parentId;

    @Column(length = 50)
    private String icon;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
