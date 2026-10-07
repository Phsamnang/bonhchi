package com.bonchi.service;

import com.bonchi.dto.TableDto;
import com.bonchi.entity.RestaurantTable;
import com.bonchi.repository.RestaurantTableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TableService {

    private final RestaurantTableRepository tableRepository;

    @Transactional(readOnly = true)
    public List<RestaurantTable> getTables() {
        return tableRepository.findByIsActiveTrueOrderBySortOrderAsc();
    }

    @Transactional(readOnly = true)
    public RestaurantTable getTableById(Long id) {
        return tableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + id));
    }

    @Transactional
    public RestaurantTable createTable(TableDto.TablePayload body) {
        if (body.getName() == null || body.getName().isBlank()) {
            throw new IllegalArgumentException("Table name is required");
        }

        RestaurantTable table = RestaurantTable.builder()
                .name(body.getName().trim())
                .code(body.getCode() != null ? body.getCode().trim() : null)
                .capacity(body.getCapacity())
                .status(body.getStatus() != null ? body.getStatus().trim() : "available")
                .sortOrder(body.getSort_order() != null ? body.getSort_order() : 0)
                .isActive(true)
                .build();

        return tableRepository.save(table);
    }

    @Transactional
    public RestaurantTable updateTable(Long id, TableDto.TablePayload body) {
        RestaurantTable table = tableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + id));

        if (body.getName() != null && !body.getName().isBlank()) table.setName(body.getName().trim());
        if (body.getCode() != null) table.setCode(body.getCode().trim());
        if (body.getCapacity() != null) table.setCapacity(body.getCapacity());
        if (body.getStatus() != null) table.setStatus(body.getStatus().trim());
        if (body.getSort_order() != null) table.setSortOrder(body.getSort_order());
        if (body.getIs_active() != null) table.setIsActive(body.getIs_active());

        return tableRepository.save(table);
    }

    @Transactional
    public void deleteTable(Long id) {
        RestaurantTable table = tableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + id));
        table.setIsActive(false);
        tableRepository.save(table);
    }
}
