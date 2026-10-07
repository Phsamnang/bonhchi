package com.bonchi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

public class PayrollDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffPayload {
        private String name;
        private String phone;
        private String position;
        private Long user_id;
        private String joined_date;
        private String left_date;
        private Boolean is_active;
        private String salary_type;
        private BigDecimal base_rate;
        private String currency;
        private Integer standard_days;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceRecordItem {
        private Long staff_id;
        private String status;
        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceBatchPayload {
        private String date;
        private List<AttendanceRecordItem> records;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdvancePayload {
        private Long staff_id;
        private BigDecimal amount;
        private String currency;
        private String given_at;
        private Long wallet_id;
        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoanPayload {
        private Long staff_id;
        private BigDecimal amount;
        private String currency;
        private BigDecimal installment;
        private String given_at;
        private Long wallet_id;
        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreviewPayload {
        private String period_start;
        private String period_end;
        private String payout_date;
        private BigDecimal exchange_rate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRunPayload {
        private String title;
        private String period_start;
        private String period_end;
        private String payout_date;
        private BigDecimal exchange_rate;
        private String notes;
        private List<PayrollItemPayload> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayrollItemPayload {
        private Long staff_id;
        private Long contract_id;
        private String currency;
        private BigDecimal daily_rate;
        private BigDecimal days_counted;
        private BigDecimal days_override;
        private String override_reason;
        private Integer unrecorded_days;
        private BigDecimal gross;
        private BigDecimal allowance;
        private BigDecimal bonus;
        private BigDecimal penalty;
        private BigDecimal advances;
        private BigDecimal loan_deduction;
        private BigDecimal carry_in;
        private BigDecimal carry_out;
        private BigDecimal net;
        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayRunPaymentItem {
        private String currency;
        private Long wallet_id;
        private BigDecimal amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayRunPayload {
        private String wallet_id;
        private List<PayRunPaymentItem> payments;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VoidRunPayload {
        private String reason;
        private String void_reason;
    }
}
