package com.bonchi.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

public class AdminDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExcelRow {
        private String date;
        private String vendor;
        private String item_name;
        private BigDecimal quantity;
        private String unit;
        private BigDecimal unit_price;
        private String currency;
        private String paid_from;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportExcelRequest {
        private List<ExcelRow> rows;
    }
}
