package com.bonchi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "staff_attendance", uniqueConstraints = {
        @UniqueConstraint(name = "staff_attendance_staff_date_uq", columnNames = {"staff_id", "date"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "present"; // present, half_day, absent, leave_paid, leave_unpaid, holiday_work

    @Column(name = "paid_units", nullable = false, precision = 3, scale = 1)
    private BigDecimal paidUnits;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "recorded_by")
    private Long recordedBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
