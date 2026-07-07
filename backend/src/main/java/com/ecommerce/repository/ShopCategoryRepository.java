package com.ecommerce.repository;

import com.ecommerce.entity.ShopCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopCategoryRepository extends JpaRepository<ShopCategory, Long> {

    /**
     * Find category by name (case-insensitive)
     */
    @Query("SELECT sc FROM ShopCategory sc WHERE LOWER(sc.name) = LOWER(:name)")
    Optional<ShopCategory> findByNameIgnoreCase(@Param("name") String name);

    /**
     * Search categories by name (case-insensitive, partial match)
     */
    @Query("SELECT sc FROM ShopCategory sc WHERE LOWER(sc.name) LIKE LOWER(CONCAT('%', :query, '%')) AND sc.isActive = true ORDER BY sc.name ASC")
    List<ShopCategory> searchByNameIgnoreCase(@Param("query") String query);

    /**
     * Find all active categories
     */
    List<ShopCategory> findByIsActiveTrueOrderByNameAsc();
    
    /**
     * Find all active categories with pagination
     */
    org.springframework.data.domain.Page<ShopCategory> findByIsActiveTrue(org.springframework.data.domain.Pageable pageable);

    /**
     * Check if category exists by name (case-insensitive)
     */
    @Query("SELECT COUNT(sc) > 0 FROM ShopCategory sc WHERE LOWER(sc.name) = LOWER(:name)")
    boolean existsByNameIgnoreCase(@Param("name") String name);
}
