package com.ecommerce.repository;

import com.ecommerce.entity.Product;
import com.ecommerce.entity.Category;
import com.ecommerce.entity.Brand;
import com.ecommerce.entity.Discount;
import com.ecommerce.entity.Stock;
import com.ecommerce.entity.StockBatch;
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
public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

        @Query("SELECT p FROM Product p WHERE p.slug = :slug AND p.deletedAt IS NULL")
        Optional<Product> findBySlug(@Param("slug") String slug);

        Optional<Product> findBySku(String sku);

        @Query("select count(p) from Product p where p.deletedAt is null and p.id in " +
                        "(select s.product.id from Stock s where s.product is not null and s.quantity > 0 and s.quantity <= s.lowStockThreshold)")
        long countLowStock();

        @Query("select count(p) from Product p where p.isActive = true and p.deletedAt is null")
        long countActive();

        @Query("select count(p) from Product p where p.category = :category and p.isActive = true and p.deletedAt is null")
        long countByCategoryAndIsActiveTrue(@Param("category") Category category);

        @Query("select count(p) from Product p where p.brand = :brand and p.isActive = true and p.deletedAt is null")
        long countByBrandAndIsActiveTrue(@Param("brand") Brand brand);

        // Search suggestion methods
        @Query("SELECT p FROM Product p " +
                        "WHERE LOWER(p.productName) LIKE LOWER(CONCAT('%', :query, '%')) " +
                        "AND p.isActive = true AND p.deletedAt IS NULL ORDER BY p.productName")
        List<Product> findTop10ByProductNameContainingIgnoreCase(@Param("query") String query);

        @Query("SELECT p FROM Product p WHERE CAST(p.productId AS string) = :productId")
        Optional<Product> findByProductId(@Param("productId") String productId);

        Page<Product> findByDiscount(Discount discount, Pageable pageable);

        long countByDiscount(Discount discount);

        List<Product> findByProductIdInOrderByCreatedAtDesc(List<UUID> productIds);

        Page<Product> findByProductNameContainingIgnoreCaseOrShortDescriptionContainingIgnoreCase(
                        String productName, String shortDescription, Pageable pageable);

        @Query("SELECT p FROM Product p LEFT JOIN p.productDetail pd " +
                        "WHERE (LOWER(p.productName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.slug) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(pd.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(pd.storageInstructions) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(pd.nutritionalInfo) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
                        "AND p.isActive = true AND p.deletedAt IS NULL")
        Page<Product> findProductsByComprehensiveSearch(@Param("searchTerm") String searchTerm, Pageable pageable);

        // Method to find products with comma-separated keyword matching (no
        // barcode/metaDescription - removed for marketplace SAAS)
        @Query("SELECT DISTINCT p FROM Product p LEFT JOIN p.productDetail pd " +
                        "WHERE p.isActive = true AND p.deletedAt IS NULL " +
                        "AND (LOWER(p.productName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.slug) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(pd.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(pd.storageInstructions) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(pd.nutritionalInfo) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
        List<Product> findProductsForKeywordSearch(@Param("searchTerm") String searchTerm);

        @Query("SELECT p FROM Product p WHERE p.deletedAt IS NULL AND p.productId IN " +
                        "(SELECT r.product.productId FROM Review r GROUP BY r.product.productId " +
                        "HAVING AVG(r.rating) >= :minRating AND AVG(r.rating) <= :maxRating)")
        List<Product> findProductsByRatingRange(@Param("minRating") Double minRating,
                        @Param("maxRating") Double maxRating);

        @Query("SELECT p FROM Product p WHERE p.deletedAt IS NULL AND p.productId IN " +
                        "(SELECT r.product.productId FROM Review r GROUP BY r.product.productId " +
                        "HAVING AVG(r.rating) >= :minRating)")
        List<Product> findProductsByMinRating(@Param("minRating") Double minRating);

        @Query("SELECT p FROM Product p WHERE p.deletedAt IS NULL AND p.productId IN " +
                        "(SELECT r.product.productId FROM Review r GROUP BY r.product.productId " +
                        "HAVING AVG(r.rating) <= :maxRating)")
        List<Product> findProductsByMaxRating(@Param("maxRating") Double maxRating);

        @Query("SELECT p FROM Product p WHERE p.brand = :brand AND p.productId != :productId AND p.isActive = true AND p.deletedAt IS NULL")
        Page<Product> findByBrandAndProductIdNot(@Param("brand") Brand brand, @Param("productId") UUID productId,
                        Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.brand = :brand AND p.productId != :productId AND p.isActive = true AND p.deletedAt IS NULL "
                        +
                        "AND p.productId IN (SELECT s.product.productId FROM Stock s WHERE s.product IS NOT NULL AND s.quantity > 0)")
        Page<Product> findByBrandAndProductIdNotAndInStock(@Param("brand") Brand brand,
                        @Param("productId") UUID productId, Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.category = :category AND p.productId != :productId AND p.isActive = true AND p.deletedAt IS NULL")
        Page<Product> findByCategoryAndProductIdNot(@Param("category") Category category,
                        @Param("productId") UUID productId, Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.category = :category AND p.productId != :productId AND p.isActive = true AND p.deletedAt IS NULL "
                        +
                        "AND p.productId IN (SELECT s.product.productId FROM Stock s WHERE s.product IS NOT NULL AND s.quantity > 0)")
        Page<Product> findByCategoryAndProductIdNotAndInStock(@Param("category") Category category,
                        @Param("productId") UUID productId, Pageable pageable);

        @Query("SELECT p FROM Product p LEFT JOIN p.productDetail pd " +
                        "WHERE p.productId != :productId AND p.isActive = true AND p.deletedAt IS NULL " +
                        "AND (LOWER(p.productName) LIKE LOWER(CONCAT('%', :keywords, '%')) " +
                        "OR LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :keywords, '%')) " +
                        "OR LOWER(pd.description) LIKE LOWER(CONCAT('%', :keywords, '%')) " +
                        "OR LOWER(pd.storageInstructions) LIKE LOWER(CONCAT('%', :keywords, '%')) " +
                        "OR LOWER(pd.nutritionalInfo) LIKE LOWER(CONCAT('%', :keywords, '%')))")
        Page<Product> findByKeywordsAndProductIdNot(@Param("keywords") String keywords,
                        @Param("productId") UUID productId, Pageable pageable);

        @Query("SELECT p FROM Product p LEFT JOIN p.productDetail pd " +
                        "WHERE p.productId != :productId AND p.isActive = true AND p.deletedAt IS NULL " +
                        "AND p.productId IN (SELECT s.product.productId FROM Stock s WHERE s.product IS NOT NULL AND s.quantity > 0) "
                        +
                        "AND (LOWER(p.productName) LIKE LOWER(CONCAT('%', :keywords, '%')) " +
                        "OR LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :keywords, '%')) " +
                        "OR LOWER(pd.description) LIKE LOWER(CONCAT('%', :keywords, '%')) " +
                        "OR LOWER(pd.storageInstructions) LIKE LOWER(CONCAT('%', :keywords, '%')) " +
                        "OR LOWER(pd.nutritionalInfo) LIKE LOWER(CONCAT('%', :keywords, '%')))")
        Page<Product> findByKeywordsAndProductIdNotAndInStock(@Param("keywords") String keywords,
                        @Param("productId") UUID productId, Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.productId != :productId AND p.isActive = true AND p.deletedAt IS NULL "
                        +
                        "ORDER BY p.isBestseller DESC, p.isFeatured DESC, p.createdAt DESC")
        Page<Product> findByPopularityAndProductIdNot(@Param("productId") UUID productId, Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.productId != :productId AND p.isActive = true AND p.deletedAt IS NULL "
                        +
                        "AND p.productId IN (SELECT s.product.productId FROM Stock s WHERE s.product IS NOT NULL AND s.quantity > 0) "
                        +
                        "ORDER BY p.isBestseller DESC, p.isFeatured DESC, p.createdAt DESC")
        Page<Product> findByPopularityAndProductIdNotAndInStock(@Param("productId") UUID productId, Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL")
        Page<Product> findAvailableForCustomers(Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.isActive = true AND p.deletedAt IS NULL")
        Page<Product> findAvailableForAdmins(Pageable pageable);

        // Base query for products with stock - supports sorting by Product entity
        // fields only
        @Query("SELECT DISTINCT p FROM Product p " +
                        "LEFT JOIN p.variants v " +
                        "LEFT JOIN Stock s ON (s.product = p OR s.productVariant = v) " +
                        "LEFT JOIN StockBatch sb ON sb.stock = s " +
                        "WHERE p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL " +
                        "AND ((p.variants IS EMPTY AND sb.status = 'ACTIVE' AND sb.quantity > 0) " +
                        "OR (p.variants IS NOT EMPTY AND v.isActive = true AND sb.status = 'ACTIVE' AND sb.quantity > 0))")
        Page<Product> findAvailableForCustomersWithStock(Pageable pageable);

        // Query for sorting by review count
        @Query("SELECT DISTINCT p FROM Product p " +
                        "LEFT JOIN p.variants v " +
                        "LEFT JOIN Stock s ON (s.product = p OR s.productVariant = v) " +
                        "LEFT JOIN StockBatch sb ON sb.stock = s " +
                        "LEFT JOIN p.reviews r " +
                        "WHERE p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL " +
                        "AND ((p.variants IS EMPTY AND sb.status = 'ACTIVE' AND sb.quantity > 0) " +
                        "OR (p.variants IS NOT EMPTY AND v.isActive = true AND sb.status = 'ACTIVE' AND sb.quantity > 0)) "
                        +
                        "GROUP BY p.productId " +
                        "ORDER BY COUNT(r) DESC")
        Page<Product> findAvailableForCustomersWithStockOrderByReviewCount(Pageable pageable);

        // Query for sorting by average rating
        @Query("SELECT DISTINCT p FROM Product p " +
                        "LEFT JOIN p.variants v " +
                        "LEFT JOIN Stock s ON (s.product = p OR s.productVariant = v) " +
                        "LEFT JOIN StockBatch sb ON sb.stock = s " +
                        "LEFT JOIN p.reviews r " +
                        "WHERE p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL " +
                        "AND ((p.variants IS EMPTY AND sb.status = 'ACTIVE' AND sb.quantity > 0) " +
                        "OR (p.variants IS NOT EMPTY AND v.isActive = true AND sb.status = 'ACTIVE' AND sb.quantity > 0)) "
                        +
                        "GROUP BY p.productId " +
                        "ORDER BY COALESCE(AVG(r.rating), 0) DESC")
        Page<Product> findAvailableForCustomersWithStockOrderByRating(Pageable pageable);

        @Query("SELECT p FROM Product p " +
                        "WHERE p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL " +
                        "AND (LOWER(p.productName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
        Page<Product> searchAvailableForCustomers(@Param("searchTerm") String searchTerm, Pageable pageable);

        @Query("SELECT DISTINCT p FROM Product p " +
                        "LEFT JOIN p.variants v " +
                        "LEFT JOIN Stock s ON (s.product = p OR s.productVariant = v) " +
                        "LEFT JOIN StockBatch sb ON sb.stock = s " +
                        "WHERE p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL " +
                        "AND (LOWER(p.productName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
                        "OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
                        "AND ((p.variants IS EMPTY AND sb.status = 'ACTIVE' AND sb.quantity > 0) " +
                        "OR (p.variants IS NOT EMPTY AND v.isActive = true AND sb.status = 'ACTIVE' AND sb.quantity > 0))")
        Page<Product> searchAvailableForCustomersWithStock(@Param("searchTerm") String searchTerm, Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.category = :category AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL")
        Page<Product> findByCategoryForCustomers(@Param("category") Category category, Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.brand = :brand AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL")
        Page<Product> findByBrandForCustomers(@Param("brand") Brand brand, Pageable pageable);

        @Query("SELECT DISTINCT p FROM Product p " +
                        "LEFT JOIN p.variants v " +
                        "LEFT JOIN Stock s ON (s.product = p OR s.productVariant = v) " +
                        "LEFT JOIN StockBatch sb ON sb.stock = s " +
                        "WHERE p.category = :category AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL "
                        +
                        "AND ((p.variants IS EMPTY AND sb.status = 'ACTIVE' AND sb.quantity > 0) " +
                        "OR (p.variants IS NOT EMPTY AND v.isActive = true AND sb.status = 'ACTIVE' AND sb.quantity > 0))")
        Page<Product> findByCategoryForCustomersWithStock(@Param("category") Category category, Pageable pageable);

        @Query("SELECT DISTINCT p FROM Product p " +
                        "LEFT JOIN p.variants v " +
                        "LEFT JOIN Stock s ON (s.product = p OR s.productVariant = v) " +
                        "LEFT JOIN StockBatch sb ON sb.stock = s " +
                        "WHERE p.brand = :brand AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL "
                        +
                        "AND ((p.variants IS EMPTY AND sb.status = 'ACTIVE' AND sb.quantity > 0) " +
                        "OR (p.variants IS NOT EMPTY AND v.isActive = true AND sb.status = 'ACTIVE' AND sb.quantity > 0))")
        Page<Product> findByBrandForCustomersWithStock(@Param("brand") Brand brand, Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.isFeatured = true AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL")
        Page<Product> findFeaturedForCustomers(Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.isBestseller = true AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL")
        Page<Product> findBestsellersForCustomers(Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.isNewArrival = true AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL")
        Page<Product> findNewArrivalsForCustomers(Pageable pageable);

        @Query("SELECT DISTINCT p FROM Product p " +
                        "LEFT JOIN p.variants v " +
                        "LEFT JOIN Stock s ON (s.product = p OR s.productVariant = v) " +
                        "LEFT JOIN StockBatch sb ON sb.stock = s " +
                        "WHERE p.isFeatured = true AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL "
                        +
                        "AND ((p.variants IS EMPTY AND sb.status = 'ACTIVE' AND sb.quantity > 0) " +
                        "OR (p.variants IS NOT EMPTY AND v.isActive = true AND sb.status = 'ACTIVE' AND sb.quantity > 0))")
        Page<Product> findFeaturedForCustomersWithStock(Pageable pageable);

        @Query("SELECT DISTINCT p FROM Product p " +
                        "LEFT JOIN p.variants v " +
                        "LEFT JOIN Stock s ON (s.product = p OR s.productVariant = v) " +
                        "LEFT JOIN StockBatch sb ON sb.stock = s " +
                        "WHERE p.isBestseller = true AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL "
                        +
                        "AND ((p.variants IS EMPTY AND sb.status = 'ACTIVE' AND sb.quantity > 0) " +
                        "OR (p.variants IS NOT EMPTY AND v.isActive = true AND sb.status = 'ACTIVE' AND sb.quantity > 0))")
        Page<Product> findBestsellersForCustomersWithStock(Pageable pageable);

        @Query("SELECT DISTINCT p FROM Product p " +
                        "LEFT JOIN p.variants v " +
                        "LEFT JOIN Stock s ON (s.product = p OR s.productVariant = v) " +
                        "LEFT JOIN StockBatch sb ON sb.stock = s " +
                        "WHERE p.isNewArrival = true AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL "
                        +
                        "AND ((p.variants IS EMPTY AND sb.status = 'ACTIVE' AND sb.quantity > 0) " +
                        "OR (p.variants IS NOT EMPTY AND v.isActive = true AND sb.status = 'ACTIVE' AND sb.quantity > 0))")
        Page<Product> findNewArrivalsForCustomersWithStock(Pageable pageable);

        // Methods for featured categories and brands with products
        @Query("SELECT p FROM Product p WHERE p.category = :category AND p.isActive = true AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
        Page<Product> findByCategoryAndIsActiveTrueOrderByCreatedAtDesc(@Param("category") Category category,
                        Pageable pageable);

        @Query("SELECT p FROM Product p WHERE p.brand = :brand AND p.isActive = true AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
        Page<Product> findByBrandAndIsActiveTrueOrderByCreatedAtDesc(@Param("brand") Brand brand, Pageable pageable);

        @Query("SELECT COUNT(p) FROM Product p WHERE p.shop.shopId = :shopId AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL")
        long countByShopId(@Param("shopId") UUID shopId);

        /**
         * Count low stock products for a specific shop
         */
        @Query("SELECT COUNT(p) FROM Product p " +
                        "WHERE p.shop.shopId = :shopId AND p.deletedAt IS NULL " +
                        "AND p.id IN " +
                        "(SELECT s.product.id FROM Stock s WHERE s.product IS NOT NULL " +
                        "AND s.quantity > 0 AND s.quantity <= s.lowStockThreshold)")
        long countLowStockByShopId(@Param("shopId") UUID shopId);

        /**
         * Find all products for a specific shop with pagination (excludes soft-deleted)
         */
        @Query("SELECT p FROM Product p WHERE p.shop.shopId = :shopId AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
        Page<Product> findByShopId(@Param("shopId") UUID shopId, Pageable pageable);

        @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.images WHERE p.shop.shopId = :shopId AND p.isActive = true AND p.displayToCustomers = true AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
        Page<Product> findByShopIdForCustomers(@Param("shopId") UUID shopId, Pageable pageable);

        @Query("SELECT COUNT(p) FROM Product p WHERE p.shop.shopId = :shopId AND p.isActive = true AND p.deletedAt IS NULL")
        long countActiveByShopId(@Param("shopId") UUID shopId);
}
