package com.bonchi.controller;

import com.bonchi.common.TimeUtil;
import com.bonchi.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(
            @RequestParam(value = "period", defaultValue = "today") String period) {
        return ResponseEntity.ok(reportService.getSummary(period));
    }

    @GetMapping("/items")
    public ResponseEntity<Map<String, Object>> getPurchasedItems(
            @RequestParam(value = "period", defaultValue = "today") String period) {
        return ResponseEntity.ok(reportService.getPurchasedItems(period));
    }

    @GetMapping("/daily-cashflow")
    public ResponseEntity<Map<String, Object>> getDailyCashflow(
            @RequestParam(value = "period", defaultValue = "today") String period) {
        return ResponseEntity.ok(reportService.getDailyCashflow(period));
    }

    /** FRD 14 — owner only: the report shows the restaurant's balance (profit), see FRD 01 / FRD 14 §8. */
    @GetMapping("/monthly")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> getMonthlyReport(
            @RequestParam(value = "month", required = false) String month) {
        String m = (month == null || month.isBlank())
                ? TimeUtil.today().toString().substring(0, 7)
                : month;
        return ResponseEntity.ok(reportService.getMonthlyReport(m));
    }

    @GetMapping("/export-card")
    public ResponseEntity<Map<String, Object>> getExportCard() {
        return ResponseEntity.ok(reportService.getExportCard());
    }
}
