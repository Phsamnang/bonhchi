package com.bonchi.controller;

import com.bonchi.dto.WalletDto;
import com.bonchi.security.UserPrincipal;
import com.bonchi.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/api/v1/wallets")
    public ResponseEntity<List<WalletDto.WalletResponse>> getWallets(@AuthenticationPrincipal UserPrincipal user) {
        String role = user != null ? user.getRole() : "staff";
        return ResponseEntity.ok(walletService.getWallets(role));
    }

    @GetMapping({"/api/v1/wallets/transfers", "/api/v1/transfers"})
    public ResponseEntity<List<WalletDto.TransferResponse>> getTransfers(
            @RequestParam(value = "limit", defaultValue = "50") int limit) {
        return ResponseEntity.ok(walletService.getTransfers(limit));
    }

    @PostMapping({"/api/v1/wallets/transfers", "/api/v1/wallets/transfer", "/api/v1/transfers"})
    public ResponseEntity<WalletDto.TransferResponse> createTransfer(
            @RequestBody WalletDto.TransferRequest request,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(walletService.transfer(request, userId));
    }

    /** Liquidity totals per currency — must be declared before /wallets/{code} for readability (literal paths win anyway) */
    @GetMapping("/api/v1/wallets/summary")
    public ResponseEntity<java.util.Map<String, Object>> getSummary(@AuthenticationPrincipal UserPrincipal user) {
        String role = user != null ? user.getRole() : "staff";
        return ResponseEntity.ok(walletService.getLiquiditySummary(role));
    }

    @GetMapping("/api/v1/wallets/{code}")
    public ResponseEntity<WalletDto.WalletResponse> getWalletByCode(@PathVariable("code") String code) {
        return ResponseEntity.ok(walletService.getWallet(code));
    }

    @PostMapping("/api/v1/wallets")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<WalletDto.WalletResponse> createWallet(@RequestBody WalletDto.CreateWalletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(walletService.createWallet(request));
    }
}
