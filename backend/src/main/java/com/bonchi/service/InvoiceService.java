package com.bonchi.service;

import com.bonchi.common.TimeUtil;
import com.bonchi.dto.InvoiceDto;
import com.bonchi.entity.Invoice;
import com.bonchi.entity.InvoiceItem;
import com.bonchi.entity.InvoicePayment;
import com.bonchi.entity.Wallet;
import com.bonchi.repository.InvoiceItemRepository;
import com.bonchi.repository.InvoicePaymentRepository;
import com.bonchi.repository.InvoiceRepository;
import com.bonchi.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final InvoicePaymentRepository invoicePaymentRepository;
    private final WalletRepository walletRepository;
    private final WalletService walletService;
    private final LedgerService ledgerService;

    @Transactional(readOnly = true)
    public InvoiceDto.InvoiceListResponse getInvoices(
            String status, String type, Long supplierId, String supplier, String walletCode, String search,
            Integer page, Integer limit) {

        // No limit → every matching invoice (the wallet page and dashboard rely on this, as with the old API)
        boolean unpaged = limit == null || limit <= 0;
        int pageNum = !unpaged && page != null && page > 0 ? page : 1;
        int pageSize = unpaged ? 0 : Math.min(limit, 100);

        Pageable pageRequest = unpaged ? Pageable.unpaged() : PageRequest.of(pageNum - 1, pageSize);
        Page<Invoice> paged = invoiceRepository.findInvoicesFiltered(
                (status != null && !status.isBlank()) ? status : null,
                (type != null && !type.isBlank()) ? type : null,
                supplierId,
                (supplier != null && !supplier.isBlank()) ? supplier : null,
                (walletCode != null && !walletCode.isBlank()) ? walletCode : null,
                (search != null && !search.isBlank()) ? search : null,
                pageRequest
        );

        List<Invoice> rows = paged.getContent();
        Map<Long, List<InvoiceItem>> itemsByInvoice = rows.isEmpty()
                ? Map.of()
                : invoiceItemRepository.findByInvoiceIdInOrderByIdAsc(rows.stream().map(Invoice::getId).toList())
                        .stream()
                        .collect(java.util.stream.Collectors.groupingBy(it -> it.getInvoice().getId()));

        return InvoiceDto.InvoiceListResponse.builder()
                .total(paged.getTotalElements())
                .page(pageNum)
                .limit(unpaged ? (int) paged.getTotalElements() : pageSize)
                .totalPages(unpaged ? 1 : paged.getTotalPages())
                .invoices(rows.stream().map(inv -> toView(inv, itemsByInvoice.getOrDefault(inv.getId(), List.of()))).toList())
                .build();
    }

    /** Invoice → the JSON shape the frontend expects (uses the invoice's loaded items) */
    static InvoiceDto.InvoiceView toView(Invoice inv) {
        return toView(inv, inv.getItems() != null ? inv.getItems() : List.of());
    }

    static InvoiceDto.InvoiceView toView(Invoice inv, List<InvoiceItem> items) {
        return InvoiceDto.InvoiceView.builder()
                .id(inv.getId())
                .invoice_no(inv.getInvoiceNo())
                .date(inv.getInvoiceDate() != null ? inv.getInvoiceDate().toString() : null)
                .time(inv.getInvoiceTime() != null ? inv.getInvoiceTime().withNano(0).format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss")) : null)
                .type(inv.getType())
                .expense_kind(inv.getExpenseKind())
                .supplier_name(inv.getSupplierName())
                .table_name(inv.getTableName())
                .category(inv.getCategoryName())
                .wallet_code(inv.getWalletCode())
                .total_usd(scale(inv.getTotalUsd(), 2))
                .total_khr(scale(inv.getTotalKhr(), 0))
                .paid_usd(scale(inv.getPaidUsd(), 2))
                .paid_khr(scale(inv.getPaidKhr(), 0))
                .status(inv.getStatus())
                .void_reason(inv.getVoidReason())
                .receipt_url(inv.getReceiptUrl())
                .note(inv.getNote())
                .created_at(inv.getCreatedAt())
                .items(items.stream().map(it -> InvoiceDto.ItemView.builder()
                        .id(it.getId())
                        .item_name(it.getItemName())
                        .quantity(it.getQuantity())
                        .unit(it.getUnit())
                        .unit_price(it.getUnitPrice())
                        .currency(it.getCurrency())
                        .line_total(it.getLineTotal())
                        .is_paid(it.getIsPaid())
                        .build()).toList())
                .build();
    }

    private static BigDecimal scale(BigDecimal v, int digits) {
        return (v == null ? BigDecimal.ZERO : v).setScale(digits, java.math.RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public InvoiceDto.InvoiceView getInvoiceById(Long id) {
        return toView(invoiceRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with id: " + id)));
    }

    @Transactional
    public Map<String, Object> recordMarketTrip(InvoiceDto.MarketTripPayload body, Long userId) {
        if (body.getShops() == null || body.getShops().isEmpty()) {
            throw new IllegalArgumentException("At least one shop with items is required");
        }

        LocalDate tripDate = body.getTrip_date() != null && !body.getTrip_date().isBlank() ?
                LocalDate.parse(body.getTrip_date()) : TimeUtil.today();

        List<Invoice> createdInvoices = new ArrayList<>();

        for (InvoiceDto.MarketTripShopPayload shop : body.getShops()) {
            if (shop.getItems() == null || shop.getItems().isEmpty()) continue;

            String walletRef = shop.getWallet_id() != null ? shop.getWallet_id() : body.getWallet_id();
            Wallet wallet = walletRef != null ? walletService.findWalletForUpdate(walletRef) : null;
            String walletCode = wallet != null ? wallet.getCode() : null;

            BigDecimal totalUsd = BigDecimal.ZERO;
            BigDecimal totalKhr = BigDecimal.ZERO;
            BigDecimal shopPaidUsd = BigDecimal.ZERO;
            BigDecimal shopPaidKhr = BigDecimal.ZERO;

            for (InvoiceDto.MarketTripItemPayload it : shop.getItems()) {
                BigDecimal qty = it.getQuantity() != null ? it.getQuantity() : BigDecimal.ZERO;
                BigDecimal price = it.getUnit_price() != null ? it.getUnit_price() : BigDecimal.ZERO;
                BigDecimal lineTotal = qty.multiply(price);

                boolean isPaid = it.getIs_paid() != null ? it.getIs_paid() :
                        (body.getIs_paid() != null ? body.getIs_paid() : false);

                if ("USD".equalsIgnoreCase(it.getCurrency())) {
                    totalUsd = totalUsd.add(lineTotal);
                    if (isPaid) shopPaidUsd = shopPaidUsd.add(lineTotal);
                } else {
                    totalKhr = totalKhr.add(lineTotal);
                    if (isPaid) shopPaidKhr = shopPaidKhr.add(lineTotal);
                }
            }

            String status = "unpaid";
            boolean hasPaidPortion = shopPaidUsd.compareTo(BigDecimal.ZERO) > 0 || shopPaidKhr.compareTo(BigDecimal.ZERO) > 0;
            boolean hasUnpaidPortion = shopPaidUsd.compareTo(totalUsd) < 0 || shopPaidKhr.compareTo(totalKhr) < 0;

            if (!hasPaidPortion) {
                status = "unpaid";
            } else if (hasUnpaidPortion) {
                status = "partial";
            } else {
                status = "paid";
            }

            String invNo = "#" + (1000 + new Random().nextInt(9000));
            Long supplierId = null;
            if (shop.getSupplier_id() != null && !shop.getSupplier_id().isBlank()) {
                try { supplierId = Long.parseLong(shop.getSupplier_id()); } catch (Exception ignored) {}
            }

            Invoice invoice = Invoice.builder()
                    .invoiceNo(invNo)
                    .invoiceDate(tripDate)
                    .invoiceTime(TimeUtil.nowTime())
                    .type("expense")
                    .expenseKind("product")
                    .supplierId(supplierId)
                    .supplierName(shop.getSupplier_name())
                    .categoryName("គ្រឿងផ្សំ")
                    .walletCode(walletCode)
                    .totalUsd(totalUsd)
                    .totalKhr(totalKhr)
                    .paidUsd(shopPaidUsd)
                    .paidKhr(shopPaidKhr)
                    .status(status)
                    .receiptUrl(shop.getReceipt_url())
                    .createdBy(userId)
                    .build();

            Invoice savedInvoice = invoiceRepository.save(invoice);

            List<InvoiceItem> items = new ArrayList<>();
            for (InvoiceDto.MarketTripItemPayload it : shop.getItems()) {
                BigDecimal qty = it.getQuantity() != null ? it.getQuantity() : BigDecimal.ZERO;
                BigDecimal price = it.getUnit_price() != null ? it.getUnit_price() : BigDecimal.ZERO;
                BigDecimal lineTotal = qty.multiply(price);
                boolean isPaid = it.getIs_paid() != null ? it.getIs_paid() :
                        (body.getIs_paid() != null ? body.getIs_paid() : false);

                InvoiceItem item = InvoiceItem.builder()
                        .invoice(savedInvoice)
                        .itemName(it.getProduct_name())
                        .quantity(qty)
                        .unit(it.getUnit() != null ? it.getUnit() : "គីឡូ")
                        .unitPrice(price)
                        .currency(it.getCurrency() != null ? it.getCurrency().toUpperCase() : "USD")
                        .lineTotal(lineTotal)
                        .isPaid(isPaid)
                        .build();
                items.add(item);
            }
            invoiceItemRepository.saveAll(items);

            if (wallet != null) {
                BigDecimal paidAmount = "USD".equalsIgnoreCase(wallet.getCurrency()) ? shopPaidUsd : shopPaidKhr;
                if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
                    ledgerService.move(wallet, LedgerService.OUT, paidAmount, LedgerService.Source.invoice(
                            "purchase", savedInvoice.getId(),
                            LedgerService.describe("ទិញទំនិញ", shop.getSupplier_name()), tripDate, userId));

                    InvoicePayment payment = InvoicePayment.builder()
                            .invoice(savedInvoice)
                            .walletId(wallet.getId())
                            .amount(paidAmount)
                            .currency(wallet.getCurrency())
                            .method("cash")
                            .createdBy(userId)
                            .build();
                    invoicePaymentRepository.save(payment);
                }
            }

            createdInvoices.add(savedInvoice);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("count", createdInvoices.size());
        resp.put("invoices", createdInvoices.stream().map(InvoiceService::toView).toList());
        return resp;
    }

    @Transactional
    public Map<String, Object> recordSmallExpense(InvoiceDto.SmallExpensePayload body, Long userId) {
        if (body.getAmount() == null || body.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        LocalDate invDate = body.getDate() != null && !body.getDate().isBlank() ?
                LocalDate.parse(body.getDate()) : TimeUtil.today();

        String walletRef = body.getWallet_id() != null ? body.getWallet_id() : body.getWallet_code();
        Wallet wallet = walletRef != null ? walletService.findWalletForUpdate(walletRef) : null;
        String walletCode = wallet != null ? wallet.getCode() : (body.getWallet_code() != null ? body.getWallet_code() : "petty");

        String currency = body.getCurrency() != null ? body.getCurrency().toUpperCase() : "USD";
        boolean isUsd = "USD".equalsIgnoreCase(currency);
        if (wallet != null && !currency.equalsIgnoreCase(wallet.getCurrency())) {
            throw new IllegalArgumentException("កាបូប " + wallet.getNameKm() + " ជាប្រាក់ " + wallet.getCurrency()
                    + " — មិនអាចចំណាយជា " + currency + " បានទេ");
        }

        BigDecimal totalUsd = isUsd ? body.getAmount() : BigDecimal.ZERO;
        BigDecimal totalKhr = isUsd ? BigDecimal.ZERO : body.getAmount();

        String invNo = "#" + (1000 + new Random().nextInt(9000));
        Invoice invoice = Invoice.builder()
                .invoiceNo(invNo)
                .invoiceDate(invDate)
                .invoiceTime(TimeUtil.nowTime())
                .type("expense")
                .expenseKind("small")
                .categoryName(body.getCategory_name() != null ? body.getCategory_name() : "ទូទៅ")
                .walletCode(walletCode)
                .totalUsd(totalUsd)
                .totalKhr(totalKhr)
                .paidUsd(totalUsd)
                .paidKhr(totalKhr)
                .status("paid")
                .receiptUrl(body.getReceipt_url())
                .note(body.getNote())
                .createdBy(userId)
                .build();

        Invoice savedInvoice = invoiceRepository.save(invoice);

        InvoiceItem item = InvoiceItem.builder()
                .invoice(savedInvoice)
                .itemName(body.getCategory_name() != null ? body.getCategory_name() : "ចំណាយតូចតាច")
                .quantity(BigDecimal.ONE)
                .unit("លើក")
                .unitPrice(body.getAmount())
                .currency(currency)
                .lineTotal(body.getAmount())
                .isPaid(true)
                .build();
        invoiceItemRepository.save(item);

        if (wallet != null) {
            ledgerService.move(wallet, LedgerService.OUT, body.getAmount(), LedgerService.Source.invoice(
                    "expense", savedInvoice.getId(), savedInvoice.getCategoryName(), invDate, userId));

            InvoicePayment payment = InvoicePayment.builder()
                    .invoice(savedInvoice)
                    .walletId(wallet.getId())
                    .amount(body.getAmount())
                    .currency(currency)
                    .method("cash")
                    .createdBy(userId)
                    .build();
            invoicePaymentRepository.save(payment);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("invoice", toView(savedInvoice));
        return resp;
    }

    @Transactional
    public Map<String, Object> recordIncome(InvoiceDto.IncomePayload body, Long userId) {
        BigDecimal amtUsd = body.getAmount_usd() != null ? body.getAmount_usd() : BigDecimal.ZERO;
        BigDecimal amtKhr = body.getAmount_khr() != null ? body.getAmount_khr() : BigDecimal.ZERO;

        if (amtUsd.compareTo(BigDecimal.ZERO) <= 0 && amtKhr.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Either amount_usd or amount_khr must be greater than zero");
        }

        LocalDate invDate = body.getDate() != null && !body.getDate().isBlank() ?
                LocalDate.parse(body.getDate()) : TimeUtil.today();
        LocalTime invTime = body.getTime() != null && !body.getTime().isBlank() ?
                LocalTime.parse(body.getTime()) : TimeUtil.nowTime();

        String invNo = body.getReference_no() != null && !body.getReference_no().isBlank() ?
                body.getReference_no() : "#" + (1000 + new Random().nextInt(9000));

        Invoice invoice = Invoice.builder()
                .invoiceNo(invNo)
                .invoiceDate(invDate)
                .invoiceTime(invTime)
                .type("income")
                .tableName(body.getTable_name())
                .supplierName(body.getSource_name())
                .categoryName(body.getCategory_name() != null ? body.getCategory_name() : "ចំណូលលក់")
                .walletCode(body.getWallet_code())
                .totalUsd(amtUsd)
                .totalKhr(amtKhr)
                .paidUsd(amtUsd)
                .paidKhr(amtKhr)
                .status("paid")
                .note(body.getNote())
                .receiptUrl(body.getReceipt_url())
                .createdBy(userId)
                .build();

        Invoice savedInvoice = invoiceRepository.save(invoice);
        String incomeText = LedgerService.describe(
                savedInvoice.getTableName(), savedInvoice.getSupplierName(), savedInvoice.getCategoryName());

        if (amtUsd.compareTo(BigDecimal.ZERO) > 0) {
            String walletRef = body.getUsd_wallet_id() != null ? body.getUsd_wallet_id() :
                    (body.getWallet_id() != null ? body.getWallet_id() : body.getWallet_code());
            if (walletRef != null) {
                Wallet w = walletService.findWalletForUpdate(walletRef);
                ledgerService.move(w, LedgerService.IN, amtUsd, LedgerService.Source.invoice(
                        "income", savedInvoice.getId(), incomeText, invDate, userId));

                InvoicePayment p = InvoicePayment.builder()
                        .invoice(savedInvoice)
                        .walletId(w.getId())
                        .amount(amtUsd)
                        .currency("USD")
                        .method("cash")
                        .createdBy(userId)
                        .build();
                invoicePaymentRepository.save(p);
            }
        }

        if (amtKhr.compareTo(BigDecimal.ZERO) > 0) {
            String walletRef = body.getKhr_wallet_id() != null ? body.getKhr_wallet_id() :
                    (body.getWallet_id() != null ? body.getWallet_id() : body.getWallet_code());
            if (walletRef != null) {
                Wallet w = walletService.findWalletForUpdate(walletRef);
                ledgerService.move(w, LedgerService.IN, amtKhr, LedgerService.Source.invoice(
                        "income", savedInvoice.getId(), incomeText, invDate, userId));

                InvoicePayment p = InvoicePayment.builder()
                        .invoice(savedInvoice)
                        .walletId(w.getId())
                        .amount(amtKhr)
                        .currency("KHR")
                        .method("cash")
                        .createdBy(userId)
                        .build();
                invoicePaymentRepository.save(p);
            }
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("invoice", toView(savedInvoice));
        return resp;
    }

    @Transactional
    public Map<String, Object> voidInvoice(Long id, String reason, Long userId) {
        Invoice invoice = invoiceRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + id));

        if ("void".equalsIgnoreCase(invoice.getStatus())) {
            throw new IllegalArgumentException("Invoice is already voided");
        }

        for (InvoicePayment payment : invoice.getPayments()) {
            Wallet wallet = walletRepository.findByIdForUpdate(payment.getWalletId())
                    .orElse(null);
            if (wallet != null) {
                // Give the money back: income leaves the wallet again, an expense comes back in
                ledgerService.move(wallet,
                        "income".equalsIgnoreCase(invoice.getType()) ? LedgerService.OUT : LedgerService.IN,
                        payment.getAmount(),
                        LedgerService.Source.invoice("void", invoice.getId(),
                                LedgerService.describe("លុប " + invoice.getInvoiceNo(), reason), TimeUtil.today(), userId));
            }
        }

        invoice.setStatus("void");
        invoice.setVoidReason(reason);
        invoice.setVoidedBy(userId);
        invoice.setVoidedAt(OffsetDateTime.now());
        invoiceRepository.save(invoice);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("invoice", toView(invoice));
        return resp;
    }

    @Transactional
    public Map<String, Object> payInvoice(Long id, String walletIdRef, Long userId) {
        Invoice invoice = invoiceRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + id));

        if ("paid".equalsIgnoreCase(invoice.getStatus())) {
            throw new IllegalArgumentException("Invoice is already fully paid");
        }
        if ("void".equalsIgnoreCase(invoice.getStatus())) {
            throw new IllegalArgumentException("Cannot pay a voided invoice");
        }

        Wallet wallet = walletService.findWalletForUpdate(walletIdRef);

        BigDecimal unpaidUsd = invoice.getTotalUsd().subtract(invoice.getPaidUsd());
        BigDecimal unpaidKhr = invoice.getTotalKhr().subtract(invoice.getPaidKhr());

        BigDecimal payAmount = "USD".equalsIgnoreCase(wallet.getCurrency()) ? unpaidUsd : unpaidKhr;
        if (payAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("No unpaid balance matching wallet currency " + wallet.getCurrency());
        }

        if (wallet.getCurrentBalance().compareTo(payAmount) < 0) {
            throw new IllegalArgumentException("Insufficient wallet balance in " + wallet.getNameKm());
        }

        ledgerService.move(wallet, LedgerService.OUT, payAmount, LedgerService.Source.invoice(
                "payment", invoice.getId(),
                LedgerService.describe("បង់វិក្កយបត្រ " + invoice.getInvoiceNo(), invoice.getSupplierName()),
                TimeUtil.today(), userId));

        if ("USD".equalsIgnoreCase(wallet.getCurrency())) {
            invoice.setPaidUsd(invoice.getTotalUsd());
        } else {
            invoice.setPaidKhr(invoice.getTotalKhr());
        }

        boolean fullyPaid = invoice.getPaidUsd().compareTo(invoice.getTotalUsd()) >= 0 &&
                            invoice.getPaidKhr().compareTo(invoice.getTotalKhr()) >= 0;
        invoice.setStatus(fullyPaid ? "paid" : "partial");
        invoiceRepository.save(invoice);

        for (InvoiceItem item : invoice.getItems()) {
            if (item.getCurrency().equalsIgnoreCase(wallet.getCurrency())) {
                item.setIsPaid(true);
            }
        }
        invoiceItemRepository.saveAll(invoice.getItems());

        InvoicePayment payment = InvoicePayment.builder()
                .invoice(invoice)
                .walletId(wallet.getId())
                .amount(payAmount)
                .currency(wallet.getCurrency())
                .method("cash")
                .createdBy(userId)
                .build();
        invoicePaymentRepository.save(payment);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("invoice", toView(invoice));
        return resp;
    }

    @Transactional
    public Map<String, Object> toggleItemPaid(Long invoiceId, Long itemId) {
        Invoice invoice = invoiceRepository.findByIdWithDetails(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceId));

        InvoiceItem targetItem = invoice.getItems().stream()
                .filter(it -> it.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + itemId));

        targetItem.setIsPaid(!Boolean.TRUE.equals(targetItem.getIsPaid()));
        invoiceItemRepository.save(targetItem);

        BigDecimal paidUsd = BigDecimal.ZERO;
        BigDecimal paidKhr = BigDecimal.ZERO;

        for (InvoiceItem it : invoice.getItems()) {
            if (Boolean.TRUE.equals(it.getIsPaid())) {
                if ("USD".equalsIgnoreCase(it.getCurrency())) {
                    paidUsd = paidUsd.add(it.getLineTotal());
                } else {
                    paidKhr = paidKhr.add(it.getLineTotal());
                }
            }
        }

        invoice.setPaidUsd(paidUsd);
        invoice.setPaidKhr(paidKhr);

        boolean hasPaid = paidUsd.compareTo(BigDecimal.ZERO) > 0 || paidKhr.compareTo(BigDecimal.ZERO) > 0;
        boolean hasUnpaid = paidUsd.compareTo(invoice.getTotalUsd()) < 0 || paidKhr.compareTo(invoice.getTotalKhr()) < 0;

        if (!hasPaid) {
            invoice.setStatus("unpaid");
        } else if (hasUnpaid) {
            invoice.setStatus("partial");
        } else {
            invoice.setStatus("paid");
        }
        invoiceRepository.save(invoice);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("item", targetItem);
        resp.put("invoice", toView(invoice));
        return resp;
    }
}
