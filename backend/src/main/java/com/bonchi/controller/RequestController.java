package com.bonchi.controller;

import com.bonchi.dto.RequestDto;
import com.bonchi.entity.MoneyRequest;
import com.bonchi.security.UserPrincipal;
import com.bonchi.service.RequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/money-requests")
@RequiredArgsConstructor
public class RequestController {

    private final RequestService requestService;

    @GetMapping
    public ResponseEntity<List<MoneyRequest>> getAll(@RequestParam(value = "status", required = false) String status) {
        return ResponseEntity.ok(requestService.getAll(status));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @RequestBody RequestDto.CreateRequestPayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(requestService.create(body, userId));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> approve(
            @PathVariable("id") Long id,
            @RequestBody(required = false) RequestDto.ApproveRequestPayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        String walletId = body != null ? body.getDisburse_wallet_id() : null;
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(requestService.approve(id, walletId, userId));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Map<String, Object>> reject(
            @PathVariable("id") Long id,
            @RequestBody(required = false) RequestDto.RejectRequestPayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        String reason = body != null ? body.getReason() : null;
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(requestService.reject(id, reason, userId));
    }

    @PostMapping("/{id}/distribute")
    public ResponseEntity<Map<String, Object>> distribute(
            @PathVariable("id") Long id,
            @RequestBody RequestDto.DistributePayload body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(requestService.distribute(id, body, userId));
    }
}
