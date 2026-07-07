package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopRewardPointsDTO {
    private UUID shopId;
    private String shopName;
    private String logoUrl;
    private Integer points;
    private BigDecimal monetaryValue;
    private String category;
    private RewardSettingsDTO rewardSettings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RewardSettingsDTO {
        private BigDecimal pointValue;
        private Boolean isReviewPointsEnabled;
        private Integer reviewPointsAmount;
        private Boolean isPurchasePointsEnabled;
        private Boolean isPercentageBasedEnabled;
        private BigDecimal percentageRate;
        private List<RewardRangeDTO> rewardRanges;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RewardRangeDTO {
        private String rangeType;
        private Double minValue;
        private Double maxValue;
        private Integer points;
        private String description;
    }
}
