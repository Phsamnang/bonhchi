package com.bonchi.service;

import com.bonchi.common.TimeUtil;
import com.bonchi.dto.AdminDto;
import com.bonchi.entity.Invoice;
import com.bonchi.entity.InvoiceItem;
import com.bonchi.entity.Product;
import com.bonchi.entity.Supplier;
import com.bonchi.repository.InvoiceItemRepository;
import com.bonchi.repository.InvoiceRepository;
import com.bonchi.repository.ProductRepository;
import com.bonchi.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;

    @Transactional
    public Map<String, Object> importExcel(AdminDto.ImportExcelRequest req, Long userId) {
        if (req.getRows() == null || req.getRows().isEmpty()) {
            throw new IllegalArgumentException("Payload must include an array of rows from Excel file");
        }

        int invoicesCreated = 0;
        int suppliersCreated = 0;
        int productsCreated = 0;
        List<String> errors = new ArrayList<>();

        for (AdminDto.ExcelRow r : req.getRows()) {
            if (r.getVendor() == null || r.getItem_name() == null || r.getQuantity() == null || r.getUnit_price() == null) {
                errors.add("Row skipped due to missing fields: " + r.getVendor() + " - " + r.getItem_name());
                continue;
            }

            String vendorName = r.getVendor().trim();
            Supplier supplier = supplierRepository.findByName(vendorName)
                    .orElseGet(() -> {
                        Supplier s = Supplier.builder().name(vendorName).isActive(true).build();
                        return supplierRepository.save(s);
                    });

            String itemName = r.getItem_name().trim();
            Product product = productRepository.findByName(itemName)
                    .orElseGet(() -> {
                        Product p = Product.builder()
                                .name(itemName)
                                .defaultUnit(r.getUnit() != null ? r.getUnit().trim() : "គីឡូ")
                                .defaultCurrency(r.getCurrency() != null ? r.getCurrency().trim().toUpperCase() : "USD")
                                .defaultUnitPrice(r.getUnit_price())
                                .supplierId(supplier.getId())
                                .categoryId(1L)
                                .isActive(true)
                                .build();
                        return productRepository.save(p);
                    });

            boolean isUsd = !"KHR".equalsIgnoreCase(r.getCurrency());
            BigDecimal lineTotal = r.getQuantity().multiply(r.getUnit_price());
            BigDecimal totalUsd = isUsd ? lineTotal : BigDecimal.ZERO;
            BigDecimal totalKhr = isUsd ? BigDecimal.ZERO : lineTotal;

            String invNo = "#" + (1000 + new Random().nextInt(9000));
            LocalDate invDate = r.getDate() != null && !r.getDate().isBlank() ?
                    LocalDate.parse(r.getDate().trim()) : TimeUtil.today();
            String walletCode = r.getPaid_from() != null ? r.getPaid_from().trim() : "petty";

            Invoice invoice = Invoice.builder()
                    .invoiceNo(invNo)
                    .invoiceDate(invDate)
                    .invoiceTime(TimeUtil.nowTime())
                    .type("expense")
                    .expenseKind("product")
                    .supplierId(supplier.getId())
                    .supplierName(supplier.getName())
                    .walletCode(walletCode)
                    .totalUsd(totalUsd)
                    .totalKhr(totalKhr)
                    .paidUsd(totalUsd)
                    .paidKhr(totalKhr)
                    .status("paid")
                    .createdBy(userId)
                    .build();

            Invoice savedInvoice = invoiceRepository.save(invoice);

            InvoiceItem item = InvoiceItem.builder()
                    .invoice(savedInvoice)
                    .productId(product.getId())
                    .itemName(product.getName())
                    .quantity(r.getQuantity())
                    .unit(r.getUnit() != null ? r.getUnit().trim() : "គីឡូ")
                    .unitPrice(r.getUnit_price())
                    .currency(isUsd ? "USD" : "KHR")
                    .lineTotal(lineTotal)
                    .isPaid(true)
                    .build();

            invoiceItemRepository.save(item);
            invoicesCreated++;
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("imported_rows", req.getRows().size());
        resp.put("invoices_created", invoicesCreated);
        resp.put("suppliers_created", suppliersCreated);
        resp.put("products_created", productsCreated);
        resp.put("unresolved_errors", errors);
        return resp;
    }
}
