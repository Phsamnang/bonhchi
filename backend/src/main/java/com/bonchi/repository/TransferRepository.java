package com.bonchi.repository;

import com.bonchi.entity.Transfer;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransferRepository extends JpaRepository<Transfer, Long> {

    @Query("SELECT t FROM Transfer t ORDER BY t.createdAt DESC")
    List<Transfer> findRecentTransfers(Pageable pageable);
}
