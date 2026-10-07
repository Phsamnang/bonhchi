package com.bonchi.controller;

import com.bonchi.dto.PayrollDto;
import com.bonchi.security.UserPrincipal;
import com.bonchi.service.PayrollService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService payrollService;

    // Staff Directory
    @GetMapping("/staff")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getStaff(
            @RequestParam(value = "include_inactive", defaultValue = "false") boolean includeInactive,
            @AuthenticationPrincipal UserPrincipal user) {
        String role = user != null ? user.getRole() : "manager";
        List<Map<String, Object>> list = payrollService.getStaff(includeInactive, role);
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("staff", list);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/staff")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> createStaff(
            @RequestBody PayrollDto.StaffPayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(payrollService.createStaff(body, userId));
    }

    @PutMapping("/staff/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> updateStaff(
            @PathVariable("id") Long id,
            @RequestBody PayrollDto.StaffPayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(payrollService.updateStaff(id, body, userId));
    }

    // Attendance
    @GetMapping("/attendance")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getAttendanceForDate(
            @RequestParam(value = "date", required = false) String date) {
        String effectiveDate = date != null && !date.isBlank() ? date : com.bonchi.common.TimeUtil.getPhnomPenhDate();
        List<Map<String, Object>> data = payrollService.getAttendanceForDate(effectiveDate);
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("date", effectiveDate);
        resp.put("attendance", data);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/attendance/range")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getAttendanceRange(
            @RequestParam(value = "start", required = false) String start,
            @RequestParam(value = "start_date", required = false) String startDate,
            @RequestParam(value = "end", required = false) String end,
            @RequestParam(value = "end_date", required = false) String endDate) {
        String effectiveStart = start != null && !start.isBlank() ? start : startDate;
        String effectiveEnd = end != null && !end.isBlank() ? end : endDate;
        if (effectiveStart == null || effectiveEnd == null) {
            throw new IllegalArgumentException("start and end date are required");
        }
        return ResponseEntity.ok(payrollService.getAttendanceRange(effectiveStart, effectiveEnd));
    }

    @GetMapping("/attendance/summary")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getAttendanceSummary(
            @RequestParam(value = "start", required = false) String start,
            @RequestParam(value = "start_date", required = false) String startDate,
            @RequestParam(value = "end", required = false) String end,
            @RequestParam(value = "end_date", required = false) String endDate) {
        String effectiveStart = start != null && !start.isBlank() ? start : startDate;
        String effectiveEnd = end != null && !end.isBlank() ? end : endDate;
        if (effectiveStart == null || effectiveEnd == null) {
            throw new IllegalArgumentException("start and end date are required");
        }
        List<Map<String, Object>> summary = payrollService.getAttendanceSummary(effectiveStart, effectiveEnd);
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("summary", summary);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/attendance/batch")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> saveAttendanceBatch(
            @RequestBody PayrollDto.AttendanceBatchPayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(payrollService.saveAttendanceBatch(body, userId));
    }

    // Advances
    @GetMapping("/advances")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getAdvances(
            @RequestParam(value = "staff_id", required = false) Long staffId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to) {
        List<Map<String, Object>> list = payrollService.getAdvances(staffId, status, from, to);
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("advances", list);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/advances")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> createAdvance(
            @RequestBody PayrollDto.AdvancePayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(payrollService.createAdvance(body, userId));
    }

    @PostMapping("/advances/{id}/void")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> voidAdvance(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(payrollService.voidAdvance(id, userId));
    }

    // Payroll Runs
    @PostMapping("/runs/preview")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> previewPayroll(
            @RequestBody PayrollDto.PreviewPayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Map<String, Object> preview = payrollService.previewPayroll(body);
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("preview", preview);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/runs")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> getRuns() {
        List<Map<String, Object>> runs = payrollService.getRuns();
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("runs", runs);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/runs/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> getRunById(@PathVariable("id") Long id) {
        Map<String, Object> run = payrollService.getRunById(id);
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("run", run);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/runs")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> createRun(
            @RequestBody PayrollDto.CreateRunPayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        Map<String, Object> run = payrollService.createRun(body, userId);
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("run", run);
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    @PostMapping("/runs/{id}/pay")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> payRun(
            @PathVariable("id") Long id,
            @RequestBody(required = false) PayrollDto.PayRunPayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        Map<String, Object> run = payrollService.payPayrollRun(id, body, userId);
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("run", run);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/runs/{id}/void")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> voidRun(
            @PathVariable("id") Long id,
            @RequestBody(required = false) PayrollDto.VoidRunPayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        String reason = body != null ? (body.getVoid_reason() != null ? body.getVoid_reason() : body.getReason()) : null;
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(payrollService.voidRun(id, reason, userId));
    }
}
