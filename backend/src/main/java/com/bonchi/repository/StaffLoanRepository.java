package com.bonchi.repository;

import com.bonchi.entity.StaffLoan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StaffLoanRepository extends JpaRepository<StaffLoan, Long> {
}
