package com.bonchi.repository;

import com.bonchi.entity.RequestDistribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequestDistributionRepository extends JpaRepository<RequestDistribution, Long> {
    List<RequestDistribution> findByMoneyRequestId(Long moneyRequestId);
}
