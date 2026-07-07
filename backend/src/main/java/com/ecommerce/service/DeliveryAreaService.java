package com.ecommerce.service;

import com.ecommerce.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface DeliveryAreaService {
    
    /**
     * Create a new delivery area
     */
    DeliveryAreaDTO createDeliveryArea(UUID shopId, CreateDeliveryAreaDTO createDTO);
    
    /**
     * Update an existing delivery area
     */
    DeliveryAreaDTO updateDeliveryArea(UUID shopId, Long areaId, UpdateDeliveryAreaDTO updateDTO);
    
    /**
     * Delete a delivery area (and all its children)
     */
    void deleteDeliveryArea(UUID shopId, Long areaId);
    
    /**
     * Get a delivery area by ID
     */
    DeliveryAreaDTO getDeliveryAreaById(UUID shopId, Long areaId);
    
    /**
     * Get all delivery areas for a shop with search and filters
     */
    Page<DeliveryAreaDTO> getDeliveryAreas(UUID shopId, DeliveryAreaSearchDTO searchDTO, Pageable pageable);
    
    /**
     * Get all countries with their delivery areas structure
     */
    List<CountryDeliveryAreasDTO> getCountriesWithDeliveryAreas(UUID shopId);
    
    /**
     * Get delivery areas tree for a specific country
     */
    List<DeliveryAreaDTO> getDeliveryAreasTreeByCountry(UUID shopId, String country);
    
    /**
     * Get all root areas (no parent) for a shop
     */
    List<DeliveryAreaDTO> getRootAreas(UUID shopId);
    
    /**
     * Get children of a specific area
     */
    List<DeliveryAreaDTO> getChildrenAreas(UUID shopId, Long parentId);
}
