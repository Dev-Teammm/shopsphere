package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRewardSummaryDTO {
    private Integer totalPoints;
    private BigDecimal totalMonetaryValue;
    private List<ShopRewardPointsDTO> shopPoints;
    private long totalShops;
    private int totalPages;
    private int currentPage;
}
