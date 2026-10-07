package com.bonchi.controller;

import com.bonchi.common.TimeUtil;
import com.bonchi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class RootController {

    private final UserRepository userRepository;

    @GetMapping("/")
    public Map<String, Object> welcome() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "Welcome to Bonchi Restaurant Income & Expense Management System API");
        resp.put("architecture", "Spring Boot 3 / Java 21 (Gradle, JPA & Spring Security)");
        resp.put("version", "2.0.0");

        Map<String, String> endpoints = new HashMap<>();
        endpoints.put("health", "/api/v1/health");
        endpoints.put("dashboard", "/api/v1/dashboard/summary");
        endpoints.put("invoices", "/api/v1/invoices");
        endpoints.put("wallets", "/api/v1/wallets");
        endpoints.put("wallet_counts", "/api/v1/wallet-counts");
        endpoints.put("reports", "/api/v1/reports/summary");
        endpoints.put("master", "/api/v1/master/products");
        endpoints.put("payroll", "/api/v1/payroll");
        resp.put("endpoints", endpoints);

        return resp;
    }

    @GetMapping({"/health", "/api/v1/health"})
    public Map<String, Object> health() {
        boolean dbOk = false;
        try {
            dbOk = (userRepository.count() >= 0);
        } catch (Exception ignored) {}

        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "ok");
        resp.put("database", dbOk ? "connected" : "disconnected");
        resp.put("timezone", "Asia/Phnom_Penh");
        resp.put("local_time", TimeUtil.getPhnomPenhDateTime());
        resp.put("timestamp", Instant.now().toString());
        return resp;
    }
}
