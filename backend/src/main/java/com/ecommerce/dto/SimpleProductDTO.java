package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimpleProductDTO {
    private String productId;
    private String name;
    private String description;
    private Double price;
    private String[] images;

    /** Unit of measure (e.g. kg, pc). */
    private UnitDTO unit;

    /** Whether the product is organic. */
    private Boolean organic;
}


