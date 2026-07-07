package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryAreaSearchDTO {
    private String searchQuery; // Search by name or description
    private String country; // Filter by country
    private Long warehouseId; // Filter by warehouse
    private Long parentId; // Filter by parent (null for root areas)
    private Boolean isActive; // Filter by active status
    private Boolean rootOnly; // Only return root areas (no parent)
}
