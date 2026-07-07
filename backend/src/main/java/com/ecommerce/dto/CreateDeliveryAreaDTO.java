package com.ecommerce.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateDeliveryAreaDTO {
    @NotBlank(message = "Area name is required")
    private String name;

    private String description;

    @NotBlank(message = "Country is required")
    private String country;

    @NotNull(message = "Warehouse ID is required")
    private Long warehouseId;

    private Long parentId; // Optional - for creating sub-areas
}
