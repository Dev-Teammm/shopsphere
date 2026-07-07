package com.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = { "product" })
public class ProductDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Weight per unit in kilograms */
    @Column(name = "weight_kg", precision = 8, scale = 3)
    private BigDecimal weightKg;

    @Column(name = "shipping_info", columnDefinition = "TEXT")
    private String shippingInfo;

    @Column(name = "return_policy", columnDefinition = "TEXT")
    private String returnPolicy;

    // ==================== Category-specific fields (Product-level) ====================
    // These fields are shared across all batches of this product type

    /** General storage instructions for this product type (e.g., "Keep refrigerated", "Store in cool dry place") */
    @Column(name = "storage_instructions", columnDefinition = "TEXT")
    private String storageInstructions;

    /** General nutritional information for this product type */
    @Column(name = "nutritional_info", columnDefinition = "TEXT")
    private String nutritionalInfo;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Gets the description
     * 
     * @return The description
     */
    public String getDescription() {
        return description;
    }

    /**
     * Gets the weight in kg
     * 
     * @return The weight
     */
    public BigDecimal getWeightKg() {
        return weightKg;
    }

    /**
     * Gets the storage instructions
     * 
     * @return The storage instructions
     */
    public String getStorageInstructions() {
        return storageInstructions;
    }

    /**
     * Gets the nutritional info
     * 
     * @return The nutritional info
     */
    public String getNutritionalInfo() {
        return nutritionalInfo;
    }

    /**
     * Sets the product
     * 
     * @param product The product to set
     */
    public void setProduct(Product product) {
        this.product = product;
    }
}