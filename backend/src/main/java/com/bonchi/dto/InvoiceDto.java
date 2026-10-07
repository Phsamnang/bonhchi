package com.bonchi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

public class InvoiceDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarketTripItemPayload {
        private String product_name;
        private BigDecimal quantity;
        private String unit;
        private BigDecimal unit_price;
        private String currency;
        private Boolean is_paid;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarketTripShopPayload {
        private String supplier_id;
        private String supplier_name;
        private String wallet_id;
        private String receipt_url;
        private List<MarketTripItemPayload> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarketTripPayload {
        private String trip_date;
        private String wallet_id;
        private Boolean is_paid;
        private List<MarketTripShopPayload> shops;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SmallExpensePayload {
        private String date;
        private BigDecimal amount;
        private String currency;
        private String category_name;
        private String wallet_code;
        private String wallet_id;
        private String receipt_url;
        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IncomePayload {
        private String date;
        private String time;
        private String table_name;
        private String wallet_code;
        private String wallet_id;
        private String usd_wallet_id;
        private String khr_wallet_id;
        private BigDecimal amount_usd;
        private BigDecimal amount_khr;
        private String source_name;
        private String category_name;
        private String reference_no;
        private String note;
        private String receipt_url;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VoidRequest {
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayInvoiceRequest {
        private String wallet_id;
    }

    /**
     * Invoice as the frontend reads it (hooks/useInvoices.ts `Invoice`): snake_case keys,
     * `date`/`time`/`category` names, money as numbers (USD 2 decimals, KHR whole riel).
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceView {
        private Long id;
        private String invoice_no;
        private String date;          // YYYY-MM-DD
        private String time;          // HH:mm:ss
        private String type;
        private String expense_kind;
        private String supplier_name;
        private String table_name;
        private String category;
        private String wallet_code;
        private Long wallet_id;
        private BigDecimal total_usd;
        private BigDecimal total_khr;
        private BigDecimal paid_usd;
        private BigDecimal paid_khr;
        private String status;
        private String void_reason;
        private String receipt_url;
        private String note;
        private OffsetDateTime created_at;
        private List<ItemView> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemView {
        private Long id;
        private String item_name;
        private BigDecimal quantity;
        private String unit;
        private BigDecimal unit_price;
        private String currency;
        private BigDecimal line_total;
        private Boolean is_paid;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceListResponse {
        private long total;
        private int page;
        private int limit;
        @com.fasterxml.jackson.annotation.JsonProperty("total_pages")
        private int totalPages;
        private List<?> invoices;

        @com.fasterxml.jackson.annotation.JsonProperty("totalPages")
        public int getTotalPagesCamel() {
            return totalPages;
        }
    }
}
