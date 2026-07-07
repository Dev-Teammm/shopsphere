package com.ecommerce.dto;

import com.ecommerce.entity.Shop;
import com.ecommerce.enums.ShopCapability;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShopDTO {

    private UUID shopId;

    @NotBlank(message = "Shop name is required")
    @Size(min = 2, max = 100, message = "Shop name must be between 2 and 100 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    private String slug;

    private String logoUrl;

    private Shop.ShopStatus status;

    private UUID ownerId;

    private String ownerName;

    private String ownerEmail;

    private String contactEmail;

    private String contactPhone;

    private String address;

    private Boolean isActive;
    private Boolean isTrulyActive;

    private String category; // Keep for backward compatibility during migration
    private Long shopCategoryId; // New category relationship
    private String shopCategoryName; // New category name

    private ShopCapability primaryCapability;

    private Set<ShopCapability> capabilities;

    private Double rating;

    private Integer totalReviews;

    private Long productCount;

    private Long followerCount; // Number of followers

    private Boolean isFollowing; // Whether current user follows this shop

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private StripeAccountDTO stripeAccount;
}
