package com.bonchi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

public class MasterDto {

    /** Product as the frontend reads it: short keys unit / price / cur, plus the supplier's name */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductView {
        private Long id;
        private String name;
        private String unit;
        private BigDecimal price;
        private String cur;
        private Long supplier_id;
        private String supplier_name;
        private Boolean is_active;
    }

    /** Supplier (shop) as the frontend reads it; `products` only on GET /shops/{id} */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShopView {
        private Long id;
        private String name;
        private String market_location;
        private String contact_phone;
        private String note;
        private Boolean is_active;
        private Long product_count;
        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
        private java.util.List<ProductView> products;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductPayload {
        private String name;
        private String unit;
        private BigDecimal price;
        private String cur;
        private Long supplier_id;
        private Long category_id;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShopPayload {
        private String name;
        private String market_location;
        private String contact_phone;
        private String note;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PagedProductsResponse {
        private long total;
        private int page;
        private int limit;
        @com.fasterxml.jackson.annotation.JsonProperty("total_pages")
        private int totalPages;
        private Object products;

        @com.fasterxml.jackson.annotation.JsonProperty("totalPages")
        public int getTotalPagesCamel() {
            return totalPages;
        }
    }
}
