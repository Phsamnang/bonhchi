package com.bonchi.service;

import com.bonchi.dto.MasterDto;
import com.bonchi.entity.Category;
import com.bonchi.entity.Product;
import com.bonchi.entity.Supplier;
import com.bonchi.repository.CategoryRepository;
import com.bonchi.repository.ProductRepository;
import com.bonchi.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import java.util.Set;
import java.util.Map;
import java.util.HashSet;
import java.util.HashMap;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MasterService {

    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final CategoryRepository categoryRepository;

    /**
     * Without page/limit: plain array of all active products (legacy callers).
     * With page and/or limit: { total, page, limit, totalPages, products } — sorted name, id so pages are stable.
     */
    @Transactional(readOnly = true)
    public Object getProducts(Long supplierId, String search, Integer page, Integer limit) {
        String cleanSearch = search != null && !search.isBlank() ? search.trim() : null;

        if (page == null && limit == null) {
            List<Product> all;
            if (supplierId != null && cleanSearch != null) {
                all = productRepository.findBySupplierIdAndNameContainingIgnoreCaseAndIsActiveTrueOrderByNameAsc(supplierId, cleanSearch);
            } else if (supplierId != null) {
                all = productRepository.findBySupplierIdAndIsActiveTrueOrderByNameAsc(supplierId);
            } else if (cleanSearch != null) {
                all = productRepository.findByNameContainingIgnoreCaseAndIsActiveTrueOrderByNameAsc(cleanSearch);
            } else {
                all = productRepository.findByIsActiveTrueOrderByNameAsc();
            }
            return toProductViews(all);
        }

        int pageNum = page != null ? page : 1;
        int pageSize = limit != null ? Math.min(100, limit) : 20;
        PageRequest pageRequest = PageRequest.of(pageNum - 1, pageSize, Sort.by("name").ascending().and(Sort.by("id")));

        Page<Product> paged;
        if (supplierId != null && cleanSearch != null) {
            paged = productRepository.findBySupplierIdAndNameContainingIgnoreCaseAndIsActiveTrue(supplierId, cleanSearch, pageRequest);
        } else if (supplierId != null) {
            paged = productRepository.findBySupplierIdAndIsActiveTrue(supplierId, pageRequest);
        } else if (cleanSearch != null) {
            paged = productRepository.findByNameContainingIgnoreCaseAndIsActiveTrue(cleanSearch, pageRequest);
        } else {
            paged = productRepository.findByIsActiveTrue(pageRequest);
        }

        return MasterDto.PagedProductsResponse.builder()
                .total(paged.getTotalElements())
                .page(pageNum)
                .limit(pageSize)
                .totalPages(Math.max(1, paged.getTotalPages()))
                .products(toProductViews(paged.getContent()))
                .build();
    }

    @Transactional
    public MasterDto.ProductView createProduct(MasterDto.ProductPayload body) {
        if (body.getName() == null || body.getName().isBlank() || body.getUnit() == null || body.getUnit().isBlank()) {
            throw new IllegalArgumentException("Product name and unit are required");
        }
        String name = body.getName().trim();
        assertNameFree(name, body.getSupplier_id(), null);

        Product product = Product.builder()
                .name(name)
                .defaultUnit(body.getUnit().trim())
                .defaultUnitPrice(body.getPrice() != null ? body.getPrice() : BigDecimal.ZERO)
                .defaultCurrency("KHR".equalsIgnoreCase(body.getCur()) ? "KHR" : "USD")
                .supplierId(body.getSupplier_id())
                .categoryId(body.getCategory_id())
                .isActive(true)
                .build();

        return toProductViews(List.of(productRepository.save(product))).get(0);
    }

    @Transactional
    public MasterDto.ProductView updateProduct(Long id, MasterDto.ProductPayload body) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));

        String newName = body.getName() != null ? body.getName().trim() : p.getName();
        Long newSupplier = body.getSupplier_id() != null ? body.getSupplier_id() : p.getSupplierId();
        assertNameFree(newName, newSupplier, p.getId());

        p.setName(newName);
        if (body.getUnit() != null) p.setDefaultUnit(body.getUnit().trim());
        if (body.getPrice() != null) p.setDefaultUnitPrice(body.getPrice());
        if (body.getCur() != null) p.setDefaultCurrency("KHR".equalsIgnoreCase(body.getCur()) ? "KHR" : "USD");
        if (body.getSupplier_id() != null) p.setSupplierId(body.getSupplier_id());
        if (body.getCategory_id() != null) p.setCategoryId(body.getCategory_id());

        return toProductViews(List.of(productRepository.save(p))).get(0);
    }

    /**
     * One product name → one supplier (decided with the owner, see SPRING_BOOT_BACKEND_SPEC §6.2).
     * Also blocks a duplicate under the same supplier.
     */
    private void assertNameFree(String name, Long supplierId, Long selfId) {
        for (Product other : productRepository.findByNameIgnoreCaseAndIsActiveTrue(name)) {
            if (other.getId().equals(selfId)) continue;
            boolean sameSupplier = java.util.Objects.equals(other.getSupplierId(), supplierId);
            String owner = other.getSupplierId() != null
                    ? supplierRepository.findById(other.getSupplierId()).map(Supplier::getName).orElse("ហាងផ្សេង")
                    : "គ្មានហាង";
            throw new IllegalArgumentException(sameSupplier
                    ? "ទំនិញ \"" + name + "\" មានរួចហើយក្នុងហាងនេះ"
                    : "ទំនិញ \"" + name + "\" មានរួចហើយនៅហាង " + owner + " (ទំនិញមួយ ត្រូវមានតែហាងមួយ)");
        }
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
        p.setIsActive(false);
        productRepository.save(p);
    }

    @Transactional(readOnly = true)
    public List<MasterDto.ShopView> getShops() {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : productRepository.countActiveBySupplier()) {
            counts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return supplierRepository.findByIsActiveTrueOrderByCreatedAtDesc().stream()
                .map(s -> toShopView(s, counts.getOrDefault(s.getId(), 0L), null))
                .toList();
    }

    @Transactional(readOnly = true)
    public MasterDto.ShopView getShopById(Long id) {
        Supplier s = supplierRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found: " + id));
        List<MasterDto.ProductView> products = toProductViews(productRepository.findBySupplierIdAndIsActiveTrueOrderByNameAsc(id));
        return toShopView(s, (long) products.size(), products);
    }

    @Transactional
    public MasterDto.ShopView createShop(MasterDto.ShopPayload body) {
        if (body.getName() == null || body.getName().isBlank()) {
            throw new IllegalArgumentException("Shop name is required");
        }

        Supplier supplier = Supplier.builder()
                .name(body.getName().trim())
                .marketLocation(body.getMarket_location())
                .contactPhone(body.getContact_phone())
                .note(body.getNote())
                .isActive(true)
                .build();

        return toShopView(supplierRepository.save(supplier), 0L, null);
    }

    @Transactional
    public MasterDto.ShopView updateShop(Long id, MasterDto.ShopPayload body) {
        Supplier s = supplierRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found: " + id));

        if (body.getName() != null) s.setName(body.getName().trim());
        if (body.getMarket_location() != null) s.setMarketLocation(body.getMarket_location());
        if (body.getContact_phone() != null) s.setContactPhone(body.getContact_phone());
        if (body.getNote() != null) s.setNote(body.getNote());

        Supplier saved = supplierRepository.save(s);
        long count = productRepository.findBySupplierIdAndIsActiveTrueOrderByNameAsc(id).size();
        return toShopView(saved, count, null);
    }

    // ─── mapping ────────────────────────────────────────────────────────────────

    /** Products → frontend shape; supplier names resolved in one query */
    private List<MasterDto.ProductView> toProductViews(List<Product> products) {
        Set<Long> supplierIds = new HashSet<>();
        for (Product p : products) if (p.getSupplierId() != null) supplierIds.add(p.getSupplierId());
        Map<Long, String> names = new HashMap<>();
        if (!supplierIds.isEmpty()) {
            for (Supplier s : supplierRepository.findAllById(supplierIds)) names.put(s.getId(), s.getName());
        }
        return products.stream().map(p -> MasterDto.ProductView.builder()
                .id(p.getId())
                .name(p.getName())
                .unit(p.getDefaultUnit())
                .price(p.getDefaultUnitPrice() != null ? p.getDefaultUnitPrice() : BigDecimal.ZERO)
                .cur(p.getDefaultCurrency() != null ? p.getDefaultCurrency() : "USD")
                .supplier_id(p.getSupplierId())
                .supplier_name(p.getSupplierId() != null ? names.get(p.getSupplierId()) : null)
                .is_active(p.getIsActive())
                .build()).toList();
    }

    private static MasterDto.ShopView toShopView(Supplier s, Long productCount, List<MasterDto.ProductView> products) {
        return MasterDto.ShopView.builder()
                .id(s.getId())
                .name(s.getName())
                .market_location(s.getMarketLocation())
                .contact_phone(s.getContactPhone())
                .note(s.getNote())
                .is_active(s.getIsActive())
                .product_count(productCount)
                .products(products)
                .build();
    }

    @Transactional(readOnly = true)
    public List<Category> getCategories() {
        return categoryRepository.findByIsActiveTrue();
    }
}
