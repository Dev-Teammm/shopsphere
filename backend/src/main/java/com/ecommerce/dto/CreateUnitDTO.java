package com.ecommerce.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateUnitDTO {
    @NotBlank(message = "Unit symbol is required")
    @Size(min = 1, max = 20)
    private String symbol;

    @NotBlank(message = "Unit name is required")
    @Size(min = 1, max = 100)
    private String name;
}
