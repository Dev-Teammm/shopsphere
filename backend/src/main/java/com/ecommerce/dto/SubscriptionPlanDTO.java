package com.ecommerce.dto;

import lombok.Data;
import com.ecommerce.enums.ShopCapability;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

@Data
public class SubscriptionPlanDTO {
    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private String currency;
    private Integer durationInDays;
    private Boolean isActive;
    private Boolean isFreemium;
    private Integer maxProducts;
    private Integer maxWarehouses;
    private Integer maxEmployees;
    private Integer maxDeliveryAgents;
    private String featuresJson;
    private ShopCapability capability; // Keep for backward compatibility
    private Set<ShopCapability> allowedCapabilities; // New field for multiple capabilities
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // Additional field for shop-specific info
    private Boolean freemiumConsumed; // Only set when fetching plans for a specific shop
}
