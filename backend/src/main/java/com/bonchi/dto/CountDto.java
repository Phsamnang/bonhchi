package com.bonchi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

public class CountDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecordCountRequest {
        private String wallet_id;
        private String currency;
        private Map<String, Integer> denominations;
        private String reason_for_gap;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpectedResponse {
        private Map<String, BigDecimal> expected;
        private Map<String, BigDecimal> tolerance;
    }
}
