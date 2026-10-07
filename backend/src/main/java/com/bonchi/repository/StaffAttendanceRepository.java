package com.bonchi.repository;

import com.bonchi.entity.StaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StaffAttendanceRepository extends JpaRepository<StaffAttendance, Long> {

    List<StaffAttendance> findByDate(LocalDate date);

    Optional<StaffAttendance> findByStaffIdAndDate(Long staffId, LocalDate date);

    @Query("SELECT sa FROM StaffAttendance sa WHERE sa.date >= :startDate AND sa.date <= :endDate ORDER BY sa.date ASC, sa.staffId ASC")
    List<StaffAttendance> findByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT sa FROM StaffAttendance sa WHERE sa.staffId = :staffId AND sa.date >= :startDate AND sa.date <= :endDate")
    List<StaffAttendance> findByStaffIdAndDateRange(
            @Param("staffId") Long staffId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
