package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO {
    private UUID productId;
    private String name;
    private String description;
    private String sku;
    private BigDecimal basePrice;
    private BigDecimal salePrice;
    private BigDecimal discountedPrice;
    private Integer stockQuantity;
    private Long categoryId;
    private String categoryName;
    private UUID brandId;
    private String brandName;
    private String slug;
    private Boolean isActive;
    private Boolean isFeatured;
    private Boolean isBestseller;
    private Boolean isNewArrival;
    private Boolean isOnSale;
    private Double averageRating;
    private Integer reviewCount;
    private List<ReviewDTO> reviews;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Product media
    private List<ProductImageDTO> images;
    private List<ProductVideoDTO> videos;

    // Product variants
    private List<ProductVariantDTO> variants;

    // Warehouse stock information
    private List<WarehouseStockDTO> warehouseStock;
    private Integer totalWarehouseStock;
    private Integer totalWarehouses;

    // Product details
    private String fullDescription;
    private BigDecimal weightKg;

    // Category-specific fields (Product-level - shared across all batches)
    private String storageInstructions;
    private String nutritionalInfo;
    private String shippingInfo;
    private String returnPolicy;
    private Integer maximumDaysForReturn;

    // Shop capability
    private com.ecommerce.enums.ShopCapability shopCapability;

    /** Whether the product is organic. */
    private Boolean organic;

    /** Unit of measure for display (e.g. kg, pc). */
    private UnitDTO unit;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductImageDTO {
        private Long imageId;
        private String url;
        private String altText;
        private Boolean isPrimary;
        private Integer sortOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductVideoDTO {
        private Long videoId;
        private String url;
        private String title;
        private String description;
        private Integer sortOrder;
        private Integer durationSeconds;
    }
}
