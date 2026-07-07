package com.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import com.ecommerce.enums.ShopCapability;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;

@Entity
@Table(name = "subscription_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_id")
    private Long id;

    @Column(name = "name", nullable = false, unique = true)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "price", nullable = false)
    private BigDecimal price;

    @Column(name = "currency")
    private String currency = "RWF";

    @Column(name = "duration_days", nullable = false)
    private Integer durationInDays; // e.g., 30 for monthly, 365 for yearly

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "is_freemium")
    private Boolean isFreemium = false;

    // Feature Limits
    @Column(name = "max_products")
    private Integer maxProducts; // -1 for unlimited

    @Column(name = "max_warehouses")
    private Integer maxWarehouses;

    @Column(name = "max_employees")
    private Integer maxEmployees;

    @Column(name = "max_delivery_agents")
    private Integer maxDeliveryAgents;

    @Column(name = "features_json", columnDefinition = "TEXT")
    private String featuresJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "capability", nullable = false)
    private ShopCapability capability; // Keep for backward compatibility

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "subscription_plan_capabilities", joinColumns = @JoinColumn(name = "plan_id"))
    @Column(name = "capability")
    private Set<ShopCapability> allowedCapabilities = new HashSet<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
