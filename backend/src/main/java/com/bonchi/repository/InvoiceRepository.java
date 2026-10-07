package com.bonchi.repository;

import com.bonchi.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByInvoiceNo(String invoiceNo);

    // Fetch only `items`: joining two List collections at once throws MultipleBagFetchException.
    // `payments` loads lazily inside the calling transaction.
    @Query("SELECT DISTINCT i FROM Invoice i LEFT JOIN FETCH i.items WHERE i.id = :id")
    Optional<Invoice> findByIdWithDetails(@Param("id") Long id);

    @Query(value = "SELECT * FROM invoices WHERE " +
           "(CAST(:status AS text) IS NULL OR status::text = CAST(:status AS text)) AND " +
           "(CAST(:type AS text) IS NULL OR type::text = CAST(:type AS text)) AND " +
           "(CAST(:supplier AS text) IS NULL OR supplier_name ILIKE '%' || CAST(:supplier AS text) || '%') AND " +
           "(CAST(:walletCode AS text) IS NULL OR wallet_code = CAST(:walletCode AS text)) AND " +
           "(CAST(:search AS text) IS NULL OR (" +
           "   invoice_no ILIKE '%' || CAST(:search AS text) || '%' OR " +
           "   supplier_name ILIKE '%' || CAST(:search AS text) || '%' OR " +
           "   category_name ILIKE '%' || CAST(:search AS text) || '%' OR " +
           "   table_name ILIKE '%' || CAST(:search AS text) || '%' " +
           ")) ORDER BY invoice_date DESC, invoice_time DESC, id DESC",
           countQuery = "SELECT count(*) FROM invoices WHERE " +
           "(CAST(:status AS text) IS NULL OR status::text = CAST(:status AS text)) AND " +
           "(CAST(:type AS text) IS NULL OR type::text = CAST(:type AS text)) AND " +
           "(CAST(:supplier AS text) IS NULL OR supplier_name ILIKE '%' || CAST(:supplier AS text) || '%') AND " +
           "(CAST(:walletCode AS text) IS NULL OR wallet_code = CAST(:walletCode AS text)) AND " +
           "(CAST(:search AS text) IS NULL OR (" +
           "   invoice_no ILIKE '%' || CAST(:search AS text) || '%' OR " +
           "   supplier_name ILIKE '%' || CAST(:search AS text) || '%' OR " +
           "   category_name ILIKE '%' || CAST(:search AS text) || '%' OR " +
           "   table_name ILIKE '%' || CAST(:search AS text) || '%' " +
           "))",
           nativeQuery = true)
    Page<Invoice> findInvoicesFiltered(
            @Param("status") String status,
            @Param("type") String type,
            @Param("supplier") String supplier,
            @Param("walletCode") String walletCode,
            @Param("search") String search,
            Pageable pageable);

    @Query(value = "SELECT * FROM invoices WHERE invoice_date = :date AND status::text != 'void' ORDER BY created_at DESC", nativeQuery = true)
    List<Invoice> findRecentByDate(@Param("date") LocalDate date, Pageable pageable);

    @Query(value = "SELECT * FROM invoices WHERE invoice_date = :date AND status::text != 'void' ORDER BY invoice_time DESC", nativeQuery = true)
    List<Invoice> findByDateOrderByTimeDesc(@Param("date") LocalDate date);
}
