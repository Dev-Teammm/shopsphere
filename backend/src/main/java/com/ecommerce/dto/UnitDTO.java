package com.ecommerce.dto;

import com.ecommerce.entity.Unit;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnitDTO {
    private Long id;
    private String symbol;
    private String name;

    public static UnitDTO from(Unit unit) {
        if (unit == null) return null;
        return UnitDTO.builder()
                .id(unit.getId())
                .symbol(unit.getSymbol())
                .name(unit.getName())
                .build();
    }
}
