package com.ecommerce.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Unit of measure for products (e.g. kg, pc, L). All units are system-wide; every shop uses the same list.
 */
@Entity
@Table(name = "units")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Unit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "unit_id")
    private Long id;

    @NotBlank(message = "Unit symbol is required")
    @Size(min = 1, max = 20)
    @Column(name = "symbol", nullable = false, unique = true)
    private String symbol;

    @NotBlank(message = "Unit name is required")
    @Size(min = 1, max = 100)
    @Column(name = "name", nullable = false)
    private String name;
}
