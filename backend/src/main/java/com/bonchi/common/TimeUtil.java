package com.bonchi.common;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public class TimeUtil {
    public static final ZoneId PHNOM_PENH_ZONE = ZoneId.of("Asia/Phnom_Penh");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm:ss");

    private static final String[] KHMER_DAYS = {
            "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍", "អាទិត្យ"
    };

    private static final String[] KHMER_MONTHS = {
            "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
            "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
    };

    public static LocalDate today() {
        return LocalDate.now(PHNOM_PENH_ZONE);
    }

    public static LocalTime nowTime() {
        return LocalTime.now(PHNOM_PENH_ZONE);
    }

    public static LocalDateTime nowDateTime() {
        return LocalDateTime.now(PHNOM_PENH_ZONE);
    }

    public static String getPhnomPenhDate() {
        return today().format(DATE_FMT);
    }

    public static String getPhnomPenhTime() {
        return nowTime().format(TIME_FMT);
    }

    public static String getPhnomPenhDateTime() {
        return nowDateTime().toString();
    }

    public static String getPhnomPenhDateKhmer() {
        LocalDate now = today();
        int dayOfWeek = now.getDayOfWeek().getValue(); // 1 = Monday
        String dayName = KHMER_DAYS[dayOfWeek - 1];
        String monthName = KHMER_MONTHS[now.getMonthValue() - 1];
        return String.format("ថ្ងៃ%s ទី%02d ខែ%s ឆ្នាំ%d", dayName, now.getDayOfMonth(), monthName, now.getYear());
    }
}
