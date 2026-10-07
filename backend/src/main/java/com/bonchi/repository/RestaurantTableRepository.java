package com.bonchi.repository;

import com.bonchi.entity.RestaurantTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RestaurantTableRepository extends JpaRepository<RestaurantTable, Long> {
    List<RestaurantTable> findByIsActiveTrueOrderBySortOrderAsc();
    Optional<RestaurantTable> findByName(String name);
}
