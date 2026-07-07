package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductPricingTierDTO {
    private UUID pricingId;
    private BigDecimal price;
    private BigDecimal unitCount;
    private Long unitId;
    private String unitName;
    private String unitSymbol;
    private boolean isPrimary;
}
