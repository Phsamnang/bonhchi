package com.bonchi.controller;

import com.bonchi.dto.MasterDto;
import com.bonchi.entity.Category;
import com.bonchi.entity.Product;
import com.bonchi.entity.Supplier;
import com.bonchi.service.MasterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master")
@RequiredArgsConstructor
public class MasterController {

    private final MasterService masterService;

    @GetMapping("/products")
    public ResponseEntity<Object> getProducts(
            @RequestParam(value = "supplier_id", required = false) Long supplierIdSnake,   // what the frontend sends
            @RequestParam(value = "supplierId", required = false) Long supplierIdCamel,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "limit", required = false) Integer limit) {
        if (page != null && page < 1) throw new IllegalArgumentException("page must be a positive integer");
        if (limit != null && limit < 1) throw new IllegalArgumentException("limit must be a positive integer");
        Long supplierId = supplierIdSnake != null ? supplierIdSnake : supplierIdCamel;
        return ResponseEntity.ok(masterService.getProducts(supplierId, search, page, limit));
    }

    @PostMapping("/products")
    public ResponseEntity<MasterDto.ProductView> createProduct(@RequestBody MasterDto.ProductPayload body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(masterService.createProduct(body));
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<MasterDto.ProductView> updateProduct(@PathVariable("id") Long id, @RequestBody MasterDto.ProductPayload body) {
        return ResponseEntity.ok(masterService.updateProduct(id, body));
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable("id") Long id) {
        masterService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/shops")
    public ResponseEntity<List<MasterDto.ShopView>> getShops() {
        return ResponseEntity.ok(masterService.getShops());
    }

    @GetMapping("/shops/{id}")
    public ResponseEntity<MasterDto.ShopView> getShopById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(masterService.getShopById(id));
    }

    @PostMapping("/shops")
    public ResponseEntity<MasterDto.ShopView> createShop(@RequestBody MasterDto.ShopPayload body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(masterService.createShop(body));
    }

    @PutMapping("/shops/{id}")
    public ResponseEntity<MasterDto.ShopView> updateShop(@PathVariable("id") Long id, @RequestBody MasterDto.ShopPayload body) {
        return ResponseEntity.ok(masterService.updateShop(id, body));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getCategories() {
        return ResponseEntity.ok(masterService.getCategories());
    }
}
