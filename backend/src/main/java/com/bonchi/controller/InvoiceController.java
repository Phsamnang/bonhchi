package com.bonchi.controller;

import com.bonchi.dto.InvoiceDto;
import com.bonchi.entity.Invoice;
import com.bonchi.security.UserPrincipal;
import com.bonchi.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    public ResponseEntity<InvoiceDto.InvoiceListResponse> getAll(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "supplier_id", required = false) Long supplierId,
            @RequestParam(value = "supplier", required = false) String supplier,
            @RequestParam(value = "wallet_code", required = false) String walletCode,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "limit", required = false) Integer limit) {

        return ResponseEntity.ok(invoiceService.getInvoices(status, type, supplierId, supplier, walletCode, search, page, limit));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDto.InvoiceView> getById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(invoiceService.getInvoiceById(id));
    }

    @PostMapping("/market-trip")
    public ResponseEntity<Map<String, Object>> createMarketTrip(
            @RequestBody InvoiceDto.MarketTripPayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.recordMarketTrip(body, userId));
    }

    @PostMapping("/small-expense")
    public ResponseEntity<Map<String, Object>> createSmallExpense(
            @RequestBody InvoiceDto.SmallExpensePayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.recordSmallExpense(body, userId));
    }

    @PostMapping("/income")
    public ResponseEntity<Map<String, Object>> createIncome(
            @RequestBody InvoiceDto.IncomePayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.recordIncome(body, userId));
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> voidInvoice(
            @PathVariable("id") Long id,
            @RequestBody(required = false) InvoiceDto.VoidRequest body,
            @AuthenticationPrincipal UserPrincipal user) {
        String reason = body != null ? body.getReason() : null;
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(invoiceService.voidInvoice(id, reason, userId));
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<Map<String, Object>> payInvoice(
            @PathVariable("id") Long id,
            @RequestBody InvoiceDto.PayInvoiceRequest body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(invoiceService.payInvoice(id, body.getWallet_id(), userId));
    }

    @PostMapping("/{id}/items/{itemId}/toggle-paid")
    public ResponseEntity<Map<String, Object>> togglePaid(
            @PathVariable("id") Long id,
            @PathVariable("itemId") Long itemId) {
        return ResponseEntity.ok(invoiceService.toggleItemPaid(id, itemId));
    }
}
