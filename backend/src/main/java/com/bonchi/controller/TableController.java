package com.bonchi.controller;

import com.bonchi.dto.TableDto;
import com.bonchi.entity.RestaurantTable;
import com.bonchi.service.TableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TableController {

    private final TableService tableService;

    @GetMapping({"/api/v1/tables", "/api/v1/master/tables"})
    public ResponseEntity<List<RestaurantTable>> getTables() {
        return ResponseEntity.ok(tableService.getTables());
    }

    @GetMapping({"/api/v1/tables/{id}", "/api/v1/master/tables/{id}"})
    public ResponseEntity<RestaurantTable> getTableById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(tableService.getTableById(id));
    }

    @PostMapping({"/api/v1/tables", "/api/v1/master/tables"})
    public ResponseEntity<RestaurantTable> createTable(@RequestBody TableDto.TablePayload body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tableService.createTable(body));
    }

    @PutMapping({"/api/v1/tables/{id}", "/api/v1/master/tables/{id}"})
    public ResponseEntity<RestaurantTable> updateTable(@PathVariable("id") Long id, @RequestBody TableDto.TablePayload body) {
        return ResponseEntity.ok(tableService.updateTable(id, body));
    }

    @DeleteMapping({"/api/v1/tables/{id}", "/api/v1/master/tables/{id}"})
    public ResponseEntity<Void> deleteTable(@PathVariable("id") Long id) {
        tableService.deleteTable(id);
        return ResponseEntity.noContent().build();
    }
}
