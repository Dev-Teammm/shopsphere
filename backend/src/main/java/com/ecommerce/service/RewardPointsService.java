package com.ecommerce.service;

import com.ecommerce.dto.ShopRewardPointsDTO;
import com.ecommerce.dto.UserRewardSummaryDTO;
import com.ecommerce.entity.RewardRange;
import com.ecommerce.entity.RewardSystem;
import com.ecommerce.entity.Shop;
import com.ecommerce.entity.User;
import com.ecommerce.repository.UserPointsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RewardPointsService {

    private final UserPointsRepository userPointsRepository;

    @Transactional(readOnly = true)
    public UserRewardSummaryDTO getUserRewards(User user, String query, Pageable pageable) {
        log.info("Fetching rewards for user: {} with query: {}", user.getId(), query);

        // Get all shops where the user has points
        // We need to group by shop and sum points
        List<Object[]> shopPointsRaw = userPointsRepository.findShopPointsSummaryByUserId(user.getId());
        
        List<ShopRewardPointsDTO> allShopPoints = new ArrayList<>();
        BigDecimal totalMonetaryValue = BigDecimal.ZERO;
        int totalPoints = 0;

        for (Object[] row : shopPointsRaw) {
            Shop shop = (Shop) row[0];
            Long pointsLong = (Long) row[1];
            Integer points = pointsLong.intValue();

            if (points <= 0) continue;

            // Filter by query if provided
            if (query != null && !query.isEmpty() && 
                !shop.getName().toLowerCase().contains(query.toLowerCase())) {
                continue;
            }

            // Get reward system settings for this shop
            RewardSystem rewardSystem = shop.getRewardSystems().stream()
                .filter(rs -> rs.getIsActive() && rs.getIsSystemEnabled())
                .findFirst()
                .orElse(null);

            BigDecimal monetaryValue = BigDecimal.ZERO;
            ShopRewardPointsDTO.RewardSettingsDTO settingsDTO = null;

            if (rewardSystem != null) {
                monetaryValue = rewardSystem.calculatePointsValue(points);
                
                settingsDTO = ShopRewardPointsDTO.RewardSettingsDTO.builder()
                    .pointValue(rewardSystem.getPointValue())
                    .isReviewPointsEnabled(rewardSystem.getIsReviewPointsEnabled())
                    .reviewPointsAmount(rewardSystem.getReviewPointsAmount())
                    .isPurchasePointsEnabled(rewardSystem.getIsPurchasePointsEnabled())
                    .isPercentageBasedEnabled(rewardSystem.getIsPercentageBasedEnabled())
                    .percentageRate(rewardSystem.getPercentageRate())
                    .rewardRanges(rewardSystem.getRewardRanges().stream()
                        .map(range -> ShopRewardPointsDTO.RewardRangeDTO.builder()
                            .rangeType(range.getRangeType().name())
                            .minValue(range.getMinValue())
                            .maxValue(range.getMaxValue())
                            .points(range.getPoints())
                            .description(range.getDescription())
                            .build())
                        .collect(Collectors.toList()))
                    .build();
            }

            allShopPoints.add(ShopRewardPointsDTO.builder()
                .shopId(shop.getShopId())
                .shopName(shop.getName())
                .logoUrl(shop.getLogoUrl())
                .points(points)
                .monetaryValue(monetaryValue)
                .category(shop.getShopCategory() != null ? shop.getShopCategory().getName() : "General")
                .rewardSettings(settingsDTO)
                .build());

            totalPoints += points;
            totalMonetaryValue = totalMonetaryValue.add(monetaryValue);
        }

        // Apply pagination manually since we summarized in memory (or could use native query with grouping)
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allShopPoints.size());
        
        List<ShopRewardPointsDTO> pagedShops = new ArrayList<>();
        if (start < allShopPoints.size()) {
            pagedShops = allShopPoints.subList(start, end);
        }

        return UserRewardSummaryDTO.builder()
            .totalPoints(totalPoints)
            .totalMonetaryValue(totalMonetaryValue)
            .shopPoints(pagedShops)
            .totalShops(allShopPoints.size())
            .totalPages((int) Math.ceil((double) allShopPoints.size() / pageable.getPageSize()))
            .currentPage(pageable.getPageNumber())
            .build();
    }
}
