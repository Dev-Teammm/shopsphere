package com.ecommerce.controller;

import com.ecommerce.dto.ShopCategoryDTO;
import com.ecommerce.service.ShopCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/shop-categories")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Shop Categories", description = "Endpoints for managing shop categories")
public class ShopCategoryController {

    private final ShopCategoryService shopCategoryService;

    @GetMapping("/search")
    @Operation(summary = "Search shop categories", description = "Search shop categories by name (partial match, case-insensitive)")
    public ResponseEntity<List<ShopCategoryDTO>> searchCategories(
            @RequestParam(required = false, defaultValue = "") String query) {
        try {
            List<ShopCategoryDTO> categories = shopCategoryService.searchCategories(query);
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            log.error("Error searching shop categories: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    @Operation(summary = "Get all active categories", description = "Get all active shop categories")
    public ResponseEntity<List<ShopCategoryDTO>> getAllActiveCategories() {
        try {
            List<ShopCategoryDTO> categories = shopCategoryService.getAllActiveCategories();
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            log.error("Error getting all active categories: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    @Operation(summary = "Create a new shop category", description = "Create a new shop category")
    public ResponseEntity<?> createCategory(
            @RequestParam String name,
            @RequestParam(required = false) String description) {
        try {
            ShopCategoryDTO category = shopCategoryService.createCategory(name, description);
            return ResponseEntity.status(HttpStatus.CREATED).body(category);
        } catch (IllegalArgumentException e) {
            log.error("Error creating category: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Error creating category: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get category by ID", description = "Get a shop category by its ID")
    public ResponseEntity<?> getCategoryById(@PathVariable Long id) {
        try {
            ShopCategoryDTO category = shopCategoryService.getCategoryById(id);
            return ResponseEntity.ok(category);
        } catch (jakarta.persistence.EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error getting category: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/paginated")
    @Operation(summary = "Get paginated active categories", description = "Get active shop categories with pagination")
    public ResponseEntity<?> getActiveCategoriesPaginated(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("name").ascending());
            org.springframework.data.domain.Page<ShopCategoryDTO> categories = shopCategoryService.getActiveCategoriesPaginated(pageable);
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            log.error("Error getting paginated categories: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
