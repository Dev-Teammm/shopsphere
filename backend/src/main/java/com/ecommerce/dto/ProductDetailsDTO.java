package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDetailsDTO {
    private String description;
    private BigDecimal weightKg;
    private String shippingInfo;
    private String returnPolicy;
    private Integer maximumDaysForReturn;
    private Boolean displayToCustomers;
    
    // Category-specific fields (Product-level - shared across all batches)
    private String storageInstructions;
    private String nutritionalInfo;
}
