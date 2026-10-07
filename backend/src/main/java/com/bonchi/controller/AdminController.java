package com.bonchi.controller;

import com.bonchi.dto.AdminDto;
import com.bonchi.security.UserPrincipal;
import com.bonchi.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @PostMapping("/import-excel")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> importExcel(
            @RequestBody AdminDto.ImportExcelRequest body,
            @AuthenticationPrincipal UserPrincipal user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(adminService.importExcel(body, userId));
    }
}
