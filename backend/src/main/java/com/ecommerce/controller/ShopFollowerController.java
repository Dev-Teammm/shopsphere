package com.ecommerce.controller;

import com.ecommerce.repository.UserRepository;
import com.ecommerce.service.ShopFollowerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shops")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Shop Follower", description = "APIs for following and unfollowing shops")
public class ShopFollowerController {

    private final ShopFollowerService shopFollowerService;
    private final UserRepository userRepository;

    @PostMapping("/{shopId}/follow")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'VENDOR', 'ADMIN', 'EMPLOYEE', 'DELIVERY_AGENT')")
    @Operation(summary = "Follow a shop", description = "Allow authenticated customers to follow a shop")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully followed the shop"),
            @ApiResponse(responseCode = "400", description = "Bad request - Shop not found or already following"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required")
    })
    public ResponseEntity<?> followShop(
            @PathVariable UUID shopId,
            Authentication authentication) {
        try {
            UUID userId = getCurrentUserId();
            shopFollowerService.followShop(shopId, userId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Successfully followed the shop");

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Error following shop: {}", e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            log.error("Unexpected error following shop", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to follow shop");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{shopId}/follow")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'VENDOR', 'ADMIN', 'EMPLOYEE', 'DELIVERY_AGENT')")
    @Operation(summary = "Unfollow a shop", description = "Allow authenticated users to unfollow a shop")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully unfollowed the shop"),
            @ApiResponse(responseCode = "400", description = "Bad request - Shop not found or not following"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required")
    })
    public ResponseEntity<?> unfollowShop(
            @PathVariable UUID shopId,
            Authentication authentication) {
        try {
            UUID userId = getCurrentUserId();
            shopFollowerService.unfollowShop(shopId, userId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Successfully unfollowed the shop");

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Error unfollowing shop: {}", e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            log.error("Unexpected error unfollowing shop", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to unfollow shop");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{shopId}/follow-status")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'VENDOR', 'ADMIN', 'EMPLOYEE', 'DELIVERY_AGENT')")
    @Operation(summary = "Check follow status", description = "Check if the current user follows a shop")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Follow status retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required")
    })
    public ResponseEntity<?> getFollowStatus(
            @PathVariable UUID shopId,
            Authentication authentication) {
        try {
            UUID userId = getCurrentUserId();
            boolean isFollowing = shopFollowerService.isFollowing(shopId, userId);
            long followerCount = shopFollowerService.getFollowerCount(shopId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("isFollowing", isFollowing);
            response.put("followerCount", followerCount);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting follow status", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to get follow status");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private UUID getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                throw new RuntimeException("User not authenticated");
            }

            Object principal = auth.getPrincipal();

            if (principal instanceof com.ecommerce.ServiceImpl.CustomUserDetails customUserDetails) {
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
}
