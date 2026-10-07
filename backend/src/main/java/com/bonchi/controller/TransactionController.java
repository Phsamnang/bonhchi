package com.bonchi.controller;

import com.bonchi.security.UserPrincipal;
import com.bonchi.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Every money in / out of the wallets (newest first). */
@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    /**
     * {@code from}/{@code to} = YYYY-MM-DD (default today), optional {@code wallet_id} (one or a comma list), {@code kind},
     * {@code direction} (in|out), {@code q} (search text), {@code page}, {@code limit} (max 200).
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to,
            @RequestParam(value = "wallet_id", required = false) java.util.List<Long> walletIds,
            @RequestParam(value = "kind", required = false) String kind,
            @RequestParam(value = "direction", required = false) String direction,
            @RequestParam(value = "q", required = false) String search,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "50") int limit,
            @AuthenticationPrincipal UserPrincipal user) {
        String role = user != null ? user.getRole() : "staff";
        return ResponseEntity.ok(transactionService.list(role, from, to, walletIds, kind, direction, search, page, limit));
    }
}
