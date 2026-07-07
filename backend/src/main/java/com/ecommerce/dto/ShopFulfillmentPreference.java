package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for storing fulfillment preference per shop
 * Used for HYBRID shops where customer chooses pickup or delivery
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopFulfillmentPreference {
    private UUID shopId;
    private String fulfillmentType; // "PICKUP" or "DELIVERY"
}
