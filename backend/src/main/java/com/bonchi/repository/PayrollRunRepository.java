package com.bonchi.repository;

import com.bonchi.entity.PayrollRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PayrollRunRepository extends JpaRepository<PayrollRun, Long> {

    @Query("SELECT pr FROM PayrollRun pr ORDER BY pr.periodStart DESC, pr.createdAt DESC")
    List<PayrollRun> findAllRuns();

    @Query("SELECT pr FROM PayrollRun pr LEFT JOIN FETCH pr.items WHERE pr.id = :id")
    Optional<PayrollRun> findByIdWithItems(@Param("id") Long id);

    @Query("SELECT pr FROM PayrollRun pr WHERE pr.periodStart <= :endDate AND pr.periodEnd >= :startDate ORDER BY pr.periodStart ASC")
    List<PayrollRun> findRunsOverlapping(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
