package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopDeliveryInfoDTO {
    private UUID shopId;
    private String shopName;
    private String shopSlug;
    private String logoUrl;
    private String description;
    private String capability; // FULL_ECOMMERCE or HYBRID
}
