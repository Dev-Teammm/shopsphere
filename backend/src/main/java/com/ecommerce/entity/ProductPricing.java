package com.ecommerce.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonBackReference;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "product_pricings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductPricing {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID pricingId;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be positive")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @NotNull(message = "Unit count is required")
    @Positive(message = "Unit count must be positive")
    @Column(name = "unit_count", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id")
    private Unit unit;

    @Column(name = "is_primary")
    private boolean isPrimary = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    @JsonBackReference
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id")
    @JsonBackReference
    private ProductVariant variant;
}
