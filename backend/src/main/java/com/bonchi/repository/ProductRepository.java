package com.bonchi.repository;

import com.bonchi.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByIsActiveTrueOrderByNameAsc();

    /** [supplier_id, active product count] for every supplier that has products */
    @org.springframework.data.jpa.repository.Query(
            "SELECT p.supplierId, COUNT(p) FROM Product p WHERE p.isActive = true AND p.supplierId IS NOT NULL GROUP BY p.supplierId")
    List<Object[]> countActiveBySupplier();

    /** Active products with this exact name (case-insensitive) — for the one-product-one-supplier rule */
    List<Product> findByNameIgnoreCaseAndIsActiveTrue(String name);

    Optional<Product> findByName(String name);

    List<Product> findBySupplierIdAndIsActiveTrueOrderByNameAsc(Long supplierId);

    List<Product> findByNameContainingIgnoreCaseAndIsActiveTrueOrderByNameAsc(String search);

    List<Product> findBySupplierIdAndNameContainingIgnoreCaseAndIsActiveTrueOrderByNameAsc(Long supplierId, String search);

    Page<Product> findByIsActiveTrue(Pageable pageable);

    Page<Product> findBySupplierIdAndIsActiveTrue(Long supplierId, Pageable pageable);

    Page<Product> findByNameContainingIgnoreCaseAndIsActiveTrue(String search, Pageable pageable);

    Page<Product> findBySupplierIdAndNameContainingIgnoreCaseAndIsActiveTrue(Long supplierId, String search, Pageable pageable);
}
