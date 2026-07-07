package com.ecommerce.repository;

import com.ecommerce.entity.ShopSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShopSubscriptionRepository extends JpaRepository<ShopSubscription, Long> {
    
    List<ShopSubscription> findByShopShopId(UUID shopId);

    @Query("SELECT s FROM ShopSubscription s WHERE s.shop.shopId = :shopId AND s.status = 'ACTIVE' AND s.endDate > CURRENT_TIMESTAMP ORDER BY s.endDate DESC")
    Optional<ShopSubscription> findActiveSubscriptionByShopId(UUID shopId);

    Optional<ShopSubscription> findByPaymentReference(String paymentReference);
}
