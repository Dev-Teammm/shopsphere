package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointsPaymentPreviewDTO {

    // Points information
    private Integer totalAvailablePoints;
    private BigDecimal totalPointsValueUsed;
    private BigDecimal avgPointValue;
    private BigDecimal remainingToPay;
    private boolean canPayWithPointsOnly;

    // Complete payment summary with all costs breakdown
    private BigDecimal totalAmount;
    private BigDecimal subtotal;
    private BigDecimal shippingCost;
    private BigDecimal taxAmount;
    private List<ShopPreviewSummary> shopSummaries;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ShopPreviewSummary {
        private String shopId;
        private String shopName;
        private BigDecimal subtotal;
        private BigDecimal discountAmount;
        private BigDecimal shippingCost;
        private BigDecimal packagingFee;
        private BigDecimal totalAmount;
        private Integer availablePoints;
        private BigDecimal pointValue;
        private Integer pointsToUse;
        private BigDecimal pointsValueToUse;
        private Integer remainingPointsAfterUse;
        private String fulfillmentType;
    }
}
