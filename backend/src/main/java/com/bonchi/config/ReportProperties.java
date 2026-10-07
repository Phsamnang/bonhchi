package com.bonchi.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Report settings from {@code bonchi.reports.*} in application.yml.
 *
 * @param utilityCategories invoice category names reported as "utility" (FRD 14). They must match
 *                          the names the app stores on invoices; comparison ignores case and spaces.
 */
@ConfigurationProperties(prefix = "bonchi.reports")
public record ReportProperties(List<String> utilityCategories) {

    public ReportProperties {
        utilityCategories = utilityCategories == null ? List.of() : List.copyOf(utilityCategories);
    }
}
