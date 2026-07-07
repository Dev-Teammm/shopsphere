package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CountryDeliveryInfoDTO {
    private String country;
    private Integer shopCount;
    private List<ShopDeliveryInfoDTO> shops;
}
