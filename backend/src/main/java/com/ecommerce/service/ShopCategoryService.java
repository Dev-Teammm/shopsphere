package com.ecommerce.service;

import com.ecommerce.dto.ShopCategoryDTO;

import java.util.List;

public interface ShopCategoryService {
    
    /**
     * Find or create a shop category by name
     * If category exists (case-insensitive), return it
     * Otherwise, create a new category
     */
    ShopCategoryDTO findOrCreateCategory(String categoryName);
    
    /**
     * Search categories by name (partial match, case-insensitive)
     */
    List<ShopCategoryDTO> searchCategories(String query);
    
    /**
     * Get all active categories
     */
    List<ShopCategoryDTO> getAllActiveCategories();
    
    /**
     * Get category by ID
     */
    ShopCategoryDTO getCategoryById(Long id);
    
    /**
     * Create a new category
     */
    ShopCategoryDTO createCategory(String name, String description);
    
    /**
     * Get paginated active categories
     */
    org.springframework.data.domain.Page<ShopCategoryDTO> getActiveCategoriesPaginated(org.springframework.data.domain.Pageable pageable);
}
