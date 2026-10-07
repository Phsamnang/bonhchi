package com.bonchi.repository;

import com.bonchi.entity.WalletCount;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WalletCountRepository extends JpaRepository<WalletCount, Long> {

    boolean existsByCountDate(LocalDate countDate);

    @Query("SELECT wc FROM WalletCount wc ORDER BY wc.countDate DESC, wc.createdAt DESC")
    List<WalletCount> findHistory(Pageable pageable);

    @Query("SELECT wc FROM WalletCount wc WHERE wc.walletId = :walletId ORDER BY wc.countDate DESC")
    List<WalletCount> findByWalletId(@Param("walletId") Long walletId, Pageable pageable);
}
