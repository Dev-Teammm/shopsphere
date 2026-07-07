package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductBasicInfoUpdateDTO {
    private String productName;
    private String shortDescription;
    private String description;
    private BigDecimal price;
    private BigDecimal compareAtPrice;
    private BigDecimal costPrice;
    private Long categoryId;
    private UUID brandId;
    private Boolean active;
    private Boolean featured;
    private Boolean bestseller;
    private Boolean newArrival;
    private Boolean onSale;
    private Integer salePercentage;

    /** Whether the product is organic. */
    private Boolean organic;

    /** Unit of measure ID (e.g. kg, pc). */
    private Long unitId;
}
