package com.ecommerce.controller;

import com.ecommerce.dto.StripeAccountDTO;
import com.ecommerce.entity.StripeAccount;
import com.ecommerce.service.StripeAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stripe-accounts")
@Tag(name = "Stripe Account Management", description = "Endpoints for managing Stripe accounts for shops")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
public class StripeAccountController {

    private final StripeAccountService stripeAccountService;
    private final com.ecommerce.repository.UserRepository userRepository;
    private final com.ecommerce.service.ShopService shopService;

    @Autowired
    public StripeAccountController(StripeAccountService stripeAccountService,
            com.ecommerce.repository.UserRepository userRepository,
            com.ecommerce.service.ShopService shopService) {
        this.stripeAccountService = stripeAccountService;
        this.userRepository = userRepository;
        this.shopService = shopService;
    }

    private UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetails) {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            com.ecommerce.entity.User user = userRepository.findByUserEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return user.getId();
        }
        throw new RuntimeException("User not authenticated");
    }

    @PostMapping("/shops/{shopId}")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Create Stripe account for shop", description = "Create a new Stripe account for the specified shop")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Stripe account created successfully", content = @Content(schema = @Schema(implementation = StripeAccountDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "403", description = "Not authorized to create Stripe account for this shop"),
            @ApiResponse(responseCode = "409", description = "Shop already has a Stripe account")
    })
    public ResponseEntity<?> createStripeAccount(
            @Parameter(description = "Shop ID") @PathVariable UUID shopId,
            @Valid @RequestBody StripeAccountDTO stripeAccountDTO) {

        try {
            UUID userId = getCurrentUserId();
            log.info("Creating Stripe account for shop: {} by user: {}", shopId, userId);

            StripeAccountDTO result = stripeAccountService.createStripeAccount(shopId, stripeAccountDTO, userId);

            log.info("Successfully created Stripe account with ID: {} for shop: {}", result.getId(), shopId);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);

        } catch (Exception e) {
            log.error("Error creating Stripe account for shop {}: {}", shopId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/shops/{shopId}")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Update Stripe account for shop", description = "Update the Stripe account for the specified shop")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Stripe account updated successfully", content = @Content(schema = @Schema(implementation = StripeAccountDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "403", description = "Not authorized to update Stripe account for this shop"),
            @ApiResponse(responseCode = "404", description = "Stripe account not found")
    })
    public ResponseEntity<?> updateStripeAccount(
            @Parameter(description = "Shop ID") @PathVariable UUID shopId,
            @Valid @RequestBody StripeAccountDTO stripeAccountDTO) {

        try {
            UUID userId = getCurrentUserId();
            log.info("Updating Stripe account for shop: {} by user: {}", shopId, userId);

            StripeAccountDTO result = stripeAccountService.updateStripeAccount(shopId, stripeAccountDTO, userId);

            log.info("Successfully updated Stripe account for shop: {}", shopId);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error updating Stripe account for shop {}: {}", shopId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/shops/{shopId}")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Delete Stripe account for shop", description = "Delete the Stripe account for the specified shop")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Stripe account deleted successfully"),
            @ApiResponse(responseCode = "403", description = "Not authorized to delete Stripe account for this shop"),
            @ApiResponse(responseCode = "404", description = "Stripe account not found")
    })
    public ResponseEntity<?> deleteStripeAccount(
            @Parameter(description = "Shop ID") @PathVariable UUID shopId) {

        try {
            UUID userId = getCurrentUserId();
            log.info("Deleting Stripe account for shop: {} by user: {}", shopId, userId);

            stripeAccountService.deleteStripeAccount(shopId, userId);

            log.info("Successfully deleted Stripe account for shop: {}", shopId);
            return ResponseEntity.noContent().build();

        } catch (Exception e) {
            log.error("Error deleting Stripe account for shop {}: {}", shopId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/shops/{shopId}")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Get Stripe account for shop", description = "Retrieve the Stripe account for the specified shop")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Stripe account retrieved successfully", content = @Content(schema = @Schema(implementation = StripeAccountDTO.class))),
            @ApiResponse(responseCode = "403", description = "Not authorized to view Stripe account for this shop"),
            @ApiResponse(responseCode = "404", description = "Stripe account not found")
    })
    public ResponseEntity<?> getStripeAccountByShopId(
            @Parameter(description = "Shop ID") @PathVariable UUID shopId) {

        try {
            UUID userId = getCurrentUserId();
            log.info("Retrieving Stripe account for shop: {} by user: {}", shopId, userId);

            // Check if user owns the shop or is admin
            com.ecommerce.entity.User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (!user.getRole().equals(com.ecommerce.Enum.UserRole.ADMIN)) {
                // For non-admin users, check if they own the shop
                StripeAccountDTO account = stripeAccountService.getStripeAccountByShopId(shopId);
                if (!account.getShopId().equals(shopId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Not authorized to view this Stripe account"));
                }
            }

            StripeAccountDTO result = stripeAccountService.getStripeAccountByShopId(shopId);

            log.info("Successfully retrieved Stripe account for shop: {}", shopId);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error retrieving Stripe account for shop {}: {}", shopId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my-accounts")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Get my Stripe accounts", description = "Retrieve all Stripe accounts owned by the current user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Stripe accounts retrieved successfully", content = @Content(schema = @Schema(implementation = StripeAccountDTO.class)))
    })
    public ResponseEntity<?> getMyStripeAccounts() {

        try {
            UUID userId = getCurrentUserId();
            log.info("Retrieving Stripe accounts for user: {}", userId);

            List<StripeAccountDTO> result = stripeAccountService.getStripeAccountsByOwner(userId);

            log.info("Successfully retrieved {} Stripe accounts for user: {}", result.size(), userId);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error retrieving Stripe accounts for user: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{stripeAccountId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get Stripe account by ID", description = "Retrieve a Stripe account by its Stripe account ID (Admin only)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Stripe account retrieved successfully", content = @Content(schema = @Schema(implementation = StripeAccountDTO.class))),
            @ApiResponse(responseCode = "403", description = "Admin access required"),
            @ApiResponse(responseCode = "404", description = "Stripe account not found")
    })
    public ResponseEntity<?> getStripeAccountByStripeAccountId(
            @Parameter(description = "Stripe Account ID") @PathVariable String stripeAccountId) {

        try {
            log.info("Retrieving Stripe account with ID: {}", stripeAccountId);

            StripeAccountDTO result = stripeAccountService.getStripeAccountByStripeAccountId(stripeAccountId);

            log.info("Successfully retrieved Stripe account with ID: {}", stripeAccountId);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error retrieving Stripe account with ID {}: {}", stripeAccountId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/shops/{shopId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update account status", description = "Update the status of a Stripe account (Admin only)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Account status updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid status"),
            @ApiResponse(responseCode = "403", description = "Admin access required"),
            @ApiResponse(responseCode = "404", description = "Stripe account not found")
    })
    public ResponseEntity<?> updateAccountStatus(
            @Parameter(description = "Shop ID") @PathVariable UUID shopId,
            @RequestBody Map<String, String> requestBody) {

        try {
            String statusStr = requestBody.get("status");
            if (statusStr == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
            }

            StripeAccount.AccountStatus status;
            try {
                status = StripeAccount.AccountStatus.valueOf(statusStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid status: " + statusStr));
            }

            UUID userId = getCurrentUserId();
            log.info("Updating account status to {} for shop: {} by admin: {}", status, shopId, userId);

            stripeAccountService.updateAccountStatus(shopId, status, userId);

            log.info("Successfully updated account status for shop: {}", shopId);
            return ResponseEntity.ok(Map.of("message", "Account status updated successfully"));

        } catch (Exception e) {
            log.error("Error updating account status for shop {}: {}", shopId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/shops/{shopId}/exists")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Check if shop has Stripe account", description = "Check if the specified shop has a Stripe account configured")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Check completed successfully")
    })
    public ResponseEntity<?> hasStripeAccount(
            @Parameter(description = "Shop ID") @PathVariable UUID shopId) {

        try {
            boolean exists = stripeAccountService.hasStripeAccount(shopId);
            return ResponseEntity.ok(Map.of("hasStripeAccount", exists));

        } catch (Exception e) {
            log.error("Error checking Stripe account existence for shop {}: {}", shopId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/shops/{shopId}/connect")
    @PreAuthorize("hasRole('VENDOR')")
    @Operation(summary = "Connect Stripe account and activate shop", description = "Connect a Stripe account to the shop and activate it if it's in pending status")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Stripe account connected and shop activated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request or shop not in pending status"),
            @ApiResponse(responseCode = "403", description = "Not authorized to connect Stripe account for this shop"),
            @ApiResponse(responseCode = "409", description = "Shop already has a Stripe account")
    })
    public ResponseEntity<?> connectStripeAccount(
            @Parameter(description = "Shop ID") @PathVariable UUID shopId,
            @RequestBody StripeAccountDTO stripeAccountDTO) {

        try {
            UUID userId = getCurrentUserId();
            log.info("Connecting Stripe account for shop: {} by user: {}", shopId, userId);

            // Check if shop belongs to the user
            if (!shopService.isOwner(shopId, userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You are not authorized to connect Stripe account for this shop"));
            }

            // Check if shop already has a Stripe account
            if (stripeAccountService.hasStripeAccount(shopId)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Shop already has a Stripe account connected"));
            }

            // Create the Stripe account
            StripeAccountDTO createdAccount = stripeAccountService.createStripeAccount(shopId, stripeAccountDTO,
                    userId);

            // Activate the shop if it's in pending status
            try {
                shopService.activateShop(shopId, userId);
                log.info("Successfully activated shop: {} after Stripe account connection", shopId);
            } catch (Exception e) {
                log.warn("Could not activate shop {}: {}", shopId, e.getMessage());
                // Don't fail the request if activation fails, just log it
            }

            log.info("Successfully connected Stripe account for shop: {}", shopId);
            return ResponseEntity.ok(Map.of(
                    "message", "Stripe account connected successfully",
                    "stripeAccount", createdAccount,
                    "shopActivated", true));

        } catch (Exception e) {
            log.error("Error connecting Stripe account for shop {}: {}", shopId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}