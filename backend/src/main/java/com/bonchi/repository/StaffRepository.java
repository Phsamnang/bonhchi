package com.bonchi.repository;

import com.bonchi.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StaffRepository extends JpaRepository<Staff, Long> {

    List<Staff> findByIsActiveTrueOrderByJoinedDateAsc();

    List<Staff> findAllByOrderByJoinedDateAsc();

    @Query("SELECT s FROM Staff s LEFT JOIN FETCH StaffContract sc ON sc.staffId = s.id WHERE s.isActive = true ORDER BY s.joinedDate ASC")
    List<Staff> findActiveStaffWithContract();
}
