package com.ecommerce.repository;

import com.ecommerce.entity.ProductPricing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductPricingRepository extends JpaRepository<ProductPricing, UUID> {
    List<ProductPricing> findByProductProductId(UUID productId);

    List<ProductPricing> findByVariantId(Long variantId);
}
