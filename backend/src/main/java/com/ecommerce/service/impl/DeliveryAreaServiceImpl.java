package com.ecommerce.service.impl;

import com.ecommerce.dto.*;
import com.ecommerce.entity.DeliveryArea;
import com.ecommerce.entity.Shop;
import com.ecommerce.entity.Warehouse;
import com.ecommerce.repository.DeliveryAreaRepository;
import com.ecommerce.repository.ShopRepository;
import com.ecommerce.repository.WarehouseRepository;
import com.ecommerce.service.DeliveryAreaService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class DeliveryAreaServiceImpl implements DeliveryAreaService {

    private final DeliveryAreaRepository deliveryAreaRepository;
    private final ShopRepository shopRepository;
    private final WarehouseRepository warehouseRepository;

    @Override
    @Transactional
    public DeliveryAreaDTO createDeliveryArea(UUID shopId, CreateDeliveryAreaDTO createDTO) {
        log.info("Creating delivery area for shop {}: {}", shopId, createDTO.getName());

        // Validate shop exists
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with ID: " + shopId));

        // Validate warehouse exists and belongs to shop
        Warehouse warehouse = warehouseRepository.findById(createDTO.getWarehouseId())
                .orElseThrow(() -> new EntityNotFoundException("Warehouse not found with ID: " + createDTO.getWarehouseId()));

        if (!warehouse.getShop().getShopId().equals(shopId)) {
            throw new IllegalArgumentException("Warehouse does not belong to the specified shop");
        }

        // Validate warehouse country matches
        if (!warehouse.getCountry().equalsIgnoreCase(createDTO.getCountry())) {
            throw new IllegalArgumentException("Warehouse country (" + warehouse.getCountry() + 
                    ") does not match delivery area country (" + createDTO.getCountry() + ")");
        }

        // Validate parent if provided
        DeliveryArea parent = null;
        if (createDTO.getParentId() != null) {
            parent = deliveryAreaRepository.findByIdAndShopId(createDTO.getParentId(), shopId)
                    .orElseThrow(() -> new EntityNotFoundException("Parent delivery area not found or does not belong to shop"));
            
            // Validate parent country matches
            if (!parent.getCountry().equalsIgnoreCase(createDTO.getCountry())) {
                throw new IllegalArgumentException("Parent area country does not match delivery area country");
            }
        }

        // Create delivery area
        DeliveryArea area = new DeliveryArea();
        area.setName(createDTO.getName());
        area.setDescription(createDTO.getDescription());
        area.setCountry(createDTO.getCountry());
        area.setShop(shop);
        area.setWarehouse(warehouse);
        area.setParent(parent);
        area.setIsActive(true);

        DeliveryArea saved = deliveryAreaRepository.save(area);
        log.info("Delivery area created with ID: {}", saved.getId());

        return convertToDTO(saved, true);
    }

    @Override
    @Transactional
    public DeliveryAreaDTO updateDeliveryArea(UUID shopId, Long areaId, UpdateDeliveryAreaDTO updateDTO) {
        log.info("Updating delivery area {} for shop {}", areaId, shopId);

        DeliveryArea area = deliveryAreaRepository.findByIdAndShopId(areaId, shopId)
                .orElseThrow(() -> new EntityNotFoundException("Delivery area not found or does not belong to shop"));

        // Update name and description
        area.setName(updateDTO.getName());
        if (updateDTO.getDescription() != null) {
            area.setDescription(updateDTO.getDescription());
        }

        // Update parent if provided
        if (updateDTO.getParentId() != null) {
            DeliveryArea newParent = deliveryAreaRepository.findByIdAndShopId(updateDTO.getParentId(), shopId)
                    .orElseThrow(() -> new EntityNotFoundException("Parent delivery area not found or does not belong to shop"));
            
            // Cannot set area as its own parent
            if (newParent.getId().equals(areaId)) {
                throw new IllegalArgumentException("Cannot set area as its own parent");
            }
            
            // Validate parent country matches
            if (!newParent.getCountry().equalsIgnoreCase(area.getCountry())) {
                throw new IllegalArgumentException("Parent area country does not match delivery area country");
            }
            
            // Prevent circular reference: check if the area being updated is already an ancestor of the new parent
            // If area is an ancestor of newParent, setting newParent as area's parent would create a cycle
            if (isAncestor(area, newParent.getId())) {
                throw new IllegalArgumentException("Cannot set parent: would create circular reference. The selected parent is already a descendant of this area.");
            }
            
            area.setParent(newParent);
        } else if (updateDTO.getParentId() == null && area.getParent() != null) {
            // Setting to null means making it a root area
            area.setParent(null);
        }

        DeliveryArea updated = deliveryAreaRepository.save(area);
        log.info("Delivery area updated successfully");

        return convertToDTO(updated, true);
    }

    @Override
    @Transactional
    public void deleteDeliveryArea(UUID shopId, Long areaId) {
        log.info("Deleting delivery area {} for shop {}", areaId, shopId);

        DeliveryArea area = deliveryAreaRepository.findByIdAndShopId(areaId, shopId)
                .orElseThrow(() -> new EntityNotFoundException("Delivery area not found or does not belong to shop"));

        // Cascade delete will handle children automatically due to orphanRemoval = true
        deliveryAreaRepository.delete(area);
        log.info("Delivery area and all children deleted successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryAreaDTO getDeliveryAreaById(UUID shopId, Long areaId) {
        DeliveryArea area = deliveryAreaRepository.findByIdAndShopId(areaId, shopId)
                .orElseThrow(() -> new EntityNotFoundException("Delivery area not found or does not belong to shop"));

        return convertToDTO(area, true);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeliveryAreaDTO> getDeliveryAreas(UUID shopId, DeliveryAreaSearchDTO searchDTO, Pageable pageable) {
        log.info("Getting delivery areas for shop {} with filters", shopId);

        // Validate shop exists
        if (!shopRepository.existsById(shopId)) {
            throw new EntityNotFoundException("Shop not found with ID: " + shopId);
        }

        // Build specification
        Specification<DeliveryArea> spec = buildSearchSpecification(shopId, searchDTO);

        Page<DeliveryArea> areas = deliveryAreaRepository.findAll(spec, pageable);
        return areas.map(area -> convertToDTO(area, false));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CountryDeliveryAreasDTO> getCountriesWithDeliveryAreas(UUID shopId) {
        log.info("Getting countries with delivery areas for shop {}", shopId);

        // Get all countries with warehouses for this shop
        List<String> countriesWithWarehouses = deliveryAreaRepository.findCountriesWithWarehousesByShopId(shopId);

        List<CountryDeliveryAreasDTO> result = new ArrayList<>();

        for (String country : countriesWithWarehouses) {
            boolean hasDeliveryAreas = deliveryAreaRepository.existsByShopIdAndCountry(shopId, country);
            List<DeliveryArea> rootAreas = deliveryAreaRepository.findRootAreasByShopIdAndCountry(shopId, country);
            
            // Build tree structure
            List<DeliveryAreaDTO> rootAreasDTO = rootAreas.stream()
                    .map(area -> buildTree(area))
                    .collect(Collectors.toList());

            int totalCount = deliveryAreaRepository.findByShopIdAndCountry(shopId, country).size();

            CountryDeliveryAreasDTO dto = CountryDeliveryAreasDTO.builder()
                    .country(country)
                    .hasWarehouse(true)
                    .hasDeliveryAreas(hasDeliveryAreas)
                    .deliversEverywhere(!hasDeliveryAreas) // If has warehouse but no areas, delivers everywhere
                    .rootAreas(rootAreasDTO)
                    .totalAreasCount(totalCount)
                    .build();

            result.add(dto);
        }

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryAreaDTO> getDeliveryAreasTreeByCountry(UUID shopId, String country) {
        log.info("Getting delivery areas tree for shop {} and country {}", shopId, country);

        List<DeliveryArea> rootAreas = deliveryAreaRepository.findRootAreasByShopIdAndCountry(shopId, country);
        return rootAreas.stream()
                .map(this::buildTree)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryAreaDTO> getRootAreas(UUID shopId) {
        List<DeliveryArea> rootAreas = deliveryAreaRepository.findRootAreasByShopId(shopId);
        return rootAreas.stream()
                .map(area -> convertToDTO(area, false))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryAreaDTO> getChildrenAreas(UUID shopId, Long parentId) {
        // Validate parent belongs to shop
        DeliveryArea parent = deliveryAreaRepository.findByIdAndShopId(parentId, shopId)
                .orElseThrow(() -> new EntityNotFoundException("Parent delivery area not found or does not belong to shop"));

        List<DeliveryArea> children = deliveryAreaRepository.findByParentId(parentId);
        return children.stream()
                .map(area -> convertToDTO(area, false))
                .collect(Collectors.toList());
    }

    /**
     * Build search specification
     */
    private Specification<DeliveryArea> buildSearchSpecification(UUID shopId, DeliveryAreaSearchDTO searchDTO) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Always filter by shop
            predicates.add(criteriaBuilder.equal(root.get("shop").get("shopId"), shopId));

            // Search query (name or description)
            if (StringUtils.hasText(searchDTO.getSearchQuery())) {
                String searchTerm = "%" + searchDTO.getSearchQuery().toLowerCase() + "%";
                Predicate namePredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("name")), searchTerm);
                Predicate descPredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("description")), searchTerm);
                predicates.add(criteriaBuilder.or(namePredicate, descPredicate));
            }

            // Filter by country
            if (StringUtils.hasText(searchDTO.getCountry())) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.lower(root.get("country")),
                        searchDTO.getCountry().toLowerCase()));
            }

            // Filter by warehouse
            if (searchDTO.getWarehouseId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("warehouse").get("id"), searchDTO.getWarehouseId()));
            }

            // Filter by parent
            if (searchDTO.getParentId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("parent").get("id"), searchDTO.getParentId()));
            } else if (Boolean.TRUE.equals(searchDTO.getRootOnly())) {
                predicates.add(criteriaBuilder.isNull(root.get("parent")));
            }

            // Filter by active status
            if (searchDTO.getIsActive() != null) {
                predicates.add(criteriaBuilder.equal(root.get("isActive"), searchDTO.getIsActive()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Build tree structure recursively
     */
    private DeliveryAreaDTO buildTree(DeliveryArea area) {
        DeliveryAreaDTO dto = convertToDTO(area, true);
        
        if (area.getChildren() != null && !area.getChildren().isEmpty()) {
            List<DeliveryAreaDTO> childrenDTOs = area.getChildren().stream()
                    .map(this::buildTree)
                    .collect(Collectors.toList());
            dto.setChildren(childrenDTOs);
            dto.setChildrenCount(childrenDTOs.size());
        } else {
            dto.setChildren(new ArrayList<>());
            dto.setChildrenCount(0);
        }
        
        return dto;
    }

    /**
     * Convert entity to DTO
     */
    private DeliveryAreaDTO convertToDTO(DeliveryArea area, boolean includeChildren) {
        if (area == null) {
            return null;
        }

        DeliveryAreaDTO dto = DeliveryAreaDTO.builder()
                .id(area.getId())
                .name(area.getName())
                .description(area.getDescription())
                .country(area.getCountry())
                .shopId(area.getShop().getShopId())
                .shopName(area.getShop().getName())
                .warehouseId(area.getWarehouse().getId())
                .warehouseName(area.getWarehouse().getName())
                .isActive(area.getIsActive())
                .depth(area.getDepth())
                .isRoot(area.isRoot())
                .createdAt(area.getCreatedAt())
                .updatedAt(area.getUpdatedAt())
                .build();

        if (area.getParent() != null) {
            dto.setParentId(area.getParent().getId());
            dto.setParentName(area.getParent().getName());
        }

        if (includeChildren && area.getChildren() != null) {
            List<DeliveryAreaDTO> childrenDTOs = area.getChildren().stream()
                    .map(child -> convertToDTO(child, true))
                    .collect(Collectors.toList());
            dto.setChildren(childrenDTOs);
            dto.setChildrenCount(childrenDTOs.size());
        } else {
            dto.setChildren(new ArrayList<>());
            if (area.getChildren() != null) {
                dto.setChildrenCount(area.getChildren().size());
            } else {
                dto.setChildrenCount(0);
            }
        }

        return dto;
    }

    /**
     * Check if an area is an ancestor of another area (to prevent circular references)
     * This checks if the given area or any of its descendants has the targetId
     */
    private boolean isAncestor(DeliveryArea area, Long targetId) {
        // If this area is the target, it's an ancestor of itself (which would create a cycle)
        if (area.getId().equals(targetId)) {
            return true;
        }
        
        // Load children if not already loaded
        if (area.getChildren() == null || area.getChildren().isEmpty()) {
            // Fetch children from repository to ensure we check the full tree
            List<DeliveryArea> children = deliveryAreaRepository.findByParentId(area.getId());
            if (children.isEmpty()) {
                return false;
            }
            // Recursively check each child
            for (DeliveryArea child : children) {
                if (isAncestor(child, targetId)) {
                    return true;
                }
            }
        } else {
            // Children are already loaded, check them
            for (DeliveryArea child : area.getChildren()) {
                if (isAncestor(child, targetId)) {
                    return true;
                }
            }
        }
        
        return false;
    }
}
