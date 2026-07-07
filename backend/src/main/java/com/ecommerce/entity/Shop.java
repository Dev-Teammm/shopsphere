package com.ecommerce.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import com.ecommerce.enums.ShopCapability;

@Entity
@Table(name = "shops")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Shop {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "shop_id", updatable = false, nullable = false)
    private UUID shopId;

    @NotBlank(message = "Shop name is required")
    @Size(min = 2, max = 100, message = "Shop name must be between 2 and 100 characters")
    @Column(name = "shop_name", nullable = false)
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "slug", unique = true, nullable = false)
    private String slug;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ShopStatus status = ShopStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonBackReference
    private User owner;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_category_id")
    @JsonBackReference
    private ShopCategory shopCategory;

    @Column(name = "rating")
    private Double rating = 0.0;

    @Column(name = "total_reviews")
    private Integer totalReviews = 0;

    @Column(name = "product_count")
    private Integer productCount = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "shop", fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<ShippingCost> shippingCosts;

    @OneToMany(mappedBy = "shop", fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<AdminInvitation> adminInvitations;

    @OneToMany(mappedBy = "shop", fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<User> employees;

    @OneToMany(mappedBy = "shop", fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<Discount> discounts;

    @OneToMany(mappedBy = "shop", fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<RewardSystem> rewardSystems;

    @OneToOne(mappedBy = "shop", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JsonManagedReference
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private StripeAccount stripeAccount;

    @OneToMany(mappedBy = "shop", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private List<ShopSubscription> subscriptions;

    @OneToMany(mappedBy = "shop", fetch = FetchType.LAZY)
    @JsonManagedReference
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private List<CapabilityTransition> capabilityTransitions;

    @Enumerated(EnumType.STRING)
    @Column(name = "primary_capability")
    private ShopCapability primaryCapability;

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "shop_capabilities", joinColumns = @JoinColumn(name = "shop_id"))
    @Column(name = "capability")
    private Set<ShopCapability> capabilities = new HashSet<>();
    
    // Packaging fee for pickup orders (default: 2.00 or 2% of subtotal, whichever is higher)
    @Column(name = "packaging_fee", precision = 10, scale = 2)
    private java.math.BigDecimal packagingFee;
    
    // Packaging fee percentage (default: 2.0)
    @Column(name = "packaging_fee_percentage", precision = 5, scale = 2)
    private java.math.BigDecimal packagingFeePercentage;
    
    // Packaging fee per kilogram (for weight-based calculation, default: 0.50 per kg)
    @Column(name = "packaging_fee_per_kg", precision = 10, scale = 2)
    private java.math.BigDecimal packagingFeePerKg;

    @Transient
    public boolean isShopActive() {
        // 1. Check if shop is marked active manually
        if (isActive != null && !isActive) {
            return false;
        }

        // 2. Check Stripe Account - required for shop to be active
        if (stripeAccount == null || 
            stripeAccount.getAccountStatus() != StripeAccount.AccountStatus.ACTIVE) {
            return false;
        }

        // Note: Subscription system check should be done at service layer
        // since we can't inject services into entity methods
        // This method checks basic requirements (Stripe account)
        return true;
    }
    
    @Transient
    public boolean hasValidSubscription() {
        if (subscriptions == null || subscriptions.isEmpty()) {
            return false;
        }
        
        return subscriptions.stream()
            .anyMatch(sub -> {
                // Check if subscription is valid (active and not expired)
                boolean isValid = sub.getStatus() == ShopSubscription.SubscriptionStatus.ACTIVE
                    && sub.getEndDate() != null
                    && sub.getEndDate().isAfter(java.time.LocalDateTime.now());
                
                return isValid;
            });
    }
    
    /**
     * Check if shop has an expired subscription (but still allows operations)
     * Expired subscriptions: products NOT visible, but operations continue
     */
    @Transient
    public boolean hasExpiredSubscription() {
        if (subscriptions == null || subscriptions.isEmpty()) {
            return false;
        }
        
        // Check if shop has any subscription that has expired
        return subscriptions.stream()
            .anyMatch(sub -> {
                return sub.getStatus() == ShopSubscription.SubscriptionStatus.ACTIVE
                    && sub.getEndDate() != null
                    && sub.getEndDate().isBefore(java.time.LocalDateTime.now());
            });
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (slug == null || slug.trim().isEmpty()) {
            slug = generateSlug(name);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    private String generateSlug(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .trim();
    }

    public boolean isActive() {
        return isActive != null ? isActive : true;
    }

    /**
     * Check if shop supports product visualization
     */
    public boolean supportsVisualization() {
        if (primaryCapability != null) {
            return primaryCapability == ShopCapability.VISUALIZATION_ONLY ||
                   primaryCapability == ShopCapability.PICKUP_ORDERS ||
                   primaryCapability == ShopCapability.FULL_ECOMMERCE ||
                   primaryCapability == ShopCapability.HYBRID;
        }
        return capabilities.contains(ShopCapability.VISUALIZATION_ONLY) ||
               capabilities.contains(ShopCapability.PICKUP_ORDERS) ||
               capabilities.contains(ShopCapability.FULL_ECOMMERCE) ||
               capabilities.contains(ShopCapability.HYBRID);
    }

    /**
     * Check if shop supports pickup orders (customer picks up at shop)
     */
    public boolean supportsPickupOrders() {
        if (primaryCapability != null) {
            return primaryCapability == ShopCapability.PICKUP_ORDERS ||
                   primaryCapability == ShopCapability.HYBRID;
        }
        return capabilities.contains(ShopCapability.PICKUP_ORDERS) ||
               capabilities.contains(ShopCapability.HYBRID);
    }

    /**
     * Check if shop supports delivery orders (with delivery agents)
     */
    public boolean supportsDelivery() {
        if (primaryCapability != null) {
            return primaryCapability == ShopCapability.FULL_ECOMMERCE ||
                   primaryCapability == ShopCapability.HYBRID;
        }
        return capabilities.contains(ShopCapability.FULL_ECOMMERCE) ||
               capabilities.contains(ShopCapability.HYBRID);
    }

    /**
     * Check if shop supports return requests
     */
    public boolean supportsReturns() {
        if (primaryCapability != null) {
            return primaryCapability == ShopCapability.PICKUP_ORDERS ||
                   primaryCapability == ShopCapability.FULL_ECOMMERCE ||
                   primaryCapability == ShopCapability.HYBRID;
        }
        return capabilities.contains(ShopCapability.PICKUP_ORDERS) ||
               capabilities.contains(ShopCapability.FULL_ECOMMERCE) ||
               capabilities.contains(ShopCapability.HYBRID);
    }

    /**
     * Check if shop requires delivery agents for orders/returns
     */
    public boolean requiresDeliveryAgent() {
        return supportsDelivery();
    }

    public enum ShopStatus {
        PENDING, ACTIVE, SUSPENDED, INACTIVE
    }
}
