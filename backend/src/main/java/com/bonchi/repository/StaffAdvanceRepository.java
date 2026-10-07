package com.bonchi.repository;

import com.bonchi.entity.StaffAdvance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface StaffAdvanceRepository extends JpaRepository<StaffAdvance, Long> {

    @Query(value = "SELECT * FROM staff_advances WHERE (CAST(:status AS text) IS NULL OR status::text = CAST(:status AS text)) ORDER BY given_at DESC, created_at DESC", nativeQuery = true)
    List<StaffAdvance> findAdvances(@Param("status") String status);

    @Query(value = "SELECT * FROM staff_advances WHERE staff_id = :staffId AND status::text = 'open' AND given_at <= :beforeDate", nativeQuery = true)
    List<StaffAdvance> findOpenAdvancesForStaff(@Param("staffId") Long staffId, @Param("beforeDate") LocalDate beforeDate);

    @Query(value = "SELECT * FROM staff_advances WHERE given_at >= :startDate AND given_at <= :endDate AND status::text != 'void'", nativeQuery = true)
    List<StaffAdvance> findValidAdvancesBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
