package com.ecommerce.service.impl;

import com.ecommerce.dto.ShopCategoryDTO;
import com.ecommerce.entity.ShopCategory;
import com.ecommerce.repository.ShopCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ShopCategoryServiceImpl implements com.ecommerce.service.ShopCategoryService {

    private final ShopCategoryRepository shopCategoryRepository;

    @Override
    @Transactional
    public ShopCategoryDTO findOrCreateCategory(String categoryName) {
        if (categoryName == null || categoryName.trim().isEmpty()) {
            return null;
        }

        log.info("Finding or creating shop category: {}", categoryName);

        // Try to find existing category (case-insensitive)
        return shopCategoryRepository.findByNameIgnoreCase(categoryName.trim())
                .map(this::convertToDTO)
                .orElseGet(() -> {
                    // Create new category if not found
                    ShopCategory newCategory = new ShopCategory();
                    newCategory.setName(categoryName.trim());
                    newCategory.setIsActive(true);
                    ShopCategory saved = shopCategoryRepository.save(newCategory);
                    log.info("Created new shop category: {} with ID: {}", saved.getName(), saved.getId());
                    return convertToDTO(saved);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShopCategoryDTO> searchCategories(String query) {
        if (query == null || query.trim().isEmpty()) {
            return getAllActiveCategories();
        }

        log.debug("Searching shop categories with query: {}", query);
        List<ShopCategory> categories = shopCategoryRepository.searchByNameIgnoreCase(query.trim());
        return categories.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShopCategoryDTO> getAllActiveCategories() {
        List<ShopCategory> categories = shopCategoryRepository.findByIsActiveTrueOrderByNameAsc();
        return categories.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ShopCategoryDTO getCategoryById(Long id) {
        ShopCategory category = shopCategoryRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Shop category not found with ID: " + id));
        return convertToDTO(category);
    }

    @Override
    @Transactional
    public ShopCategoryDTO createCategory(String name, String description) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Category name is required");
        }

        // Check if category already exists
        if (shopCategoryRepository.existsByNameIgnoreCase(name.trim())) {
            throw new IllegalArgumentException("Category with name '" + name + "' already exists");
        }

        log.info("Creating new shop category: {}", name);
        ShopCategory category = new ShopCategory();
        category.setName(name.trim());
        category.setDescription(description);
        category.setIsActive(true);

        ShopCategory saved = shopCategoryRepository.save(category);
        log.info("Created shop category with ID: {}", saved.getId());
        return convertToDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<ShopCategoryDTO> getActiveCategoriesPaginated(org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<ShopCategory> categories = shopCategoryRepository.findByIsActiveTrue(pageable);
        return categories.map(this::convertToDTO);
    }

    private ShopCategoryDTO convertToDTO(ShopCategory category) {
        if (category == null) {
            return null;
        }

        return ShopCategoryDTO.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .isActive(category.getIsActive())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }
}
