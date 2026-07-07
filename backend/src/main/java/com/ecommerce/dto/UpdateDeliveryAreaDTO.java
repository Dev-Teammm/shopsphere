package com.ecommerce.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDeliveryAreaDTO {
    @NotBlank(message = "Area name is required")
    private String name;

    private String description;

    private Long parentId; // Optional - for moving to different parent
}
