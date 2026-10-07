package com.bonchi.repository;

import com.bonchi.entity.MoneyRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MoneyRequestRepository extends JpaRepository<MoneyRequest, Long> {

    @Query(value = "SELECT * FROM money_requests WHERE (CAST(:status AS text) IS NULL OR status::text = CAST(:status AS text)) ORDER BY created_at DESC", nativeQuery = true)
    List<MoneyRequest> findRequestsByStatus(@Param("status") String status);
}
