package com.ecommerce.controller;

import com.ecommerce.dto.StockBatchDTO;
import com.ecommerce.dto.CreateStockBatchRequest;
import com.ecommerce.dto.CreateVariantBatchRequest;
import com.ecommerce.dto.UpdateStockBatchRequest;
import com.ecommerce.service.StockBatchService;
import com.ecommerce.service.ShopAuthorizationService;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.repository.ProductVariantRepository;
import com.ecommerce.repository.StockRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.entity.ProductVariant;
import com.ecommerce.Enum.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import com.ecommerce.ServiceImpl.CustomUserDetails;
import jakarta.persistence.EntityNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stock-batches")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Stock Batch Management", description = "APIs for managing stock batches")
@SecurityRequirement(name = "bearerAuth")
public class StockBatchController {

    private final StockBatchService stockBatchService;
    private final ShopAuthorizationService shopAuthorizationService;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;
    private final StockRepository stockRepository;
    private final ProductRepository productRepository;

    @PostMapping("/variant/{variantId}/warehouse/{warehouseId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Create a new stock batch for variant", description = "Create a new stock batch for a specific variant and warehouse", responses = {
            @ApiResponse(responseCode = "201", description = "Stock batch created successfully", content = @Content(schema = @Schema(implementation = StockBatchDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input data"),
            @ApiResponse(responseCode = "404", description = "Variant or warehouse not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Not authorized to access this variant's shop"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> createStockBatchForVariant(
            @PathVariable Long variantId,
            @PathVariable Long warehouseId,
            @Valid @RequestBody CreateVariantBatchRequest request) {
        try {
            log.info("Creating stock batch for variant ID: {} and warehouse ID: {}", variantId, warehouseId);
            
            // For VENDOR and EMPLOYEE, validate shop access
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                UserRole userRole = getCurrentUserRole();
                if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                    // Get variant to access its product and shop
                    ProductVariant variant = productVariantRepository.findById(variantId)
                            .orElseThrow(() -> new EntityNotFoundException("Product variant not found with ID: " + variantId));
                    
                    if (variant.getProduct() != null && variant.getProduct().getShop() != null) {
                        UUID currentUserId = getCurrentUserId();
                        UUID shopId = variant.getProduct().getShop().getShopId();
                        shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
                    }
                }
            }
            
            StockBatchDTO stockBatch = stockBatchService.createStockBatchForVariant(variantId, warehouseId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(stockBatch);
        } catch (EntityNotFoundException e) {
            log.error("Product variant not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("VARIANT_NOT_FOUND", e.getMessage()));
        } catch (com.ecommerce.Exception.CustomException e) {
            log.error("Authorization error: {}", e.getMessage());
            Map<String, Object> errorResponse = Map.of(
                    "success", false,
                    "message", e.getMessage(),
                    "error", e.getMessage(),
                    "status", HttpStatus.BAD_REQUEST.value(),
                    "timestamp", System.currentTimeMillis()
            );
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (IllegalArgumentException e) {
            log.error("Validation error creating stock batch: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            log.error("Error creating stock batch: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to create stock batch"));
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Create a new stock batch", description = "Create a new stock batch for a specific stock entry", responses = {
            @ApiResponse(responseCode = "201", description = "Stock batch created successfully", content = @Content(schema = @Schema(implementation = StockBatchDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input data"),
            @ApiResponse(responseCode = "404", description = "Stock entry not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Not authorized to access this stock's shop"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> createStockBatch(@Valid @RequestBody CreateStockBatchRequest request) {
        try {
            log.info("Creating stock batch for stock ID: {}", request.getStockId());
            
            // For VENDOR and EMPLOYEE, validate shop access
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                UserRole userRole = getCurrentUserRole();
                if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                    // Get stock to access its product/variant and shop
                    com.ecommerce.entity.Stock stock = stockRepository.findById(request.getStockId())
                            .orElseThrow(() -> new EntityNotFoundException("Stock not found with ID: " + request.getStockId()));
                    
                    UUID shopId = null;
                    if (stock.getProductVariant() != null && stock.getProductVariant().getProduct() != null 
                            && stock.getProductVariant().getProduct().getShop() != null) {
                        shopId = stock.getProductVariant().getProduct().getShop().getShopId();
                    } else if (stock.getProduct() != null && stock.getProduct().getShop() != null) {
                        shopId = stock.getProduct().getShop().getShopId();
                    }
                    
                    if (shopId != null) {
                        UUID currentUserId = getCurrentUserId();
                        shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
                    }
                }
            }
            
            StockBatchDTO stockBatch = stockBatchService.createStockBatch(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(stockBatch);
        } catch (EntityNotFoundException e) {
            log.error("Stock not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("STOCK_NOT_FOUND", e.getMessage()));
        } catch (com.ecommerce.Exception.CustomException e) {
            log.error("Authorization error: {}", e.getMessage());
            Map<String, Object> errorResponse = Map.of(
                    "success", false,
                    "message", e.getMessage(),
                    "error", e.getMessage(),
                    "status", HttpStatus.BAD_REQUEST.value(),
                    "timestamp", System.currentTimeMillis()
            );
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (IllegalArgumentException e) {
            log.error("Validation error creating stock batch: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            log.error("Error creating stock batch: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to create stock batch"));
        }
    }

    @GetMapping("/stock/{stockId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Get all batches for a stock entry", description = "Retrieve all stock batches for a specific stock entry", responses = {
            @ApiResponse(responseCode = "200", description = "Stock batches retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Stock entry not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Not authorized to access this stock's shop"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> getStockBatchesByStockId(@PathVariable Long stockId) {
        try {
            log.info("Retrieving stock batches for stock ID: {}", stockId);
            
            // For VENDOR and EMPLOYEE, validate shop access
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                UserRole userRole = getCurrentUserRole();
                if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                    // Get stock to access its product/variant and shop
                    com.ecommerce.entity.Stock stock = stockRepository.findById(stockId)
                            .orElseThrow(() -> new EntityNotFoundException("Stock not found with ID: " + stockId));
                    
                    UUID shopId = null;
                    if (stock.getProductVariant() != null && stock.getProductVariant().getProduct() != null 
                            && stock.getProductVariant().getProduct().getShop() != null) {
                        shopId = stock.getProductVariant().getProduct().getShop().getShopId();
                    } else if (stock.getProduct() != null && stock.getProduct().getShop() != null) {
                        shopId = stock.getProduct().getShop().getShopId();
                    }
                    
                    if (shopId != null) {
                        UUID currentUserId = getCurrentUserId();
                        shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
                    }
                }
            }
            
            List<StockBatchDTO> batches = stockBatchService.getStockBatchesByStockId(stockId);
            return ResponseEntity.ok(batches);
        } catch (EntityNotFoundException e) {
            log.error("Stock not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("STOCK_NOT_FOUND", e.getMessage()));
        } catch (com.ecommerce.Exception.CustomException e) {
            log.error("Authorization error: {}", e.getMessage());
            Map<String, Object> errorResponse = Map.of(
                    "success", false,
                    "message", e.getMessage(),
                    "error", e.getMessage(),
                    "status", HttpStatus.BAD_REQUEST.value(),
                    "timestamp", System.currentTimeMillis()
            );
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (IllegalArgumentException e) {
            log.error("Stock not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("STOCK_NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            log.error("Error retrieving stock batches: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to retrieve stock batches"));
        }
    }

    @GetMapping("/product/{productId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Get all batches for a product", description = "Retrieve all stock batches for a specific product across all warehouses", responses = {
            @ApiResponse(responseCode = "200", description = "Stock batches retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Product not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Not authorized to access this product's shop"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> getStockBatchesByProductId(@PathVariable UUID productId) {
        try {
            log.info("Retrieving stock batches for product ID: {}", productId);
            
            // For VENDOR and EMPLOYEE, validate shop access
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                UserRole userRole = getCurrentUserRole();
                if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                    // Get product to access its shop
                    com.ecommerce.entity.Product product = productRepository.findById(productId)
                            .orElseThrow(() -> new EntityNotFoundException("Product not found with ID: " + productId));
                    
                    if (product.getShop() != null) {
                        UUID currentUserId = getCurrentUserId();
                        UUID shopId = product.getShop().getShopId();
                        shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
                    }
                }
            }
            
            List<StockBatchDTO> batches = stockBatchService.getStockBatchesByProductId(productId);
            return ResponseEntity.ok(batches);
        } catch (EntityNotFoundException e) {
            log.error("Product not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("PRODUCT_NOT_FOUND", e.getMessage()));
        } catch (com.ecommerce.Exception.CustomException e) {
            log.error("Authorization error: {}", e.getMessage());
            Map<String, Object> errorResponse = Map.of(
                    "success", false,
                    "message", e.getMessage(),
                    "error", e.getMessage(),
                    "status", HttpStatus.BAD_REQUEST.value(),
                    "timestamp", System.currentTimeMillis()
            );
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (IllegalArgumentException e) {
            log.error("Product not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("PRODUCT_NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            log.error("Error retrieving stock batches: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to retrieve stock batches"));
        }
    }

    @GetMapping("/variant/{variantId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE', 'VENDOR')")
    @Operation(summary = "Get all batches for a product variant", description = "Retrieve all stock batches for a specific product variant across all warehouses", responses = {
            @ApiResponse(responseCode = "200", description = "Stock batches retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Product variant not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Not authorized to access this variant's shop"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> getStockBatchesByVariantId(@PathVariable Long variantId) {
        try {
            log.info("Retrieving stock batches for variant ID: {}", variantId);
            
            // For VENDOR and EMPLOYEE, validate shop access
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                UserRole userRole = getCurrentUserRole();
                if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                    // Get variant to access its product and shop
                    ProductVariant variant = productVariantRepository.findById(variantId)
                            .orElseThrow(() -> new EntityNotFoundException("Product variant not found with ID: " + variantId));
                    
                    if (variant.getProduct() != null && variant.getProduct().getShop() != null) {
                        UUID currentUserId = getCurrentUserId();
                        UUID shopId = variant.getProduct().getShop().getShopId();
                        shopAuthorizationService.assertCanManageShop(currentUserId, shopId);
                    }
                }
            }
            
            List<StockBatchDTO> batches = stockBatchService.getStockBatchesByVariantId(variantId);
            return ResponseEntity.ok(batches);
        } catch (EntityNotFoundException e) {
            log.error("Product variant not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("VARIANT_NOT_FOUND", e.getMessage()));
        } catch (com.ecommerce.Exception.CustomException e) {
            log.error("Authorization error: {}", e.getMessage());
            Map<String, Object> errorResponse = Map.of(
                    "success", false,
                    "message", e.getMessage(),
                    "error", e.getMessage(),
                    "status", HttpStatus.BAD_REQUEST.value(),
                    "timestamp", System.currentTimeMillis()
            );
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (IllegalArgumentException e) {
            log.error("Product variant not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("VARIANT_NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            log.error("Error retrieving stock batches: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to retrieve stock batches"));
        }
    }
    
    private UUID getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                throw new RuntimeException("User not authenticated");
            }

            Object principal = auth.getPrincipal();

            if (principal instanceof CustomUserDetails customUserDetails) {
                String email = customUserDetails.getUsername();
                return userRepository.findByUserEmail(email)
                        .map(com.ecommerce.entity.User::getId)
                        .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
            }

            if (principal instanceof com.ecommerce.entity.User user && user.getId() != null) {
                return user.getId();
            }

            if (principal instanceof UserDetails userDetails) {
                String email = userDetails.getUsername();
                return userRepository.findByUserEmail(email)
                        .map(com.ecommerce.entity.User::getId)
                        .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
            }

            String name = auth.getName();
            if (name != null && !name.isBlank()) {
                return userRepository.findByUserEmail(name)
                        .map(com.ecommerce.entity.User::getId)
                        .orElseThrow(() -> new RuntimeException("User not found with email: " + name));
            }
        } catch (Exception e) {
            log.error("Error getting current user ID: {}", e.getMessage(), e);
            throw new RuntimeException("Unable to get current user ID: " + e.getMessage());
        }
        throw new RuntimeException("Unable to get current user ID");
    }
    
    private UserRole getCurrentUserRole() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return null;
            }

            return auth.getAuthorities().stream()
                    .map(authority -> {
                        String authorityName = authority.getAuthority();
                        if (authorityName.contains("VENDOR")) {
                            return UserRole.VENDOR;
                        } else if (authorityName.contains("VENDOR")) {
                            return UserRole.VENDOR;
                        } else if (authorityName.contains("EMPLOYEE")) {
                            return UserRole.EMPLOYEE;
                        } else if (authorityName.contains("DELIVERY_AGENT")) {
                            return UserRole.DELIVERY_AGENT;
                        } else if (authorityName.contains("CUSTOMER")) {
                            return UserRole.CUSTOMER;
                        }
                        return null;
                    })
                    .filter(role -> role != null)
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            log.error("Error getting current user role: {}", e.getMessage(), e);
            return null;
        }
    }

    @GetMapping("/{batchId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE')")
    @Operation(summary = "Get stock batch by ID", description = "Retrieve a specific stock batch by its ID", responses = {
            @ApiResponse(responseCode = "200", description = "Stock batch retrieved successfully", content = @Content(schema = @Schema(implementation = StockBatchDTO.class))),
            @ApiResponse(responseCode = "404", description = "Stock batch not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> getStockBatchById(@PathVariable Long batchId) {
        try {
            log.info("Retrieving stock batch with ID: {}", batchId);
            StockBatchDTO stockBatch = stockBatchService.getStockBatchById(batchId);
            return ResponseEntity.ok(stockBatch);
        } catch (IllegalArgumentException e) {
            log.error("Stock batch not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("BATCH_NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            log.error("Error retrieving stock batch: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to retrieve stock batch"));
        }
    }

    @PutMapping("/{batchId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE')")
    @Operation(summary = "Update stock batch", description = "Update an existing stock batch", responses = {
            @ApiResponse(responseCode = "200", description = "Stock batch updated successfully", content = @Content(schema = @Schema(implementation = StockBatchDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input data"),
            @ApiResponse(responseCode = "404", description = "Stock batch not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> updateStockBatch(@PathVariable Long batchId,
            @Valid @RequestBody UpdateStockBatchRequest request) {
        try {
            log.info("Updating stock batch with ID: {}", batchId);
            StockBatchDTO stockBatch = stockBatchService.updateStockBatch(batchId, request);
            return ResponseEntity.ok(stockBatch);
        } catch (IllegalArgumentException e) {
            log.error("Validation error updating stock batch: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("VALIDATION_ERROR", e.getMessage()));
        } catch (Exception e) {
            log.error("Error updating stock batch: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to update stock batch"));
        }
    }

    @DeleteMapping("/{batchId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE')")
    @Operation(summary = "Delete stock batch", description = "Delete a stock batch", responses = {
            @ApiResponse(responseCode = "200", description = "Stock batch deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Stock batch not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> deleteStockBatch(@PathVariable Long batchId) {
        try {
            log.info("Deleting stock batch with ID: {}", batchId);
            stockBatchService.deleteStockBatch(batchId);

            Map<String, Object> response = Map.of(
                    "success", true,
                    "message", "Stock batch deleted successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Stock batch not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("BATCH_NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            log.error("Error deleting stock batch: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to delete stock batch"));
        }
    }

    @PostMapping("/{batchId}/recall")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE')")
    @Operation(summary = "Recall stock batch", description = "Recall a stock batch due to quality issues or safety concerns", responses = {
            @ApiResponse(responseCode = "200", description = "Stock batch recalled successfully", content = @Content(schema = @Schema(implementation = StockBatchDTO.class))),
            @ApiResponse(responseCode = "404", description = "Stock batch not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> recallStockBatch(@PathVariable Long batchId,
            @RequestParam(required = false) String reason) {
        try {
            log.info("Recalling stock batch with ID: {}", batchId);
            StockBatchDTO stockBatch = stockBatchService.recallStockBatch(batchId, reason);
            return ResponseEntity.ok(stockBatch);
        } catch (IllegalArgumentException e) {
            log.error("Stock batch not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("BATCH_NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            log.error("Error recalling stock batch: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to recall stock batch"));
        }
    }

    @GetMapping("/expiring-soon")
    @PreAuthorize("hasAnyRole('VENDOR', 'EMPLOYEE')")
    @Operation(summary = "Get batches expiring soon", description = "Retrieve batches that are expiring within a specified number of days", responses = {
            @ApiResponse(responseCode = "200", description = "Expiring batches retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<?> getBatchesExpiringSoon(@RequestParam(defaultValue = "30") int daysThreshold) {
        try {
            log.info("Retrieving batches expiring within {} days", daysThreshold);
            List<StockBatchDTO> batches = stockBatchService.getBatchesExpiringSoon(daysThreshold);
            return ResponseEntity.ok(batches);
        } catch (Exception e) {
            log.error("Error retrieving expiring batches: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("INTERNAL_ERROR", "Failed to retrieve expiring batches"));
        }
    }

    private Map<String, Object> createErrorResponse(String errorCode, String message) {
        return Map.of(
                "error", errorCode,
                "message", message,
                "timestamp", java.time.LocalDateTime.now());
    }
}