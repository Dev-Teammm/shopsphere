package com.ecommerce.service;

import com.ecommerce.dto.ShopDTO;
import com.ecommerce.entity.Shop;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ShopService {

    ShopDTO createShop(ShopDTO shopDTO, UUID ownerId);

    ShopDTO updateShop(UUID shopId, ShopDTO shopDTO, UUID ownerId);

    void deleteShop(UUID shopId, UUID ownerId);

    ShopDTO getShopById(UUID shopId);

    ShopDTO getShopBySlug(String slug);

    List<ShopDTO> getShopsByOwner(UUID ownerId);

    Page<ShopDTO> getAllShops(Pageable pageable);

    Page<ShopDTO> searchShops(String search, String category, Pageable pageable);
    
    Page<ShopDTO> searchShops(String search, String category, Boolean followedOnly, UUID userId, Pageable pageable);

    List<ShopDTO> getActiveShops();

    ShopDTO activateShop(UUID shopId, UUID ownerId);

    ShopDTO convertToDTO(Shop shop);

    Shop convertToEntity(ShopDTO shopDTO);

    boolean isOwner(UUID shopId, UUID userId);

    List<ShopDTO> getUserShops(UUID userId);

    com.ecommerce.dto.ShopDetailsDTO getShopDetails(UUID shopId);
    
    com.ecommerce.dto.ShopDetailsDTO getShopDetails(UUID shopId, UUID userId);
    
    /**
     * Get shops that deliver to a specific country
     * Shops must have: active status, FULL_ECOMMERCE or HYBRID capability, 
     * active subscription or freemium, connected Stripe account, and warehouses in the country
     */
    Page<com.ecommerce.dto.ShopDeliveryInfoDTO> getShopsDeliveringToCountry(String country, Pageable pageable);
    
    /**
     * Get all countries with delivery availability and shop counts
     */
    List<com.ecommerce.dto.CountryDeliveryInfoDTO> getCountriesWithDelivery();
}
