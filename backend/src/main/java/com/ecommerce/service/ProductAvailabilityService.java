package com.ecommerce.service;

import com.ecommerce.dto.VisibilityIssueDTO;
import com.ecommerce.dto.VisibilityStatusDTO;
import com.ecommerce.entity.Product;
import com.ecommerce.entity.ProductVariant;
import com.ecommerce.entity.Shop;
import com.ecommerce.entity.ShopSubscription;
import com.ecommerce.entity.Stock;
import com.ecommerce.repository.StockBatchRepository;
import com.ecommerce.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductAvailabilityService {

    private final StockRepository stockRepository;
    private final StockBatchRepository stockBatchRepository;
    private final SubscriptionService subscriptionService;
    private final CapabilityTransitionService capabilityTransitionService;
    private final BatchExpirationService batchExpirationService;

    public boolean isProductAvailableForCustomers(Product product) {
        return getProductVisibilityStatus(product).isVisibleToCustomers();
    }

    public VisibilityStatusDTO getShopVisibilityStatus(Shop shop) {
        List<VisibilityIssueDTO> issues = collectShopVisibilityIssues(shop);
        boolean visible = issues.isEmpty();
        return VisibilityStatusDTO.builder()
                .visibleToCustomers(visible)
                .issues(issues)
                .build();
    }

    public VisibilityStatusDTO getProductVisibilityStatus(Product product) {
        List<VisibilityIssueDTO> issues = new ArrayList<>();

        if (product.getShop() != null) {
            issues.addAll(collectShopVisibilityIssues(product.getShop()));
        } else {
            issues.add(issue(
                    "SHOP_MISSING",
                    "Shop not linked",
                    "This product is not linked to a shop, so it cannot appear on the storefront.",
                    "error",
                    "Go to products",
                    "/dashboard/products"));
        }

        if (!product.isActive()) {
            issues.add(issue(
                    "PRODUCT_INACTIVE",
                    "Product is inactive",
                    "Turn on Active Product in Basic Info so customers can see this listing.",
                    "error",
                    "Edit product",
                    productActionPath(product, "basic")));
        }

        if (!Boolean.TRUE.equals(product.getDisplayToCustomers())) {
            issues.add(issue(
                    "NOT_DISPLAYED_TO_CUSTOMERS",
                    "Not visible to customers",
                    "Enable Display to Customers in Additional Info to publish this product on the storefront.",
                    "error",
                    "Edit visibility",
                    productActionPath(product, "details")));
        }

        if (!hasAvailableStock(product)) {
            issues.add(issue(
                    "NO_STOCK",
                    "No available inventory",
                    "Add warehouse stock with at least one active batch and quantity greater than zero.",
                    "error",
                    "Add inventory",
                    productActionPath(product, "inventory")));
        }

        boolean visibleToCustomers = issues.isEmpty();
        return VisibilityStatusDTO.builder()
                .visibleToCustomers(visibleToCustomers)
                .issues(issues)
                .build();
    }

    private List<VisibilityIssueDTO> collectShopVisibilityIssues(Shop shop) {
        List<VisibilityIssueDTO> issues = new ArrayList<>();
        if (shop == null) {
            issues.add(issue(
                    "SHOP_MISSING",
                    "Shop not found",
                    "We could not determine which shop owns this product.",
                    "error",
                    null,
                    null));
            return issues;
        }

        String shopManagePath = "/shops/manage/" + shop.getShopId();

        if (shop.getPrimaryCapability() == null) {
            issues.add(issue(
                    "CAPABILITY_NOT_SET",
                    "Shop capability not configured",
                    "Choose a shop capability (e.g. Pickup, Full E-commerce, or Hybrid) before your products can go live.",
                    "error",
                    "Configure shop",
                    shopManagePath));
        }

        if (shop.getIsActive() == null || !shop.getIsActive()) {
            issues.add(issue(
                    "SHOP_INACTIVE",
                    "Shop is turned off",
                    "Your shop is marked inactive. Customers will not see any products until the shop is active.",
                    "error",
                    "Manage shop",
                    shopManagePath));
        }

        if (shop.getStripeAccount() == null
                || shop.getStripeAccount().getAccountStatus() != com.ecommerce.entity.StripeAccount.AccountStatus.ACTIVE) {
            issues.add(issue(
                    "STRIPE_NOT_CONNECTED",
                    "Stripe account not connected",
                    "Connect and activate your Stripe account so customers can browse and purchase from your shop.",
                    "error",
                    "Connect Stripe",
                    shopManagePath));
        }

        boolean subscriptionSystemEnabled = subscriptionService.isSubscriptionEnabled();
        if (subscriptionSystemEnabled) {
            if (!shop.hasValidSubscription()) {
                issues.add(issue(
                        "SUBSCRIPTION_REQUIRED",
                        "No active subscription",
                        "Subscribe to a plan that matches your shop capability to make products visible to customers.",
                        "error",
                        "View plans",
                        shopManagePath));
            } else {
                ShopSubscription activeSubscription = findActiveSubscription(shop);
                if (activeSubscription != null
                        && activeSubscription.getPlan() != null
                        && shop.getPrimaryCapability() != null
                        && activeSubscription.getPlan().getCapability() != shop.getPrimaryCapability()) {
                    issues.add(issue(
                            "SUBSCRIPTION_CAPABILITY_MISMATCH",
                            "Subscription plan mismatch",
                            "Your active plan does not match your shop capability. Update your capability or choose a matching plan.",
                            "error",
                            "Fix subscription",
                            shopManagePath));
                }
            }
        }

        return issues;
    }

    private ShopSubscription findActiveSubscription(Shop shop) {
        if (shop.getSubscriptions() == null) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        return shop.getSubscriptions().stream()
                .filter(sub -> sub.getStatus() == ShopSubscription.SubscriptionStatus.ACTIVE
                        && sub.getEndDate() != null
                        && sub.getEndDate().isAfter(now))
                .findFirst()
                .orElse(null);
    }

    private String productActionPath(Product product, String tab) {
        UUID productId = product.getProductId();
        Shop shop = product.getShop();
        if (shop != null && shop.getSlug() != null && !shop.getSlug().isBlank()) {
            return "/dashboard/products/" + productId + "/update?shopSlug="
                    + shop.getSlug() + "&tab=" + tab;
        }
        return "/dashboard/products/" + productId + "/update?tab=" + tab;
    }

    private VisibilityIssueDTO issue(
            String code,
            String title,
            String description,
            String severity,
            String actionLabel,
            String actionPath) {
        return VisibilityIssueDTO.builder()
                .code(code)
                .title(title)
                .description(description)
                .severity(severity)
                .actionLabel(actionLabel)
                .actionPath(actionPath)
                .build();
    }

    /**
     * Check if shop is active for customers to see products
     * Shop must be: marked active, have active Stripe account, and have valid
     * subscription (if subscription system is enabled)
     * 
     * IMPORTANT: For expired subscriptions, products are NOT visible to new
     * customers,
     * but shop can still complete existing operations (orders, returns, appeals)
     * 
     * This method is used for PRODUCT VISIBILITY only.
     * For operations (orders, returns, appeals), use canShopPerformOperations()
     * instead.
     */
    private boolean isShopActiveForCustomers(Shop shop) {
        if (shop == null) {
            return false;
        }

        // 1. Check if shop is marked active manually
        if (shop.getIsActive() == null || !shop.getIsActive()) {
            return false;
        }

        // 2. Check Stripe Account - required for shop to be active
        if (shop.getStripeAccount() == null ||
                shop.getStripeAccount().getAccountStatus() != com.ecommerce.entity.StripeAccount.AccountStatus.ACTIVE) {
            return false;
        }

        // 3. Check if subscription system is enabled
        boolean subscriptionSystemEnabled = subscriptionService.isSubscriptionEnabled();

        if (subscriptionSystemEnabled) {
            // If subscription system is ON, shop must have valid subscription or freemium
            // Expired subscriptions: products NOT visible, but operations continue
            // Only return true if subscription is VALID (not expired)
            return shop.hasValidSubscription();
        }

        // If subscription system is OFF, only Stripe account is required
        return true;
    }

    /**
     * Check if shop can perform operations (orders, returns, appeals)
     * This allows operations even with expired subscriptions
     */
    public boolean canShopPerformOperations(Shop shop) {
        if (shop == null) {
            return false;
        }

        // 1. Check if shop is marked active manually
        if (shop.getIsActive() == null || !shop.getIsActive()) {
            return false;
        }

        // 2. Check Stripe Account - required for shop to be active
        if (shop.getStripeAccount() == null ||
                shop.getStripeAccount().getAccountStatus() != com.ecommerce.entity.StripeAccount.AccountStatus.ACTIVE) {
            return false;
        }

        // 3. For operations, allow even if subscription expired
        // Shop just needs to have had a subscription at some point (not necessarily
        // active)
        boolean subscriptionSystemEnabled = subscriptionService.isSubscriptionEnabled();

        if (subscriptionSystemEnabled) {
            // Allow operations if shop has ANY subscription (active or expired)
            // This ensures shops can complete existing operations even after subscription
            // expires
            return shop.getSubscriptions() != null && !shop.getSubscriptions().isEmpty();
        }

        // If subscription system is OFF, only Stripe account is required
        return true;
    }

    /**
     * Check if shop supports a capability, considering active transitions
     */
    private boolean shopSupportsCapability(Shop shop, boolean requiresDelivery, boolean requiresPickup) {
        if (shop == null) {
            return false;
        }

        // Check for active transition
        CapabilityTransitionService.EffectiveCapabilities effectiveCapabilities = capabilityTransitionService
                .getEffectiveCapabilities(shop.getShopId());

        if (effectiveCapabilities.isInTransition()) {
            // During transition, shop has both capabilities
            if (requiresDelivery) {
                return effectiveCapabilities.supportsDelivery();
            } else if (requiresPickup) {
                return effectiveCapabilities.supportsPickup();
            } else {
                return effectiveCapabilities.supportsVisualization();
            }
        }

        // No transition, use shop's current capability
        if (requiresDelivery) {
            return shop.supportsDelivery();
        } else if (requiresPickup) {
            return shop.supportsPickupOrders();
        } else {
            return shop.supportsVisualization();
        }
    }

    public boolean isProductValidForDisplay(Product product) {
        return product.isActive() &&
                Boolean.TRUE.equals(product.getDisplayToCustomers());
    }

    public boolean hasAvailableStock(Product product) {
        List<ProductVariant> variants = product.getVariants();

        if (variants == null || variants.isEmpty()) {
            return hasProductStock(product);
        } else {
            return hasAnyVariantStock(variants);
        }
    }

    private boolean hasProductStock(Product product) {
        List<Stock> productStocks = stockRepository.findByProduct(product);

        for (Stock stock : productStocks) {
            if (hasStockWithActiveNonExpiredBatch(stock)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasAnyVariantStock(List<ProductVariant> variants) {
        for (ProductVariant variant : variants) {
            if (variant.isActive() && hasVariantStock(variant)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasVariantStock(ProductVariant variant) {
        List<Stock> variantStocks = stockRepository.findByProductVariant(variant);

        for (Stock stock : variantStocks) {
            if (hasStockWithActiveNonExpiredBatch(stock)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a stock entry has at least one active, non-expired batch with
     * quantity
     * This is the critical availability check that validates both:
     * - The batch is not expired (expiresAt <= now or expiryDate <= now)
     * - The batch has quantity > 0
     * 
     * @param stock the stock entry to check
     * @return true if there is at least one active non-expired batch with quantity
     */
    private boolean hasStockWithActiveNonExpiredBatch(Stock stock) {
        LocalDateTime now = LocalDateTime.now();

        // Use the new repository method that checks runtime expiration
        return stockBatchRepository.hasActiveNonExpiredBatch(stock, now);
    }

    private boolean hasStockAvailable(Stock stock) {
        // Use runtime expiration check for total available quantity
        LocalDateTime now = LocalDateTime.now();
        Integer totalAvailableQuantity = stockBatchRepository.getTotalNonExpiredQuantityByStock(stock, now);
        return totalAvailableQuantity != null && totalAvailableQuantity > 0;
    }

    public boolean isVariantAvailableForCustomers(ProductVariant variant) {
        return variant.isActive() && hasVariantStock(variant);
    }

    public List<ProductVariant> getAvailableVariants(Product product) {
        if (product.getVariants() == null) {
            return List.of();
        }

        return product.getVariants().stream()
                .filter(this::isVariantAvailableForCustomers)
                .toList();
    }

    public int getTotalAvailableStock(Product product) {
        List<ProductVariant> variants = product.getVariants();

        if (variants == null || variants.isEmpty()) {
            return getProductTotalStock(product);
        } else {
            return getVariantsTotalStock(variants);
        }
    }

    private int getProductTotalStock(Product product) {
        List<Stock> productStocks = stockRepository.findByProduct(product);
        LocalDateTime now = LocalDateTime.now();

        return productStocks.stream()
                .mapToInt(stock -> {
                    // Use non-expired quantity calculation
                    Integer quantity = stockBatchRepository.getTotalNonExpiredQuantityByStock(stock, now);
                    return quantity != null ? quantity : 0;
                })
                .sum();
    }

    private int getVariantsTotalStock(List<ProductVariant> variants) {
        return variants.stream()
                .filter(ProductVariant::isActive)
                .mapToInt(this::getVariantTotalStock)
                .sum();
    }

    public int getVariantTotalStock(ProductVariant variant) {
        List<Stock> variantStocks = stockRepository.findByProductVariant(variant);
        LocalDateTime now = LocalDateTime.now();

        return variantStocks.stream()
                .mapToInt(stock -> {
                    // Use non-expired quantity calculation
                    Integer quantity = stockBatchRepository.getTotalNonExpiredQuantityByStock(stock, now);
                    return quantity != null ? quantity : 0;
                })
                .sum();
    }

    public boolean isProductLowStock(Product product) {
        List<ProductVariant> variants = product.getVariants();

        if (variants == null || variants.isEmpty()) {
            return isProductDirectlyLowStock(product);
        } else {
            return areVariantsLowStock(variants);
        }
    }

    private boolean isProductDirectlyLowStock(Product product) {
        List<Stock> productStocks = stockRepository.findByProduct(product);
        LocalDateTime now = LocalDateTime.now();

        for (Stock stock : productStocks) {
            // Use non-expired quantity for low stock check
            Integer totalQuantity = stockBatchRepository.getTotalNonExpiredQuantityByStock(stock, now);
            if (totalQuantity != null && totalQuantity > 0 && totalQuantity <= stock.getLowStockThreshold()) {
                return true;
            }
        }
        return false;
    }

    private boolean areVariantsLowStock(List<ProductVariant> variants) {
        for (ProductVariant variant : variants) {
            if (variant.isActive() && isVariantLowStock(variant)) {
                return true;
            }
        }
        return false;
    }

    public boolean isVariantLowStock(ProductVariant variant) {
        List<Stock> variantStocks = stockRepository.findByProductVariant(variant);
        LocalDateTime now = LocalDateTime.now();

        for (Stock stock : variantStocks) {
            // Use non-expired quantity for low stock check
            Integer totalQuantity = stockBatchRepository.getTotalNonExpiredQuantityByStock(stock, now);
            if (totalQuantity != null && totalQuantity > 0 && totalQuantity <= stock.getLowStockThreshold()) {
                return true;
            }
        }
        return false;
    }
}
