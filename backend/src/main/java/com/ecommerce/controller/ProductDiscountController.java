package com.ecommerce.controller;

import com.ecommerce.dto.AssignDiscountRequest;
import com.ecommerce.dto.RemoveDiscountRequest;
import com.ecommerce.service.ProductDiscountService;
import com.ecommerce.service.ShopAuthorizationService;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.Enum.UserRole;
import com.ecommerce.entity.Product;
import com.ecommerce.entity.ProductVariant;
import com.ecommerce.entity.Discount;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.ProductVariantRepository;
import com.ecommerce.repository.DiscountRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import com.ecommerce.ServiceImpl.CustomUserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Slf4j
public class ProductDiscountController {

    private final ProductDiscountService productDiscountService;
    private final ShopAuthorizationService shopAuthorizationService;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final DiscountRepository discountRepository;

    @PostMapping("/discount/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'VENDOR', 'EMPLOYEE')")
    public ResponseEntity<Map<String, Object>> assignDiscount(
            @Valid @RequestBody AssignDiscountRequest request) {
        try {
            log.info("Assigning discount {} to products/variants", request.getDiscountId());

            // Get current user and role
            UUID currentUserId = getCurrentUserId();
            UserRole userRole = getCurrentUserRole();

            // Get discount to check shop
            Discount discount = discountRepository.findByDiscountId(request.getDiscountId())
                    .orElseThrow(() -> new IllegalArgumentException("Discount not found with ID: " + request.getDiscountId()));

            // For VENDOR and EMPLOYEE, validate shop access
            if (userRole == UserRole.VENDOR || userRole == UserRole.EMPLOYEE) {
                if (discount.getShop() == null) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                            "error", "ACCESS_DENIED",
                            "message", "Discount does not belong to a shop"));
                }
                shopAuthorizationService.assertCanManageShop(currentUserId, discount.getShop().getShopId());

                // Validate that all products/variants belong to the same shop as the discount
                if (request.getProductIds() != null && !request.getProductIds().isEmpty()) {
                    for (String productId : request.getProductIds()) {
                        Product product = productRepository.findByProductId(productId)
                                .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + productId));
                        
                        if (product.getShop() == null || !product.getShop().getShopId().equals(discount.getShop().getShopId())) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                                    "error", "ACCESS_DENIED",
                                    "message", "Product " + productId + " does not belong to the same shop as the discount"));
                        }
                    }
                }

                if (request.getVariantIds() != null && !request.getVariantIds().isEmpty()) {
                    for (String variantIdStr : request.getVariantIds()) {
                        Long variantId = Long.parseLong(variantIdStr);
                        ProductVariant variant = productVariantRepository.findById(variantId)
                                .orElseThrow(() -> new IllegalArgumentException("Variant not found with ID: " + variantId));
                        
                        if (variant.getProduct() == null || variant.getProduct().getShop() == null ||
                                !variant.getProduct().getShop().getShopId().equals(discount.getShop().getShopId())) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                                    "error", "ACCESS_DENIED",
                                    "message", "Variant " + variantId + " does not belong to the same shop as the discount"));
                        }
                    }
                }
            }

            productDiscountService.assignDiscount(request);

            return ResponseEntity.ok(Map.of(
                    "message", "Discount assigned successfully",
                    "discountId", request.getDiscountId(),
                    "productCount", request.getProductIds() != null ? request.getProductIds().size() : 0,
                    "variantCount", request.getVariantIds() != null ? request.getVariantIds().size() : 0));
        } catch (com.ecommerce.Exception.CustomException e) {
            log.error("Authorization error assigning discount: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "ACCESS_DENIED",
                    "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error assigning discount: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Failed to assign discount",
                    "message", e.getMessage()));
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
                        if (authorityName.contains("ADMIN")) {
                            return UserRole.ADMIN;
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

    @DeleteMapping("/discount/remove")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> removeDiscount(
            @Valid @RequestBody RemoveDiscountRequest request) {
        try {
            log.info("Removing discount from products/variants");

            productDiscountService.removeDiscount(request);

            return ResponseEntity.ok(Map.of(
                    "message", "Discount removed successfully",
                    "productCount", request.getProductIds() != null ? request.getProductIds().size() : 0,
                    "variantCount", request.getVariantIds() != null ? request.getVariantIds().size() : 0));
        } catch (Exception e) {
            log.error("Error removing discount: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Failed to remove discount",
                    "message", e.getMessage()));
        }
    }

    @GetMapping("/discount/{discountId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<Map<String, Object>>> getProductsByDiscount(
            @PathVariable String discountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            log.info("Getting products with discount {}", discountId);

            Pageable pageable = PageRequest.of(page, size);
            Page<Map<String, Object>> products = productDiscountService.getProductsByDiscount(discountId, pageable);

            return ResponseEntity.ok(products);
        } catch (Exception e) {
            log.error("Error getting products by discount: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{productId}/discount-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getProductDiscountStatus(
            @PathVariable String productId) {
        try {
            log.info("Getting discount status for product {}", productId);

            Map<String, Object> status = productDiscountService.getProductDiscountStatus(productId);

            return ResponseEntity.ok(status);
        } catch (Exception e) {
            log.error("Error getting product discount status: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Failed to get discount status",
                    "message", e.getMessage()));
        }
    }
}
