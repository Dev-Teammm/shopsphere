package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryAreaDTO {
    private Long id;
    private String name;
    private String description;
    private String country;
    private UUID shopId;
    private String shopName;
    private Long warehouseId;
    private String warehouseName;
    private Long parentId;
    private String parentName;
    private Boolean isActive;
    private Integer depth;
    private Boolean isRoot;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<DeliveryAreaDTO> children;
    private Integer childrenCount;
}
