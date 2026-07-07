package com.ecommerce.repository;

import com.ecommerce.entity.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {

        /**
         * Find warehouse by name within a specific shop
         */
        Optional<Warehouse> findByNameAndShopShopId(String name, java.util.UUID shopId);

        /**
         * Find all active warehouses
         */
        List<Warehouse> findByIsActiveTrue();

        /**
         * Find warehouse by address
         */
        List<Warehouse> findByAddressContainingIgnoreCase(String address);

        /**
         * Find warehouse by city
         */
        List<Warehouse> findByCityContainingIgnoreCase(String city);

        /**
         * Check if warehouse exists by name within a specific shop
         */
        boolean existsByNameAndShopShopId(String name, java.util.UUID shopId);

        /**
         * Find warehouses by address (searches in the address field)
         */
        @Query("SELECT w FROM Warehouse w WHERE w.address LIKE %:address%")
        List<Warehouse> findByAddressContaining(@Param("address") String address);

        /**
         * Find warehouses near a specific location using Haversine formula
         */
        @Query("SELECT w FROM Warehouse w WHERE " +
                        "6371 * acos(cos(radians(:latitude)) * cos(radians(w.latitude)) * " +
                        "cos(radians(w.longitude) - radians(:longitude)) + " +
                        "sin(radians(:latitude)) * sin(radians(w.latitude))) <= :radiusKm")
        List<Warehouse> findWarehousesNearLocation(@Param("latitude") Double latitude,
                        @Param("longitude") Double longitude,
                        @Param("radiusKm") Double radiusKm);

        /**
         * Check if warehouse exists by country (case insensitive)
         */
        @Query("SELECT COUNT(w) > 0 FROM Warehouse w WHERE LOWER(w.country) = LOWER(:country)")
        boolean existsByCountryIgnoreCase(@Param("country") String country);

        /**
         * Get all unique countries from warehouses
         */
        @Query("SELECT DISTINCT w.country FROM Warehouse w WHERE w.country IS NOT NULL AND w.country != '' ORDER BY w.country")
        List<String> findDistinctCountries();

        /**
         * Find active warehouses by country (case insensitive)
         */
        List<Warehouse> findByCountryIgnoreCaseAndIsActiveTrue(String country);

        /**
         * Find warehouses by shop ID
         */
        List<Warehouse> findByShopShopId(java.util.UUID shopId);

        /**
         * Find warehouses by shop ID with pagination
         */
        org.springframework.data.domain.Page<Warehouse> findByShopShopId(java.util.UUID shopId,
                        org.springframework.data.domain.Pageable pageable);

        /**
         * Find active warehouses by shop ID
         */
        List<Warehouse> findByShopShopIdAndIsActiveTrue(java.util.UUID shopId);

        /**
         * Find active warehouses by shop ID with pagination
         */
        org.springframework.data.domain.Page<Warehouse> findByShopShopIdAndIsActiveTrue(
                java.util.UUID shopId,
                org.springframework.data.domain.Pageable pageable);

        /**
         * Search warehouses by name, description, address, city, state, or country
         */
        @Query("SELECT w FROM Warehouse w WHERE " +
                        "(:shopId IS NULL OR w.shop.shopId = :shopId) AND " +
                        "(LOWER(w.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
                        "LOWER(w.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
                        "LOWER(w.address) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
                        "LOWER(w.city) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
                        "LOWER(w.state) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
                        "LOWER(w.country) LIKE LOWER(CONCAT('%', :query, '%')))")
        org.springframework.data.domain.Page<Warehouse> searchWarehouses(
                        @Param("query") String query,
                        @Param("shopId") java.util.UUID shopId,
                        org.springframework.data.domain.Pageable pageable);
}
