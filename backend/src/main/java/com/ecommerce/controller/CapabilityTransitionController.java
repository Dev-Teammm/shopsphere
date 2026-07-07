package com.ecommerce.controller;

import com.ecommerce.dto.CapabilityTransitionDTO;
import com.ecommerce.Exception.CustomException;
import com.ecommerce.enums.ShopCapability;
import com.ecommerce.service.CapabilityTransitionService;
import com.ecommerce.service.ShopAuthorizationService;
import com.ecommerce.repository.ShopRepository;
import com.ecommerce.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/capability-transitions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Capability Transitions", description = "Manage shop capability transitions")
public class CapabilityTransitionController {

    private final CapabilityTransitionService capabilityTransitionService;
    private final ShopAuthorizationService shopAuthorizationService;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;

    @PostMapping("/request")
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    @Operation(summary = "Request capability transition", 
               description = "Request a capability change for a shop. If pending operations exist, creates a transition.")
    @ApiResponse(responseCode = "200", description = "Transition requested successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request")
    @ApiResponse(responseCode = "403", description = "Forbidden")
    public ResponseEntity<?> requestTransition(
            @RequestParam UUID shopId,
            @RequestParam ShopCapability newCapability,
            Authentication authentication) {
        try {
            UUID userId = getCurrentUserId(authentication);
            
            // Check authorization (vendor must own shop, admin can do anything)
            shopAuthorizationService.assertCanManageShop(userId, shopId);
            
            CapabilityTransitionDTO transition = capabilityTransitionService.requestCapabilityTransition(shopId, newCapability);
            
            if (transition != null) {
                return ResponseEntity.ok(transition);
            } else {
                return ResponseEntity.ok(Map.of("message", "Capability changed immediately. No pending operations found.", "success", true));
            }
        } catch (CustomException e) {
            log.error("Error requesting capability transition: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage(), "success", false));
        } catch (Exception e) {
            log.error("Unexpected error requesting capability transition: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to request transition", "success", false));
        }
    }

    @GetMapping("/active/{shopId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    @Operation(summary = "Get active transition for shop")
    @ApiResponse(responseCode = "200", description = "Transition found")
    public ResponseEntity<?> getActiveTransition(
            @PathVariable UUID shopId,
            Authentication authentication) {
        try {
            UUID userId = getCurrentUserId(authentication);
            shopAuthorizationService.assertCanManageShop(userId, shopId);
            
            CapabilityTransitionDTO transition = capabilityTransitionService.getActiveTransition(shopId);
            
            if (transition != null) {
                return ResponseEntity.ok(transition);
            } else {
                return ResponseEntity.ok(Map.of("message", "No active transition", "success", true));
            }
        } catch (Exception e) {
            log.error("Error getting active transition: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to get transition", "success", false));
        }
    }

    @PostMapping("/cancel/{shopId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    @Operation(summary = "Cancel active transition")
    @ApiResponse(responseCode = "200", description = "Transition cancelled")
    public ResponseEntity<?> cancelTransition(
            @PathVariable UUID shopId,
            @RequestParam(required = false) String reason,
            Authentication authentication) {
        try {
            UUID userId = getCurrentUserId(authentication);
            shopAuthorizationService.assertCanManageShop(userId, shopId);
            
            capabilityTransitionService.cancelTransition(shopId, reason);
            
            return ResponseEntity.ok(Map.of("message", "Transition cancelled successfully", "success", true));
        } catch (CustomException e) {
            log.error("Error cancelling transition: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage(), "success", false));
        } catch (Exception e) {
            log.error("Unexpected error cancelling transition: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to cancel transition", "success", false));
        }
    }

    @GetMapping("/pending-operations/{shopId}")
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    @Operation(summary = "Get pending operations count for capability transition")
    @ApiResponse(responseCode = "200", description = "Pending operations count")
    public ResponseEntity<?> getPendingOperations(
            @PathVariable UUID shopId,
            @RequestParam ShopCapability newCapability,
            Authentication authentication) {
        try {
            UUID userId = getCurrentUserId(authentication);
            shopAuthorizationService.assertCanManageShop(userId, shopId);
            
            com.ecommerce.entity.Shop shop = shopRepository.findById(shopId)
                    .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Shop not found"));
            
            ShopCapability currentCapability = shop.getPrimaryCapability();
            if (currentCapability == null) {
                return ResponseEntity.ok(Map.of(
                    "pendingOrders", 0,
                    "pendingReturns", 0,
                    "pendingAppeals", 0,
                    "pendingDeliveries", 0,
                    "total", 0
                ));
            }
            
            CapabilityTransitionService.PendingOperationsCount pendingOps = 
                capabilityTransitionService.countPendingOperations(shopId, currentCapability, newCapability);
            
            return ResponseEntity.ok(Map.of(
                "pendingOrders", pendingOps.getPendingOrders(),
                "pendingReturns", pendingOps.getPendingReturns(),
                "pendingAppeals", pendingOps.getPendingAppeals(),
                "pendingDeliveries", pendingOps.getPendingDeliveries(),
                "total", pendingOps.getTotal()
            ));
        } catch (Exception e) {
            log.error("Error getting pending operations: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to get pending operations", "success", false));
        }
    }

    /**
     * Get current user ID from Authentication object
     * Handles cases where getName() returns email instead of UUID
     */
    private UUID getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }

        Object principal = authentication.getPrincipal();

        // Handle CustomUserDetails (JWT tokens)
        if (principal instanceof com.ecommerce.ServiceImpl.CustomUserDetails customUserDetails) {
            String email = customUserDetails.getUsername();
            return userRepository.findByUserEmail(email)
                    .map(com.ecommerce.entity.User::getId)
                    .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
        }

        // Handle User entity
        if (principal instanceof com.ecommerce.entity.User user && user.getId() != null) {
            return user.getId();
        }

        // Handle UserDetails
        if (principal instanceof UserDetails userDetails) {
            String email = userDetails.getUsername();
            return userRepository.findByUserEmail(email)
                    .map(com.ecommerce.entity.User::getId)
                    .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
        }

        // Fallback to auth name (which might be email)
        String name = authentication.getName();
        if (name != null && !name.isBlank()) {
            // Try to parse as UUID first
            try {
                return UUID.fromString(name);
            } catch (IllegalArgumentException e) {
                // If not a UUID, treat as email
                return userRepository.findByUserEmail(name)
                        .map(com.ecommerce.entity.User::getId)
                        .orElseThrow(() -> new RuntimeException("User not found with email: " + name));
            }
        }

        throw new RuntimeException("Unable to get current user ID");
    }
}
