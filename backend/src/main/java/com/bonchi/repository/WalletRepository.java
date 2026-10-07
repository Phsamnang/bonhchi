package com.bonchi.repository;

import com.bonchi.entity.Wallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, Long> {

    List<Wallet> findByIsActiveTrueOrderByCreatedAtAsc();

    Optional<Wallet> findByCode(String code);

    @Query("SELECT w FROM Wallet w WHERE w.id = :id OR w.code = :code")
    Optional<Wallet> findByIdOrCode(@Param("id") Long id, @Param("code") String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.id = :id")
    Optional<Wallet> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.code = :code")
    Optional<Wallet> findByCodeForUpdate(@Param("code") String code);

    @Query("SELECT w FROM Wallet w WHERE (w.code = :code OR w.code LIKE CONCAT(CAST(:code AS String), '_%')) AND w.currency = :currency")
    List<Wallet> findByCodePrefixAndCurrency(@Param("code") String code, @Param("currency") String currency);
}
