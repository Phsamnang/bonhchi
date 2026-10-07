package com.bonchi.repository;

import com.bonchi.entity.PayrollItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayrollItemRepository extends JpaRepository<PayrollItem, Long> {
    List<PayrollItem> findByPayrollRunId(Long payrollRunId);
    List<PayrollItem> findByStaffId(Long staffId);
}
