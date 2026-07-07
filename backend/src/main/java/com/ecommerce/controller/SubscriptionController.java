package com.ecommerce.controller;

import com.ecommerce.dto.ShopSubscriptionDTO;
import com.ecommerce.dto.SubscriptionPlanDTO;
import com.ecommerce.enums.ShopCapability;
import com.ecommerce.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Subscription Management", description = "Endpoints for managing subscriptions and plans")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    // --- Admin Endpoints for Plans ---

    @PostMapping("/plans")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new subscription plan", description = "Admin only")
    public ResponseEntity<?> createPlan(@RequestBody SubscriptionPlanDTO planDTO) {
        try {
            return ResponseEntity.ok(subscriptionService.createPlan(planDTO));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/plans/{planId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a subscription plan", description = "Admin only")
    public ResponseEntity<?> updatePlan(@PathVariable Long planId, @RequestBody SubscriptionPlanDTO planDTO) {
        try {
            return ResponseEntity.ok(subscriptionService.updatePlan(planId, planDTO));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/plans/{planId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a subscription plan", description = "Admin only")
    public ResponseEntity<?> deletePlan(@PathVariable Long planId) {
        try {
            subscriptionService.deletePlan(planId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- Public/Shared Endpoints for Plans ---

    @GetMapping("/plans")
    @Operation(summary = "Get all plans", description = "List all subscription plans")
    public ResponseEntity<?> getAllPlans(
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly,
            @RequestParam(required = false) UUID shopId) {
        try {
            if (activeOnly && shopId != null) {
                // Return plans with shop-specific info (freemium consumed status)
                return ResponseEntity.ok(subscriptionService.getActivePlansForShop(shopId));
            } else if (activeOnly) {
                return ResponseEntity.ok(subscriptionService.getActivePlans());
            }
            return ResponseEntity.ok(subscriptionService.getAllPlans());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/plans/{planId}")
    @Operation(summary = "Get plan by ID")
    public ResponseEntity<?> getPlanById(@PathVariable Long planId) {
        try {
            return ResponseEntity.ok(subscriptionService.getPlanById(planId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/plans/by-capability/{capability}")
    @Operation(summary = "Get plans by capability", description = "Get all plans for a specific capability")
    public ResponseEntity<?> getPlansByCapability(
            @PathVariable String capability,
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        try {
            ShopCapability shopCapability = ShopCapability.valueOf(capability.toUpperCase());
            if (activeOnly) {
                return ResponseEntity.ok(subscriptionService.getActivePlansByCapability(shopCapability));
            }
            return ResponseEntity.ok(subscriptionService.getPlansByCapability(shopCapability));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid capability: " + capability);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- Shop Subscription Endpoints ---

    @PostMapping("/subscribe")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Subscribe a shop to a freemium plan", description = "For freemium plans only - creates subscription immediately")
    public ResponseEntity<?> subscribeShop(
            @RequestParam UUID shopId,
            @RequestParam Long planId,
            @RequestParam(required = false, defaultValue = "false") Boolean autoRenew) {
        try {
            return ResponseEntity.ok(subscriptionService.subscribeShop(shopId, planId, autoRenew));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/checkout")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Create Stripe checkout session for paid subscription", description = "Returns Stripe checkout URL")
    public ResponseEntity<?> createCheckoutSession(
            @RequestParam UUID shopId,
            @RequestParam Long planId,
            @RequestParam(required = false, defaultValue = "web") String platform) {
        try {
            String checkoutUrl = subscriptionService.createSubscriptionCheckoutSession(shopId, planId, platform);
            return ResponseEntity.ok(Map.of("checkoutUrl", checkoutUrl));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/verify-payment")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Verify subscription payment", description = "Verify Stripe payment and activate subscription")
    public ResponseEntity<?> verifyPayment(@RequestParam String sessionId) {
        try {
            return ResponseEntity.ok(subscriptionService.verifySubscriptionPayment(sessionId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/toggle-auto-renew")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Toggle auto-renew for subscription", description = "Enable or disable auto-renewal")
    public ResponseEntity<?> toggleAutoRenew(
            @RequestParam UUID shopId,
            @RequestParam Boolean autoRenew) {
        try {
            subscriptionService.toggleAutoRenew(shopId, autoRenew);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/has-consumed-freemium/{shopId}")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Check if shop has consumed freemium", description = "Returns true if shop has used freemium before")
    public ResponseEntity<?> hasConsumedFreemium(@PathVariable UUID shopId) {
        try {
            return ResponseEntity.ok(Map.of("hasConsumedFreemium", subscriptionService.hasConsumedFreemium(shopId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/renew")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Renew current subscription", description = "Extend current subscription")
    public ResponseEntity<?> renewSubscription(@RequestParam UUID shopId) {
        try {
            return ResponseEntity.ok(subscriptionService.renewSubscription(shopId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/cancel")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Cancel subscription", description = "Cancel current subscription")
    public ResponseEntity<?> cancelSubscription(@RequestParam UUID shopId) {
        try {
            subscriptionService.cancelSubscription(shopId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/active/{shopId}")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Get active subscription", description = "Get currently active subscription for a shop")
    public ResponseEntity<?> getActiveSubscription(@PathVariable UUID shopId) {
        try {
            return ResponseEntity.ok(subscriptionService.getActiveSubscription(shopId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/history/{shopId}")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    @Operation(summary = "Get subscription history", description = "Get all past/present subscriptions for a shop")
    public ResponseEntity<?> getSubscriptionHistory(@PathVariable UUID shopId) {
        try {
            return ResponseEntity.ok(subscriptionService.getSubscriptionHistory(shopId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- System Configuration (Admin) ---

    @GetMapping("/config/enabled")
    @Operation(summary = "Check if subscription system is enabled")
    public ResponseEntity<?> isSubscriptionEnabled() {
        try {
            return ResponseEntity.ok(subscriptionService.isSubscriptionEnabled());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/config/enabled")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Enable/Disable subscription system", description = "Admin only")
    public ResponseEntity<?> setSubscriptionEnabled(@RequestParam boolean enabled) {
        try {
            subscriptionService.setSubscriptionEnabled(enabled);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/config/shop-registration-enabled")
    @Operation(summary = "Check if shop registration is enabled")
    public ResponseEntity<?> isShopRegistrationEnabled() {
        try {
            return ResponseEntity.ok(subscriptionService.isShopRegistrationEnabled());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/config/shop-registration-enabled")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Enable/Disable shop registration", description = "Admin only - Controls whether new shops can be registered")
    public ResponseEntity<?> setShopRegistrationEnabled(@RequestParam boolean enabled) {
        try {
            subscriptionService.setShopRegistrationEnabled(enabled);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
