package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CountryDeliveryAreasDTO {
    private String country;
    private Boolean hasWarehouse;
    private Boolean hasDeliveryAreas;
    private Boolean deliversEverywhere; // true if has warehouse but no delivery areas
    private List<DeliveryAreaDTO> rootAreas; // Root areas for this country
    private Integer totalAreasCount;
}
