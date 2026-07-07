package com.ecommerce.dto;

import com.ecommerce.entity.ShopSubscription.SubscriptionStatus;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ShopSubscriptionDTO {
    private Long id;
    private UUID shopId;
    private String shopName;
    private Long planId;
    private String planName;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private SubscriptionStatus status;
    private String paymentReference;
    private BigDecimal amountPaid;
    private Boolean autoRenew;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
