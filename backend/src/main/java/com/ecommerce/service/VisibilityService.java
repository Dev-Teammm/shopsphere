package com.ecommerce.service;

import com.ecommerce.dto.VisibilityStatusDTO;
import com.ecommerce.entity.Product;
import com.ecommerce.entity.Shop;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.ShopRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VisibilityService {

    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final ProductAvailabilityService productAvailabilityService;
    private final ShopAuthorizationService shopAuthorizationService;

    public VisibilityStatusDTO getProductVisibilityStatus(UUID productId, UUID userId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));

        if (product.getShop() != null) {
            shopAuthorizationService.assertCanManageShop(userId, product.getShop().getShopId());
            initializeShopRelations(product.getShop());
        }

        return productAvailabilityService.getProductVisibilityStatus(product);
    }

    public VisibilityStatusDTO getShopVisibilityStatus(UUID shopId, UUID userId) {
        shopAuthorizationService.assertCanManageShop(userId, shopId);

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found"));

        initializeShopRelations(shop);
        return productAvailabilityService.getShopVisibilityStatus(shop);
    }

    private void initializeShopRelations(Shop shop) {
        if (shop.getStripeAccount() != null) {
            shop.getStripeAccount().getAccountStatus();
        }
        if (shop.getSubscriptions() != null) {
            shop.getSubscriptions().forEach(subscription -> {
                if (subscription.getPlan() != null) {
                    subscription.getPlan().getCapability();
                }
            });
        }
    }
}
