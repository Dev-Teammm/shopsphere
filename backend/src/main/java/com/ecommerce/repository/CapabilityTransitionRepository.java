package com.ecommerce.repository;

import com.ecommerce.entity.CapabilityTransition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CapabilityTransitionRepository extends JpaRepository<CapabilityTransition, Long> {
    
    /**
     * Find active transition for a shop
     */
    @Query("SELECT ct FROM CapabilityTransition ct WHERE ct.shopId = :shopId " +
           "AND (ct.status = 'PENDING' OR ct.status = 'IN_PROGRESS')")
    Optional<CapabilityTransition> findActiveTransitionByShopId(@Param("shopId") UUID shopId);
    
    /**
     * Find all transitions for a shop
     */
    List<CapabilityTransition> findByShopIdOrderByRequestedAtDesc(UUID shopId);
    
    /**
     * Find all active transitions (for scheduled job to check completion)
     */
    @Query("SELECT ct FROM CapabilityTransition ct WHERE " +
           "(ct.status = 'PENDING' OR ct.status = 'IN_PROGRESS')")
    List<CapabilityTransition> findAllActiveTransitions();
}
