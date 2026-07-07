package com.ecommerce.repository;

import com.ecommerce.entity.ShopFollower;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShopFollowerRepository extends JpaRepository<ShopFollower, UUID> {

    /**
     * Check if a user follows a shop
     */
    boolean existsByShopShopIdAndUserId(UUID shopId, UUID userId);

    /**
     * Find follower relationship
     */
    Optional<ShopFollower> findByShopShopIdAndUserId(UUID shopId, UUID userId);

    /**
     * Count followers for a shop
     */
    long countByShopShopId(UUID shopId);

    /**
     * Get all shops followed by a user
     */
    @Query("SELECT sf.shop.shopId FROM ShopFollower sf WHERE sf.user.id = :userId")
    List<UUID> findShopIdsByUserId(@Param("userId") UUID userId);

    /**
     * Get all followers for a shop (with pagination if needed)
     */
    List<ShopFollower> findByShopShopId(UUID shopId);

    /**
     * Delete follower relationship
     */
    void deleteByShopShopIdAndUserId(UUID shopId, UUID userId);
}
