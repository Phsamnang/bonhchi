package com.bonchi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public class WalletDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WalletResponse {
        private Long id;
        private String code;
        private String name_km;
        private String name_en;
        private String type;
        private String category;
        private String currency;
        private BigDecimal balance;
        private BigDecimal opening_balance;
        private BigDecimal current_balance;
        private BigDecimal usd;
        private BigDecimal khr;
        private BigDecimal opening_usd;
        private BigDecimal opening_khr;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateWalletRequest {
        private String code;
        private String name_km;
        private String name_en;
        private String type;
        private String category;
        private String currency;
        private BigDecimal opening_balance;
        private BigDecimal opening_usd;
        private BigDecimal opening_khr;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransferRequest {
        private String from_wallet_id;
        private String to_wallet_id;
        private BigDecimal amount;
        private String currency;
        private String note;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransferResponse {
        private Long id;
        private LocalDate transfer_date;
        private BigDecimal amount;
        private String currency;
        private String note;
        private String from_wallet;
        private String to_wallet;
        private OffsetDateTime created_at;
    }
}
