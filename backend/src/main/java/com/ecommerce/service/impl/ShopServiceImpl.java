package com.ecommerce.service.impl;

import com.ecommerce.Exception.CustomException;
import com.ecommerce.dto.ShopDTO;
import com.ecommerce.dto.StripeAccountDTO;
import com.ecommerce.entity.AdminInvitation;
import com.ecommerce.entity.Shop;
import com.ecommerce.entity.StripeAccount;
import com.ecommerce.entity.User;
import com.ecommerce.enums.ShopCapability;
import com.ecommerce.repository.AdminInvitationRepository;
import com.ecommerce.repository.ShopRepository;
import com.ecommerce.repository.ShopCategoryRepository;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.service.ShopService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import com.ecommerce.dto.ShopDetailsDTO;
import com.ecommerce.dto.UnitDTO;
import com.ecommerce.entity.Product;
import com.ecommerce.entity.ProductImage;
import org.springframework.data.domain.PageRequest;

@Service
@Slf4j
public class ShopServiceImpl implements ShopService {

    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final com.ecommerce.repository.ProductRepository productRepository;
    private final AdminInvitationRepository adminInvitationRepository;
    private final com.ecommerce.service.SubscriptionService subscriptionService;
    private final com.ecommerce.service.ShopCategoryService shopCategoryService;
    private final com.ecommerce.repository.ShopCategoryRepository shopCategoryRepository;
    private final com.ecommerce.service.CapabilityTransitionService capabilityTransitionService;
    private final com.ecommerce.service.ProductAvailabilityService productAvailabilityService;
    private final com.ecommerce.repository.WarehouseRepository warehouseRepository;
    private final com.ecommerce.service.ShopFollowerService shopFollowerService;

    @Autowired
    public ShopServiceImpl(ShopRepository shopRepository, UserRepository userRepository,
            com.ecommerce.repository.ProductRepository productRepository,
            com.ecommerce.service.ShopFollowerService shopFollowerService,
            AdminInvitationRepository adminInvitationRepository,
            com.ecommerce.service.SubscriptionService subscriptionService,
            com.ecommerce.service.ShopCategoryService shopCategoryService,
            com.ecommerce.repository.ShopCategoryRepository shopCategoryRepository,
            com.ecommerce.service.CapabilityTransitionService capabilityTransitionService,
            com.ecommerce.service.ProductAvailabilityService productAvailabilityService,
            com.ecommerce.repository.WarehouseRepository warehouseRepository) {
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.shopFollowerService = shopFollowerService;
        this.adminInvitationRepository = adminInvitationRepository;
        this.subscriptionService = subscriptionService;
        this.shopCategoryService = shopCategoryService;
        this.shopCategoryRepository = shopCategoryRepository;
        this.capabilityTransitionService = capabilityTransitionService;
        this.productAvailabilityService = productAvailabilityService;
        this.warehouseRepository = warehouseRepository;
    }

    @Override
    @Transactional
    public ShopDTO createShop(ShopDTO shopDTO, UUID ownerId) {
        // Check if shop registration is enabled
        if (!subscriptionService.isShopRegistrationEnabled()) {
            throw new CustomException(
                    "Shop registration is currently disabled. Please contact the administrator for more information.");
        }

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + ownerId));

        com.ecommerce.Enum.UserRole userRole = owner.getRole();

        if (userRole == com.ecommerce.Enum.UserRole.ADMIN) {
            throw new CustomException("Administrators cannot create shops. Only vendors can own shops.");
        }

        if (userRole == com.ecommerce.Enum.UserRole.DELIVERY_AGENT ||
                userRole == com.ecommerce.Enum.UserRole.EMPLOYEE) {
            throw new CustomException(
                    "You are currently associated with a shop as " + userRole.name() + ". " +
                            "Please contact the shop administrator to remove your association first. " +
                            "Once your role is changed back to CUSTOMER, you can create your own shop.");
        }

        List<Shop> existingShops = shopRepository.findByOwnerId(ownerId);
        if (!existingShops.isEmpty()) {
            throw new CustomException("You already have a shop. Each user can only own one shop.");
        }

        if (shopDTO.getSlug() != null && shopRepository.existsBySlug(shopDTO.getSlug())) {
            throw new CustomException("Shop with slug '" + shopDTO.getSlug() + "' already exists");
        }

        if (shopRepository.existsByOwnerIdAndName(ownerId, shopDTO.getName())) {
            throw new CustomException("You already have a shop with this name");
        }

        Shop shop = convertToEntity(shopDTO);
        shop.setOwner(owner);
        shop.setStatus(Shop.ShopStatus.PENDING);

        // Handle shop category - find or create
        if (shopDTO.getShopCategoryName() != null && !shopDTO.getShopCategoryName().trim().isEmpty()) {
            com.ecommerce.dto.ShopCategoryDTO categoryDTO = shopCategoryService
                    .findOrCreateCategory(shopDTO.getShopCategoryName());
            if (categoryDTO != null) {
                com.ecommerce.entity.ShopCategory category = shopCategoryRepository.findById(categoryDTO.getId())
                        .orElseThrow(() -> new EntityNotFoundException("Shop category not found"));
                shop.setShopCategory(category);
            }
        }

        // Handle primary capability
        if (shopDTO.getPrimaryCapability() != null) {
            shop.setPrimaryCapability(shopDTO.getPrimaryCapability());
            // Also add to capabilities set for backward compatibility
            shop.getCapabilities().add(shopDTO.getPrimaryCapability());
        }

        if (userRole == com.ecommerce.Enum.UserRole.CUSTOMER) {
            owner.setRole(com.ecommerce.Enum.UserRole.VENDOR);
            userRepository.save(owner);
        }

        Shop savedShop = shopRepository.save(shop);
        return convertToDTO(savedShop);
    }

    @Override
    @Transactional
    public ShopDTO updateShop(UUID shopId, ShopDTO shopDTO, UUID ownerId) {
        Shop existingShop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));

        if (!existingShop.getOwner().getId().equals(ownerId)) {
            throw new CustomException("You are not authorized to update this shop");
        }

        if (shopDTO.getSlug() != null && !shopDTO.getSlug().equals(existingShop.getSlug())) {
            if (shopRepository.existsBySlug(shopDTO.getSlug())) {
                throw new CustomException("Shop with slug '" + shopDTO.getSlug() + "' already exists");
            }
            existingShop.setSlug(shopDTO.getSlug());
        }

        if (shopDTO.getName() != null) {
            existingShop.setName(shopDTO.getName());
        }
        if (shopDTO.getDescription() != null) {
            existingShop.setDescription(shopDTO.getDescription());
        }
        if (shopDTO.getLogoUrl() != null) {
            existingShop.setLogoUrl(shopDTO.getLogoUrl());
        }
        if (shopDTO.getContactEmail() != null) {
            existingShop.setContactEmail(shopDTO.getContactEmail());
        }
        if (shopDTO.getContactPhone() != null) {
            existingShop.setContactPhone(shopDTO.getContactPhone());
        }
        if (shopDTO.getAddress() != null) {
            existingShop.setAddress(shopDTO.getAddress());
        }
        if (shopDTO.getIsActive() != null) {
            existingShop.setIsActive(shopDTO.getIsActive());
        }
        if (shopDTO.getStatus() != null) {
            existingShop.setStatus(shopDTO.getStatus());
        }

        // Handle shop category update - find or create
        if (shopDTO.getShopCategoryName() != null && !shopDTO.getShopCategoryName().trim().isEmpty()) {
            com.ecommerce.dto.ShopCategoryDTO categoryDTO = shopCategoryService
                    .findOrCreateCategory(shopDTO.getShopCategoryName());
            if (categoryDTO != null) {
                com.ecommerce.entity.ShopCategory category = shopCategoryRepository.findById(categoryDTO.getId())
                        .orElseThrow(() -> new EntityNotFoundException("Shop category not found"));
                existingShop.setShopCategory(category);
            }
        } else if (shopDTO.getShopCategoryId() != null) {
            // If category ID is provided, use it directly
            com.ecommerce.entity.ShopCategory category = shopCategoryRepository.findById(shopDTO.getShopCategoryId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Shop category not found with ID: " + shopDTO.getShopCategoryId()));
            existingShop.setShopCategory(category);
        } else if (shopDTO.getShopCategoryName() == null && shopDTO.getShopCategoryId() == null) {
            // If both are null, remove category
            existingShop.setShopCategory(null);
        }

        // Handle primary capability update
        if (shopDTO.getPrimaryCapability() != null) {
            ShopCapability newCapability = shopDTO.getPrimaryCapability();
            ShopCapability currentCapability = existingShop.getPrimaryCapability();

            // If shop doesn't have a capability set yet, set it directly
            if (currentCapability == null) {
                // Validate capability against active subscription plan if shop has one
                com.ecommerce.dto.ShopSubscriptionDTO activeSubscription = subscriptionService
                        .getActiveSubscription(shopId);
                if (activeSubscription != null && activeSubscription.getPlanId() != null) {
                    // Fetch the plan to get its capability
                    com.ecommerce.dto.SubscriptionPlanDTO plan = subscriptionService
                            .getPlanById(activeSubscription.getPlanId());
                    if (plan != null && plan.getCapability() != null) {
                        ShopCapability planCapability = plan.getCapability();
                        if (!planCapability.equals(newCapability)) {
                            throw new CustomException(
                                    "Cannot set shop capability to " + newCapability +
                                            " because your active subscription plan (" + plan.getName() +
                                            ") is for " + planCapability + " shops. " +
                                            "Please cancel your current subscription or subscribe to a plan matching the new capability.");
                        }
                    }
                }

                // Set capability directly for first-time setup
                existingShop.setPrimaryCapability(newCapability);
                existingShop.getCapabilities().clear();
                existingShop.getCapabilities().add(newCapability);
            }
            // Only validate and transition if capability is actually changing
            else if (!newCapability.equals(currentCapability)) {
                // Validate capability against active subscription plan if shop has one
                com.ecommerce.dto.ShopSubscriptionDTO activeSubscription = subscriptionService
                        .getActiveSubscription(shopId);
                if (activeSubscription != null && activeSubscription.getPlanId() != null) {
                    // Fetch the plan to get its capability
                    com.ecommerce.dto.SubscriptionPlanDTO plan = subscriptionService
                            .getPlanById(activeSubscription.getPlanId());
                    if (plan != null && plan.getCapability() != null) {
                        ShopCapability planCapability = plan.getCapability();
                        if (!planCapability.equals(newCapability)) {
                            throw new CustomException(
                                    "Cannot change shop capability to " + newCapability +
                                            " because your active subscription plan (" + plan.getName() +
                                            ") is for " + planCapability + " shops. " +
                                            "Please cancel your current subscription or subscribe to a plan matching the new capability.");
                        }
                    }
                }

                // Use capability transition service to handle the change
                com.ecommerce.dto.CapabilityTransitionDTO transition = capabilityTransitionService
                        .requestCapabilityTransition(shopId, newCapability);

                if (transition != null) {
                    // Transition created - shop now has both capabilities
                    // Refresh shop entity to get updated capabilities
                    existingShop = shopRepository.findById(shopId)
                            .orElseThrow(() -> new EntityNotFoundException("Shop not found"));
                } else {
                    // Immediate change - refresh shop entity
                    existingShop = shopRepository.findById(shopId)
                            .orElseThrow(() -> new EntityNotFoundException("Shop not found"));
                }
            }
        }

        Shop updatedShop = shopRepository.save(existingShop);
        return convertToDTO(updatedShop);
    }

    @Override
    @Transactional
    public void deleteShop(UUID shopId, UUID ownerId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));

        if (!shop.getOwner().getId().equals(ownerId)) {
            throw new CustomException("You are not authorized to delete this shop");
        }

        shopRepository.delete(shop);
    }

    @Override
    @Transactional(readOnly = true)
    public ShopDTO getShopById(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));

        // Note: Subscriptions are fetched lazily when needed
        // The hasValidSubscription() method will trigger the fetch
        // We don't force fetch here to avoid type mismatch issues

        return convertToDTO(shop);
    }

    @Override
    @Transactional(readOnly = true)
    public ShopDTO getShopBySlug(String slug) {
        Shop shop = shopRepository.findBySlug(slug)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with slug: " + slug));
        return convertToDTO(shop);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShopDTO> getShopsByOwner(UUID ownerId) {
        List<Shop> shops = shopRepository.findByOwnerId(ownerId);
        return shops.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ShopDTO> getAllShops(Pageable pageable) {
        Page<Shop> shops = shopRepository.findAll(pageable);
        List<ShopDTO> shopDTOs = shops.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return new PageImpl<>(shopDTOs, pageable, shops.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ShopDTO> searchShops(String search, String category, Pageable pageable) {
        return searchShops(search, category, false, null, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ShopDTO> searchShops(String search, String category, Boolean followedOnly, UUID userId,
            Pageable pageable) {
        log.info("========== SEARCH SHOPS DEBUG ==========");
        log.info("Search term: {}", search);
        log.info("Category: {}", category);
        log.info("Followed only: {}", followedOnly);
        log.info("User ID: {}", userId);
        log.info("Pageable: {}", pageable);
        log.info("Sort: {}", pageable.getSort());

        try {
            log.info("Calling shopRepository.searchShops...");
            Page<Shop> shops = shopRepository.searchShops(search, category, followedOnly, userId, pageable);
            log.info("Successfully retrieved {} shops", shops.getTotalElements());

            List<ShopDTO> shopDTOs = shops.getContent().stream()
                    .map(shop -> userId != null ? convertToDTO(shop, userId) : convertToDTO(shop))
                    .collect(Collectors.toList());

            log.info("Successfully converted to DTOs");
            log.info("========== END SEARCH SHOPS DEBUG ==========");
            return new PageImpl<>(shopDTOs, pageable, shops.getTotalElements());
        } catch (Exception e) {
            log.error("========== ERROR IN SEARCH SHOPS ==========");
            log.error("Error message: {}", e.getMessage());
            log.error("Error class: {}", e.getClass().getName());
            log.error("Stack trace:", e);
            log.error("========== END ERROR ==========");
            throw e;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShopDTO> getActiveShops() {
        List<Shop> shops = shopRepository.findActiveShops();
        return shops.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ShopDTO convertToDTO(Shop shop) {
        ShopDTO dto = new ShopDTO();
        dto.setShopId(shop.getShopId());
        dto.setName(shop.getName());
        dto.setDescription(shop.getDescription());
        dto.setSlug(shop.getSlug());
        dto.setLogoUrl(shop.getLogoUrl());
        dto.setStatus(shop.getStatus());
        dto.setContactEmail(shop.getContactEmail());
        dto.setContactPhone(shop.getContactPhone());
        dto.setAddress(shop.getAddress());
        dto.setIsActive(shop.getIsActive());

        // Handle category - use new entity relationship
        if (shop.getShopCategory() != null) {
            dto.setShopCategoryId(shop.getShopCategory().getId());
            dto.setShopCategoryName(shop.getShopCategory().getName());
            dto.setCategory(shop.getShopCategory().getName()); // Keep for backward compatibility
        }

        dto.setPrimaryCapability(shop.getPrimaryCapability());
        dto.setCapabilities(shop.getCapabilities());

        dto.setRating(shop.getRating());
        dto.setTotalReviews(shop.getTotalReviews());

        // Calculate actual product count from repository
        long actualProductCount = productRepository.countByShopId(shop.getShopId());
        dto.setProductCount(actualProductCount);

        // Calculate follower count
        long followerCount = shopFollowerService.getFollowerCount(shop.getShopId());
        dto.setFollowerCount(followerCount);

        dto.setCreatedAt(shop.getCreatedAt());
        dto.setUpdatedAt(shop.getUpdatedAt());

        if (shop.getOwner() != null) {
            dto.setOwnerId(shop.getOwner().getId());
            dto.setOwnerName(shop.getOwner().getFirstName() + " " + shop.getOwner().getLastName());
            dto.setOwnerEmail(shop.getOwner().getUserEmail());
        }

        if (shop.getStripeAccount() != null) {
            dto.setStripeAccount(convertToStripeAccountDTO(shop.getStripeAccount()));
        }

        // Check if shop is truly active (considering subscription system)
        dto.setIsTrulyActive(isShopTrulyActive(shop));

        return dto;
    }

    /**
     * Convert Shop to DTO with user-specific information (isFollowing)
     */
    public ShopDTO convertToDTO(Shop shop, UUID userId) {
        ShopDTO dto = convertToDTO(shop);
        if (userId != null) {
            dto.setIsFollowing(shopFollowerService.isFollowing(shop.getShopId(), userId));
        }
        return dto;
    }

    /**
     * Checks if a shop is truly active, considering:
     * 1. Basic shop active status
     * 2. Stripe account connection
     * 3. Subscription system status and active subscription/freemium
     */
    private boolean isShopTrulyActive(Shop shop) {
        // 1. Check if shop is marked active manually
        if (shop.getIsActive() != null && !shop.getIsActive()) {
            return false;
        }

        // 2. Check Stripe Account - required for shop to be active
        if (shop.getStripeAccount() == null ||
                shop.getStripeAccount().getAccountStatus() != StripeAccount.AccountStatus.ACTIVE) {
            return false;
        }

        // 3. Check if subscription system is enabled
        boolean subscriptionSystemEnabled = subscriptionService.isSubscriptionEnabled();

        if (subscriptionSystemEnabled) {
            // If subscription system is ON, shop must have valid subscription or freemium
            return shop.hasValidSubscription();
        }

        // If subscription system is OFF, only Stripe account is required
        return true;
    }

    private StripeAccountDTO convertToStripeAccountDTO(StripeAccount stripeAccount) {
        StripeAccountDTO dto = new StripeAccountDTO();
        dto.setId(stripeAccount.getId());
        dto.setShopId(stripeAccount.getShop().getShopId());
        dto.setShopName(stripeAccount.getShop().getName());
        dto.setStripeAccountId(stripeAccount.getStripeAccountId());
        dto.setAccountStatus(stripeAccount.getAccountStatus());
        dto.setAccountType(stripeAccount.getAccountType());
        dto.setIsVerified(stripeAccount.getIsVerified());
        dto.setChargesEnabled(stripeAccount.getChargesEnabled());
        dto.setPayoutsEnabled(stripeAccount.getPayoutsEnabled());
        dto.setCountry(stripeAccount.getCountry());
        dto.setCurrency(stripeAccount.getCurrency());
        dto.setBusinessType(stripeAccount.getBusinessType());
        dto.setBusinessName(stripeAccount.getBusinessName());
        dto.setBusinessUrl(stripeAccount.getBusinessUrl());
        dto.setBusinessPhone(stripeAccount.getBusinessPhone());
        dto.setSupportEmail(stripeAccount.getSupportEmail());
        dto.setBankAccountId(stripeAccount.getBankAccountId());
        dto.setBankName(stripeAccount.getBankName());
        dto.setBankLast4(stripeAccount.getBankLast4());
        dto.setRoutingNumber(stripeAccount.getRoutingNumber());
        dto.setRequirements(stripeAccount.getRequirements());
        dto.setCapabilities(stripeAccount.getCapabilities());
        dto.setVerificationStatus(stripeAccount.getVerificationStatus());
        dto.setMetadata(stripeAccount.getMetadata());
        dto.setCreatedAt(stripeAccount.getCreatedAt());
        dto.setUpdatedAt(stripeAccount.getUpdatedAt());
        dto.setCreatedBy(stripeAccount.getCreatedBy());
        dto.setUpdatedBy(stripeAccount.getUpdatedBy());
        return dto;
    }

    @Override
    public Shop convertToEntity(ShopDTO shopDTO) {
        Shop shop = new Shop();
        shop.setName(shopDTO.getName());
        shop.setDescription(shopDTO.getDescription());
        shop.setSlug(shopDTO.getSlug());
        shop.setLogoUrl(shopDTO.getLogoUrl());
        shop.setContactEmail(shopDTO.getContactEmail());
        shop.setContactPhone(shopDTO.getContactPhone());
        shop.setAddress(shopDTO.getAddress());
        shop.setIsActive(shopDTO.getIsActive());

        // Note: Category is handled separately in createShop/updateShop methods
        // via shopCategory relationship, not here in convertToEntity

        if (shopDTO.getStatus() != null) {
            shop.setStatus(shopDTO.getStatus());
        }
        return shop;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isOwner(UUID shopId, UUID userId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));
        return shop.getOwner().getId().equals(userId);
    }

    @Override
    @Transactional
    public List<ShopDTO> getUserShops(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + userId));

        List<ShopDTO> shops = new java.util.ArrayList<>();

        if (user.getRole() == com.ecommerce.Enum.UserRole.VENDOR) {
            shops = getShopsByOwner(userId);
        } else if (user.getRole() == com.ecommerce.Enum.UserRole.EMPLOYEE ||
                user.getRole() == com.ecommerce.Enum.UserRole.DELIVERY_AGENT) {
            // Get shop from user's shop relationship (set when accepting invitation)
            if (user.getShop() != null) {
                Shop shop = user.getShop();
                shops = List.of(convertToDTO(shop));
                log.info("Found shop {} for {} user {} via direct relationship", shop.getShopId(), user.getRole(),
                        userId);
            } else {
                // Fallback: try to find shop from accepted invitation
                log.warn("User {} has no shop relationship, checking accepted invitations", userId);
                List<AdminInvitation> acceptedInvitations = adminInvitationRepository
                        .findAcceptedInvitationsByUser(userId);

                if (!acceptedInvitations.isEmpty()) {
                    // Get the most recent accepted invitation and use its shop
                    AdminInvitation latestInvitation = acceptedInvitations.get(0);
                    if (latestInvitation.getShop() != null) {
                        Shop shop = latestInvitation.getShop();
                        shops = List.of(convertToDTO(shop));
                        log.info("Found shop {} for {} user {} via accepted invitation, updating user relationship",
                                shop.getShopId(), user.getRole(), userId);

                        // Update user's shop relationship for future queries
                        user.setShop(shop);
                        userRepository.save(user);
                        log.info("Updated user {} shop relationship to shop {}", userId, shop.getShopId());
                    } else {
                        log.warn("Accepted invitation {} has no shop associated", latestInvitation.getInvitationId());
                        shops = new java.util.ArrayList<>();
                    }
                } else {
                    log.warn("No accepted invitations found for user {}", userId);
                    shops = new java.util.ArrayList<>();
                }
            }
        }

        return shops;
    }

    @Override
    @Transactional(readOnly = true)
    public ShopDetailsDTO getShopDetails(UUID shopId) {
        return getShopDetails(shopId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public ShopDetailsDTO getShopDetails(UUID shopId, UUID userId) {
        log.info("Fetching details for shop ID: {} for user: {}", shopId, userId);
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with ID: " + shopId));

        User owner = shop.getOwner();

        // Fetch top products for the shop
        Page<Product> productsPage = productRepository.findByShopIdForCustomers(shopId, PageRequest.of(0, 8));

        // Filter products by availability (includes shop subscription check)
        List<ShopDetailsDTO.FeaturedProduct> featuredProducts = productsPage.getContent().stream()
                .filter(product -> {
                    try {
                        return productAvailabilityService.isProductAvailableForCustomers(product);
                    } catch (Exception e) {
                        log.warn("Error checking availability for featured product {}: {}", product.getProductId(),
                                e.getMessage());
                        return false;
                    }
                })
                .map(product -> {
                    // Get primary image, fallback to first image if no primary
                    String primaryImageUrl = null;
                    if (product.getImages() != null && !product.getImages().isEmpty()) {
                        primaryImageUrl = product.getImages().stream()
                                .filter(ProductImage::isPrimary)
                                .findFirst()
                                .map(ProductImage::getImageUrl)
                                .orElse(product.getImages().get(0).getImageUrl()); // Fallback to first image
                    }

                    // Safely get price values with null checks
                    Double price = product.getDiscountedPrice() != null
                            ? product.getDiscountedPrice().doubleValue()
                            : (product.getPrice() != null ? product.getPrice().doubleValue() : 0.0);

                    Double compareAtPrice = null;
                    if (product.hasActiveDiscount()) {
                        compareAtPrice = product.getPrice() != null ? product.getPrice().doubleValue() : null;
                    } else if (product.getCompareAtPrice() != null) {
                        compareAtPrice = product.getCompareAtPrice().doubleValue();
                    }

                    return ShopDetailsDTO.FeaturedProduct.builder()
                            .productId(product.getProductId())
                            .name(product.getProductName())
                            .slug(product.getSlug())
                            .price(price)
                            .compareAtPrice(compareAtPrice)
                            .primaryImage(primaryImageUrl)
                            .rating(product.getAverageRating())
                            .reviewCount(product.getReviewCount())
                            .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                            .isInStock(product.isInStock())
                            .brandName(product.getBrand() != null ? product.getBrand().getBrandName() : null)
                            .shortDescription(product.getShortDescription())
                            .isNew(product.isNewArrival())
                            .isBestseller(product.isBestseller())
                            .isFeatured(product.isFeatured())
                            .hasActiveDiscount(product.hasActiveDiscount())
                            .discountPercentage(
                                    product.hasActiveDiscount()
                                            ? (product.getDiscount() != null
                                                    ? product.getDiscount().getPercentage().intValue()
                                                    : (product.getSalePercentage() != null ? product.getSalePercentage()
                                                            : 0))
                                            : 0)
                            .organic(product.getOrganic())
                            .unit(product.getUnit() != null ? UnitDTO.from(product.getUnit()) : null)
                            .build();
                })
                .collect(Collectors.toList());

        ShopDetailsDTO.OwnerInfo ownerInfo = ShopDetailsDTO.OwnerInfo.builder()
                .id(owner.getId())
                .firstName(owner.getFirstName())
                .lastName(owner.getLastName())
                .email(owner.getUserEmail())
                .avatar(null) // User entity doesn't seem to have an avatar field in the viewed code
                .build();

        // Calculate follower count
        long followerCount = shopFollowerService.getFollowerCount(shopId);

        // Check if user is following (if userId is provided)
        Boolean isFollowing = null;
        if (userId != null) {
            isFollowing = shopFollowerService.isFollowing(shopId, userId);
        }

        return ShopDetailsDTO.builder()
                .shopId(shop.getShopId())
                .name(shop.getName())
                .slug(shop.getSlug())
                .description(shop.getDescription())
                .logoUrl(shop.getLogoUrl())
                .category(shop.getShopCategory() != null ? shop.getShopCategory().getName() : null)
                .address(shop.getAddress())
                .contactEmail(shop.getContactEmail())
                .contactPhone(shop.getContactPhone())
                .isActive(shop.getIsActive())
                .isTrulyActive(isShopTrulyActive(shop))
                .status(shop.getStatus().name())
                .rating(shop.getRating())
                .totalReviews(shop.getTotalReviews())
                .productCount((int) productRepository.countByShopId(shopId))
                .followerCount(followerCount)
                .isFollowing(isFollowing)
                .primaryCapability(shop.getPrimaryCapability())
                .capabilities(shop.getCapabilities())
                .createdAt(shop.getCreatedAt())
                .updatedAt(shop.getUpdatedAt())
                .owner(ownerInfo)
                .featuredProducts(featuredProducts)
                .build();
    }

    @Override
    @Transactional
    public ShopDTO activateShop(UUID shopId, UUID ownerId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new EntityNotFoundException("Shop not found with id: " + shopId));

        if (!shop.getOwner().getId().equals(ownerId)) {
            throw new CustomException("You are not authorized to activate this shop");
        }

        if (shop.getStatus() != Shop.ShopStatus.PENDING) {
            throw new CustomException("Shop is not in pending status and cannot be activated");
        }

        shop.setStatus(Shop.ShopStatus.ACTIVE);
        Shop savedShop = shopRepository.save(shop);

        log.info("Shop {} activated by owner {}", shopId, ownerId);
        return convertToDTO(savedShop);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<com.ecommerce.dto.ShopDeliveryInfoDTO> getShopsDeliveringToCountry(String country, Pageable pageable) {
        // Find shops with warehouses in the country
        List<com.ecommerce.entity.Warehouse> warehouses = warehouseRepository
                .findByCountryIgnoreCaseAndIsActiveTrue(country);

        // Get unique shop IDs from warehouses
        List<UUID> shopIds = warehouses.stream()
                .map(w -> w.getShop().getShopId())
                .distinct()
                .collect(Collectors.toList());

        if (shopIds.isEmpty()) {
            return Page.empty(pageable);
        }

        // Find shops that:
        // 1. Are active
        // 2. Have FULL_ECOMMERCE or HYBRID capability
        // 3. Have active subscription or freemium
        // 4. Have connected Stripe account
        List<Shop> eligibleShops = shopIds.stream()
                .map(shopId -> shopRepository.findById(shopId).orElse(null))
                .filter(shop -> shop != null && shop.getIsActive())
                .filter(shop -> {
                    com.ecommerce.enums.ShopCapability capability = shop.getPrimaryCapability();
                    return capability == com.ecommerce.enums.ShopCapability.FULL_ECOMMERCE
                            || capability == com.ecommerce.enums.ShopCapability.HYBRID;
                })
                .filter(shop -> {
                    // Check if shop has active subscription or freemium
                    try {
                        com.ecommerce.dto.ShopSubscriptionDTO subscription = subscriptionService
                                .getActiveSubscription(shop.getShopId());
                        if (subscription != null) {
                            return true; // Has active subscription
                        }
                        // Check if shop has consumed freemium (if not, they can still use freemium)
                        // For now, we'll allow shops without subscription if they have Stripe account
                        return true;
                    } catch (Exception e) {
                        log.debug("Error checking subscription for shop {}: {}", shop.getShopId(), e.getMessage());
                        return false;
                    }
                })
                .filter(shop -> {
                    // Check if shop has connected Stripe account
                    com.ecommerce.entity.StripeAccount stripeAccount = shop.getStripeAccount();
                    return stripeAccount != null
                            && stripeAccount.getStripeAccountId() != null
                            && !stripeAccount.getStripeAccountId().trim().isEmpty();
                })
                .collect(Collectors.toList());

        // Convert to DTOs
        List<com.ecommerce.dto.ShopDeliveryInfoDTO> shopDTOs = eligibleShops.stream()
                .map(shop -> com.ecommerce.dto.ShopDeliveryInfoDTO.builder()
                        .shopId(shop.getShopId())
                        .shopName(shop.getName())
                        .shopSlug(shop.getSlug())
                        .logoUrl(shop.getLogoUrl())
                        .description(shop.getDescription())
                        .capability(shop.getPrimaryCapability() != null ? shop.getPrimaryCapability().name() : null)
                        .build())
                .collect(Collectors.toList());

        // Apply pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), shopDTOs.size());
        List<com.ecommerce.dto.ShopDeliveryInfoDTO> paginatedShops = shopDTOs.subList(start, end);

        return new PageImpl<>(paginatedShops, pageable, shopDTOs.size());
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.ecommerce.dto.CountryDeliveryInfoDTO> getCountriesWithDelivery() {
        // Get all countries with active warehouses
        List<String> countries = warehouseRepository.findDistinctCountries();

        return countries.stream()
                .map(country -> {
                    // Get shops delivering to this country (without pagination for count)
                    Page<com.ecommerce.dto.ShopDeliveryInfoDTO> shopsPage = getShopsDeliveringToCountry(
                            country,
                            PageRequest.of(0, Integer.MAX_VALUE));

                    int shopCount = (int) shopsPage.getTotalElements();

                    if (shopCount == 0) {
                        return null; // Skip countries with no eligible shops
                    }

                    return com.ecommerce.dto.CountryDeliveryInfoDTO.builder()
                            .country(country)
                            .shopCount(shopCount)
                            .shops(shopsPage.getContent())
                            .build();
                })
                .filter(dto -> dto != null && dto.getShopCount() > 0)
                .collect(Collectors.toList());
    }
}
