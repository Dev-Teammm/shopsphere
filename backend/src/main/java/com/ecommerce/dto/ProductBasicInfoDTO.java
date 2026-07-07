package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

import com.ecommerce.dto.UnitDTO;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductBasicInfoDTO {
    private UUID productId;
    private String productName;
    private String shortDescription;
    private String description;
    private String sku;
    private String slug;
    private BigDecimal price;
    private BigDecimal compareAtPrice;
    private BigDecimal costPrice;
    private Long categoryId;
    private String categoryName;
    private UUID brandId;
    private String brandName;
    private String brandLogoUrl;
    private boolean active;
    private boolean featured;
    private boolean bestseller;
    private boolean newArrival;
    private boolean onSale;
    private Integer salePercentage;

    /** Whether the product is organic. */
    private Boolean organic;

    /** Unit of measure for display (e.g. kg, pc). */
    private UnitDTO unit;
}
