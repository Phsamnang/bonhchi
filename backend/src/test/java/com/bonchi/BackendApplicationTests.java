package com.bonchi;

import com.bonchi.repository.PayrollRepository;
import com.bonchi.repository.ReportRepository;
import com.bonchi.service.PayrollService;
import com.bonchi.service.ReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
class BackendApplicationTests {

    @Autowired
    private org.springframework.test.web.servlet.MockMvc mockMvc;

    @Autowired
    private PayrollService payrollService;

    @Autowired
    private PayrollRepository payrollRepository;

    @Autowired
    private ReportService reportService;

    @Autowired
    private ReportRepository reportRepository;

    @Test
    void testAttendanceRange() {
        System.out.println("=== TESTING ATTENDANCE RANGE ===");
        Map<String, Object> result = payrollService.getAttendanceRange("2026-10-01", "2026-10-31");
        assertNotNull(result);
        System.out.println("Range keys: " + result.keySet());
        System.out.println("Staff count: " + ((List<?>) result.get("staff")).size());
        System.out.println("Records count: " + ((List<?>) result.get("records")).size());
    }

    @Test
    void testAttendanceSummary() {
        System.out.println("=== TESTING ATTENDANCE SUMMARY ===");
        List<Map<String, Object>> summary = payrollService.getAttendanceSummary("2026-10-01", "2026-10-31");
        assertNotNull(summary);
        System.out.println("Summary count: " + summary.size());
    }

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Test
    void testSnakeCaseSerialization() throws Exception {
        System.out.println("=== TESTING SNAKE_CASE SERIALIZATION ===");
        
        // 1. RestaurantTable entity
        com.bonchi.entity.RestaurantTable table = com.bonchi.entity.RestaurantTable.builder()
                .id(1L)
                .name("T-01")
                .sortOrder(5)
                .isActive(true)
                .build();
        String tableJson = objectMapper.writeValueAsString(table);
        System.out.println("RestaurantTable JSON: " + tableJson);
        org.junit.jupiter.api.Assertions.assertTrue(tableJson.contains("\"sort_order\":5"));
        org.junit.jupiter.api.Assertions.assertTrue(tableJson.contains("\"is_active\":true"));
        org.junit.jupiter.api.Assertions.assertFalse(tableJson.contains("\"sortOrder\""));

        // 2. User entity
        com.bonchi.entity.User user = com.bonchi.entity.User.builder()
                .id(10L)
                .username("testuser")
                .passwordHash("secret123")
                .isActive(true)
                .avatarUrl("http://avatar.png")
                .build();
        String userJson = objectMapper.writeValueAsString(user);
        System.out.println("User JSON: " + userJson);
        org.junit.jupiter.api.Assertions.assertTrue(userJson.contains("\"is_active\":true"));
        org.junit.jupiter.api.Assertions.assertTrue(userJson.contains("\"avatar_url\":"));
        org.junit.jupiter.api.Assertions.assertFalse(userJson.contains("\"password_hash\""));
        org.junit.jupiter.api.Assertions.assertFalse(userJson.contains("\"passwordHash\""));

        // 3. InvoiceListResponse
        com.bonchi.dto.InvoiceDto.InvoiceListResponse invoiceList = com.bonchi.dto.InvoiceDto.InvoiceListResponse.builder()
                .total(100)
                .page(1)
                .limit(20)
                .totalPages(5)
                .invoices(List.of())
                .build();
        String invoiceListJson = objectMapper.writeValueAsString(invoiceList);
        System.out.println("InvoiceList JSON: " + invoiceListJson);
        org.junit.jupiter.api.Assertions.assertTrue(invoiceListJson.contains("\"total_pages\":5"));
        org.junit.jupiter.api.Assertions.assertTrue(invoiceListJson.contains("\"totalPages\":5"));

        // 4. Report summary
        Map<String, Object> summary = reportService.getSummary("today");
        String summaryJson = objectMapper.writeValueAsString(summary);
        System.out.println("Report Summary JSON: " + summaryJson);
        org.junit.jupiter.api.Assertions.assertTrue(summaryJson.contains("\"owe_usd\":"));
        org.junit.jupiter.api.Assertions.assertTrue(summaryJson.contains("\"owe_khr\":"));
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "OWNER")
    void testHttpEndpointsSnakeCase() throws Exception {
        System.out.println("=== TESTING HTTP ENDPOINT SNAKE_CASE RESPONSES ===");

        // 1. Health endpoint (public)
        String healthJson = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/health"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
                .andReturn().getResponse().getContentAsString();
        System.out.println("GET /health HTTP response: " + healthJson);
        org.junit.jupiter.api.Assertions.assertTrue(healthJson.contains("\"local_time\":"));

        // 2. Tables endpoint (returns RestaurantTable list with sort_order and is_active)
        String tablesJson = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/tables"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
                .andReturn().getResponse().getContentAsString();
        System.out.println("GET /api/v1/tables HTTP response: " + tablesJson);
        if (tablesJson.contains("sort")) {
            org.junit.jupiter.api.Assertions.assertTrue(tablesJson.contains("\"sort_order\":"));
            org.junit.jupiter.api.Assertions.assertFalse(tablesJson.contains("\"sortOrder\""));
        }

        // 3. Reports summary
        String summaryJson = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/reports/summary"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
                .andReturn().getResponse().getContentAsString();
        System.out.println("GET /api/v1/reports/summary HTTP response: " + summaryJson);
        org.junit.jupiter.api.Assertions.assertTrue(summaryJson.contains("\"owe_usd\":"));
    }
}
