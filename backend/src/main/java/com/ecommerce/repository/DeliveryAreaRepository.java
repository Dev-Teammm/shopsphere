package com.ecommerce.repository;

import com.ecommerce.entity.DeliveryArea;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeliveryAreaRepository extends JpaRepository<DeliveryArea, Long>, JpaSpecificationExecutor<DeliveryArea> {

    /**
     * Find all delivery areas for a shop
     */
    List<DeliveryArea> findByShopShopId(UUID shopId);

    /**
     * Find all root areas (no parent) for a shop
     */
    @Query("SELECT da FROM DeliveryArea da WHERE da.shop.shopId = :shopId AND da.parent IS NULL")
    List<DeliveryArea> findRootAreasByShopId(@Param("shopId") UUID shopId);

    /**
     * Find all areas by country for a shop
     */
    @Query("SELECT da FROM DeliveryArea da WHERE da.shop.shopId = :shopId AND da.country = :country")
    List<DeliveryArea> findByShopIdAndCountry(@Param("shopId") UUID shopId, @Param("country") String country);

    /**
     * Find root areas by country for a shop
     */
    @Query("SELECT da FROM DeliveryArea da WHERE da.shop.shopId = :shopId AND da.country = :country AND da.parent IS NULL")
    List<DeliveryArea> findRootAreasByShopIdAndCountry(@Param("shopId") UUID shopId, @Param("country") String country);

    /**
     * Find all children of a specific area
     */
    @Query("SELECT da FROM DeliveryArea da WHERE da.parent.id = :parentId")
    List<DeliveryArea> findByParentId(@Param("parentId") Long parentId);

    /**
     * Find all countries that have warehouses for a shop
     */
    @Query("SELECT DISTINCT w.country FROM Warehouse w WHERE w.shop.shopId = :shopId AND w.isActive = true")
    List<String> findCountriesWithWarehousesByShopId(@Param("shopId") UUID shopId);

    /**
     * Check if a country has any delivery areas for a shop
     */
    @Query("SELECT COUNT(da) > 0 FROM DeliveryArea da WHERE da.shop.shopId = :shopId AND da.country = :country")
    boolean existsByShopIdAndCountry(@Param("shopId") UUID shopId, @Param("country") String country);

    /**
     * Find area by ID and shop ID (for authorization)
     */
    @Query("SELECT da FROM DeliveryArea da WHERE da.id = :id AND da.shop.shopId = :shopId")
    Optional<DeliveryArea> findByIdAndShopId(@Param("id") Long id, @Param("shopId") UUID shopId);

    /**
     * Count areas by shop
     */
    long countByShopShopId(UUID shopId);
}
