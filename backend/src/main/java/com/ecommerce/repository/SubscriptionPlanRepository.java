package com.ecommerce.repository;

import com.ecommerce.entity.SubscriptionPlan;
import com.ecommerce.enums.ShopCapability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {
    Optional<SubscriptionPlan> findByName(String name);
    boolean existsByName(String name);
    List<SubscriptionPlan> findByCapability(ShopCapability capability);
    List<SubscriptionPlan> findByCapabilityAndIsActiveTrue(ShopCapability capability);
}
