package com.bonchi.repository;

import com.bonchi.entity.StaffContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffContractRepository extends JpaRepository<StaffContract, Long> {

    @Query("SELECT sc FROM StaffContract sc WHERE sc.staffId = :staffId ORDER BY sc.effectiveFrom DESC")
    List<StaffContract> findByStaffIdOrderByEffectiveFromDesc(@Param("staffId") Long staffId);

    default Optional<StaffContract> findLatestByStaffId(Long staffId) {
        List<StaffContract> list = findByStaffIdOrderByEffectiveFromDesc(staffId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}
