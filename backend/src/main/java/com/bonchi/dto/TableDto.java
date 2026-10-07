package com.bonchi.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class TableDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TablePayload {
        private String name;
        private String code;
        private Integer capacity;
        private String status;
        private Integer sort_order;
        private Boolean is_active;
    }
}
