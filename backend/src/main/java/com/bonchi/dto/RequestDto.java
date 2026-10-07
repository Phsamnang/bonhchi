package com.bonchi.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

public class RequestDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequestPayload {
        private BigDecimal amount;
        private String currency;
        private String reason;
        private Long category_id;
        private Long requested_by;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApproveRequestPayload {
        private String disburse_wallet_id;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RejectRequestPayload {
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DistributionItem {
        private String recipient_name;
        private BigDecimal amount;
        private String currency;
        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DistributePayload {
        private List<DistributionItem> distributions;
    }
}
