package com.ecommerce.controller;

import com.ecommerce.dto.CreateUnitDTO;
import com.ecommerce.dto.UnitDTO;
import com.ecommerce.entity.Unit;
import com.ecommerce.repository.UnitRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/units")
@Tag(name = "Units", description = "List and create units of measure for products (e.g. kg, pc)")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class UnitController {

    private final UnitRepository unitRepository;

    @GetMapping
    @Operation(summary = "List units", description = "Returns units with optional search and pagination")
    public ResponseEntity<Map<String, Object>> listUnits(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("symbol").ascending());
        Page<Unit> unitPage = (search != null && !search.trim().isEmpty())
                ? unitRepository.search(search.trim(), pageable)
                : unitRepository.findAll(pageable);
        List<UnitDTO> units = unitPage.getContent().stream()
                .map(UnitDTO::from)
                .collect(Collectors.toList());
        Map<String, Object> response = new HashMap<>();
        response.put("content", units);
        response.put("totalElements", unitPage.getTotalElements());
        response.put("totalPages", unitPage.getTotalPages());
        response.put("currentPage", unitPage.getNumber());
        response.put("pageSize", unitPage.getSize());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Operation(summary = "Create or get unit", description = "Creates a new unit. If a unit with the same symbol already exists, returns the existing one (no duplicate).")
    public ResponseEntity<UnitDTO> createUnit(@Valid @RequestBody CreateUnitDTO dto) {
        String symbol = dto.getSymbol().trim();
        Unit existing = unitRepository.findBySymbolIgnoreCase(symbol).orElse(null);
        if (existing != null) {
            return ResponseEntity.ok(UnitDTO.from(existing));
        }
        Unit unit = new Unit();
        unit.setSymbol(symbol);
        unit.setName(dto.getName().trim());
        unit = unitRepository.save(unit);
        return ResponseEntity.ok(UnitDTO.from(unit));
    }
}
