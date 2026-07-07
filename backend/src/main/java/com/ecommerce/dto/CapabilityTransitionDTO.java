package com.ecommerce.dto;

import com.ecommerce.entity.CapabilityTransition;
import com.ecommerce.enums.ShopCapability;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CapabilityTransitionDTO {
    private Long id;
    private UUID shopId;
    private ShopCapability currentCapability;
    private ShopCapability requestedCapability;
    private CapabilityTransition.TransitionStatus status;
    private Integer pendingOrdersCount;
    private Integer pendingReturnsCount;
    private Integer pendingAppealsCount;
    private Integer pendingDeliveriesCount;
    private LocalDateTime requestedAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    private String notes;
}
