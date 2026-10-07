package com.bonchi.controller;

import com.bonchi.dto.CountDto;
import com.bonchi.entity.WalletCount;
import com.bonchi.security.UserPrincipal;
import com.bonchi.service.CountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/wallet-counts")
@RequiredArgsConstructor
public class CountController {

    private final CountService countService;

    @GetMapping("/expected")
    public ResponseEntity<CountDto.ExpectedResponse> getExpected() {
        return ResponseEntity.ok(countService.getExpected());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> record(
            @RequestBody CountDto.RecordCountRequest body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(countService.recordCount(body, userId));
    }

    @GetMapping("/history")
    public ResponseEntity<List<WalletCount>> getHistory(
            @RequestParam(value = "limit", defaultValue = "50") int limit) {
        return ResponseEntity.ok(countService.getHistory(limit));
    }
}
